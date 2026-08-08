use std::path::PathBuf;
use std::sync::{Arc, Condvar, Mutex, MutexGuard, PoisonError};
use std::time::Duration;

use tauri::{Emitter, Manager};

use super::modules::COMMAND_MODULE_TYPE;
use super::persistence::{normalize_player_name, SaveEnvelopeV1, SaveStore, SAVE_SCHEMA_VERSION};
use super::state::{now_ms, Revisioned, ServerPush, ServerState, SERVER_PUSH_EVENT};

/// A destructive local-development reset requested before a gameplay session
/// starts. Neither variant is part of the player-action protocol.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum StartupReset {
    System,
    Player,
}

/// One profile visible to the startup-only `--list-players` control.
pub(crate) struct LocalPlayerSummary {
    pub(crate) name: String,
    pub(crate) command_level: u32,
    pub(crate) pending_command_level: Option<u32>,
}

/// The managed Tauri state: the authoritative ServerState behind a mutex,
/// plus the condvar that wakes the scheduler thread early when a command
/// creates a nearer deadline (a build started, a vessel dispatched or
/// recalled) — without it, a short vessel flight's arrival push would wait
/// out the scheduler's current sleep.
pub struct GameServer {
    pub(super) state: Mutex<ServerState>,
    save_store: Arc<SaveStore>,
    save_progress: Arc<Mutex<SaveProgress>>,
    wake: Condvar,
    /// The session's selected developer identity, kept so a development
    /// reset can rebuild the same profile rather than silently reverting to
    /// the `Player 1` fallback.
    player_name: String,
}

/// Coordinates save requests independently of the gameplay lock. State
/// revisions make an older snapshot harmless if it reaches disk after a newer
/// command or scheduler boundary.
#[derive(Default)]
struct SaveProgress {
    saved_revision: Option<u64>,
}

impl GameServer {
    pub fn open(
        save_path: PathBuf,
        player_name: String,
        restore_backup: Option<usize>,
        startup_reset: Option<StartupReset>,
        now_ms: u64,
    ) -> Result<Self, String> {
        let save_store = Arc::new(SaveStore::open(save_path)?);
        let loaded = if startup_reset == Some(StartupReset::System) {
            None
        } else {
            match restore_backup {
                Some(index) => Some(save_store.restore_backup(index)?),
                None => match save_store.load() {
                    Ok(envelope) => envelope,
                    Err(error) => {
                        eprintln!(
                            "local-system recovery exhausted: {error}; creating a fresh system"
                        );
                        None
                    }
                },
            }
        };
        let saved_at = loaded.as_ref().map(|envelope| envelope.saved_at);
        let is_fresh_system = loaded.is_none();
        let session_player = player_name.clone();
        let mut state = if startup_reset == Some(StartupReset::System) {
            Self::fresh_system(&player_name, now_ms)?
        } else {
            match loaded {
                Some(envelope) => {
                    let requested = normalize_player_name(&player_name);
                    if envelope.system.players.contains_key(&requested) {
                        ServerState::from_persistent(envelope.system, &player_name)?
                    } else {
                        let fallback = envelope
                            .system
                            .players
                            .values()
                            .next()
                            .ok_or_else(|| "persistent system has no player profiles".to_string())?
                            .identity
                            .name
                            .clone();
                        let mut state = ServerState::from_persistent(envelope.system, &fallback)?;
                        state.create_player_profile(player_name.clone(), now_ms)?;
                        state
                    }
                }
                None => ServerState::new(now_ms),
            }
        };
        if startup_reset != Some(StartupReset::System)
            && normalize_player_name(&state.player.name) != normalize_player_name(&player_name)
        {
            state.create_player_profile(player_name.clone(), now_ms)?;
            if is_fresh_system {
                state.parked_players.remove("player 1");
                state.motherships.remove("player-1");
            }
        }
        if let Some(saved_at) = saved_at {
            state.recover_to(saved_at, now_ms);
            // Recovery is reflected by the initial snapshot. Never emit its
            // historical pushes into a newly-created webview (which would
            // replay a backlog of toasts).
            state.outbox.clear();
            state.resources_dirty = false;
        }
        match startup_reset {
            Some(StartupReset::System) => {
                println!(
                    "--reset-system — replaced the local system with its fresh deterministic seed"
                );
            }
            Some(StartupReset::Player) => {
                state.reset_active_player_profile(now_ms)?;
                println!(
                    "--reset-player {:?} — recreated that profile in the existing local system",
                    player_name
                );
            }
            None => {}
        }
        let server = Self {
            state: Mutex::new(state),
            save_store,
            save_progress: Arc::new(Mutex::new(SaveProgress::default())),
            wake: Condvar::new(),
            player_name: session_player,
        };
        server.persist()?;
        Ok(server)
    }

    pub(crate) fn list_players(save_path: PathBuf) -> Result<Vec<LocalPlayerSummary>, String> {
        let store = SaveStore::open(save_path)?;
        let Some(envelope) = store.load()? else {
            return Ok(Vec::new());
        };
        Ok(envelope
            .system
            .players
            .values()
            .map(|player| {
                let command = player
                    .modules
                    .values()
                    .find(|module| module.module_type == COMMAND_MODULE_TYPE);
                LocalPlayerSummary {
                    name: player.identity.name.clone(),
                    command_level: command.map_or(0, |module| module.level),
                    pending_command_level: command
                        .and_then(|module| module.pending.as_ref().map(|pending| pending.level)),
                }
            })
            .collect())
    }

    fn fresh_system(player_name: &str, now_ms: u64) -> Result<ServerState, String> {
        let mut fresh = ServerState::new(now_ms);
        if normalize_player_name(&fresh.player.name) != normalize_player_name(player_name) {
            fresh.create_player_profile(player_name.to_string(), now_ms)?;
            fresh.parked_players.remove("player 1");
            fresh.motherships.remove("player-1");
        }
        Ok(fresh)
    }

    /// Replace the whole local system with a fresh deterministic seed,
    /// keeping the session's selected identity. Development-only: this
    /// destroys every profile and all world progress, and exists so a
    /// playtest wrecked by in-progress balance work can be started over
    /// without hunting down the save file. P2.10's `--reset-system` is the
    /// startup-argument form of the same operation and should call this.
    pub(crate) fn reset_system(&self, now_ms: u64) -> Result<(), String> {
        {
            let mut state = self.state.lock().map_err(|error| error.to_string())?;
            *state = Self::fresh_system(&self.player_name, now_ms)?;
        }
        // The fresh system restarts at revision 0, which the save-progress
        // guard would read as stale and skip — clear it so the reset
        // actually reaches disk.
        self.save_progress
            .lock()
            .map_err(|error| error.to_string())?
            .saved_revision = None;
        self.persist()
    }

    fn persist(&self) -> Result<(), String> {
        let envelope = self.capture_save()?;
        Self::save_snapshot(&self.save_store, &self.save_progress, envelope)
    }

    fn capture_save(&self) -> Result<SaveEnvelopeV1, String> {
        let state = self.state.lock().map_err(|error| error.to_string())?;
        let envelope = SaveEnvelopeV1 {
            schema_version: SAVE_SCHEMA_VERSION,
            saved_at: now_ms(),
            system: state.persistent_system(),
        };
        Ok(envelope)
    }

    fn save_snapshot(
        save_store: &SaveStore,
        save_progress: &Mutex<SaveProgress>,
        envelope: SaveEnvelopeV1,
    ) -> Result<(), String> {
        let mut progress = save_progress.lock().map_err(|error| error.to_string())?;
        let revision = envelope.system.state_revision;
        if progress
            .saved_revision
            .is_some_and(|saved_revision| saved_revision >= revision)
        {
            return Ok(());
        }
        save_store.save(&envelope)?;
        progress.saved_revision = Some(revision);
        Ok(())
    }

    /// Exit must never wait on gameplay or an in-flight autosave. Normal
    /// command/scheduler boundaries already save synchronously; this detached
    /// final attempt only covers state that happened to be cleanly available
    /// during shutdown.
    pub(crate) fn persist_on_exit(&self) {
        let Ok(state) = self.state.try_lock() else {
            eprintln!("skipping final autosave: gameplay state is busy");
            return;
        };
        let envelope = SaveEnvelopeV1 {
            schema_version: SAVE_SCHEMA_VERSION,
            saved_at: now_ms(),
            system: state.persistent_system(),
        };
        drop(state);
        let save_store = Arc::clone(&self.save_store);
        let save_progress = Arc::clone(&self.save_progress);
        std::thread::spawn(move || {
            if let Err(error) = Self::save_snapshot(&save_store, &save_progress, envelope) {
                eprintln!("final autosave failed: {error}");
            }
        });
    }
}

/// Emit every drained push on the SERVER_PUSH_EVENT channel. Failures are
/// logged and dropped — a push is advisory (the client could recover from a
/// fresh snapshot), never something to crash over.
fn emit_pushes(app: &tauri::AppHandle, pushes: Vec<Revisioned<ServerPush>>) {
    for push in pushes {
        if let Err(err) = app.emit(SERVER_PUSH_EVENT, &push) {
            eprintln!("failed to emit {SERVER_PUSH_EVENT}: {err}");
        }
    }
}

/// The push scheduler (spawned from lib.rs at app setup): sleeps until the
/// next deadline — production tick, build completion, vessel arrival —
/// settles whatever came due, and emits the queued pushes. This thread is
/// what turns the lazily-settling ServerState into a server that *tells*
/// clients when something happens instead of waiting to be asked — the
/// in-process prototype of SERVER.md's broadcast loop (ROADMAP P4.1 moves it
/// behind a WebSocket). A poisoned lock (a panicked command) is recovered,
/// not propagated: state is plain data and pushes must keep flowing.
pub fn run_scheduler(app: tauri::AppHandle) {
    let server = app.state::<GameServer>();
    let mut state = server.state.lock().unwrap_or_else(PoisonError::into_inner);
    loop {
        state.advance_to(now_ms());
        let pushes = state.drain_pushes();
        if !pushes.is_empty() {
            let revision = state.advance_revision();
            let pushes = pushes
                .into_iter()
                .map(|push| Revisioned::new(revision, push))
                .collect();
            // Emit without holding the lock, then re-settle: time passed and
            // commands may have run while it was released.
            drop(state);
            if let Err(error) = server.persist() {
                eprintln!("autosave after scheduler settlement failed: {error}");
            }
            emit_pushes(&app, pushes);
            state = server.state.lock().unwrap_or_else(PoisonError::into_inner);
            continue;
        }
        // settle() left every deadline in the future, so this is a real
        // sleep (clamped defensively); spurious and early wakes just loop
        // through a no-op settle and sleep again.
        let wait = state.next_deadline().saturating_sub(now_ms()).max(10);
        let (guard, _) = server
            .wake
            .wait_timeout(state, Duration::from_millis(wait))
            .unwrap_or_else(PoisonError::into_inner);
        state = guard;
    }
}

/// Command epilogue: emit the pushes queued while this command held the
/// lock, and wake the scheduler so it re-derives its next deadline (the
/// command may have created a nearer one). Takes the guard to enforce that
/// emission happens after the lock is released.
pub(super) fn finish_command(
    app: &tauri::AppHandle,
    server: &GameServer,
    mut state: MutexGuard<'_, ServerState>,
) -> u64 {
    let revision = state.advance_revision();
    let pushes = state.drain_revisioned_pushes(revision);
    drop(state);
    if let Err(error) = server.persist() {
        eprintln!("autosave after command failed: {error}");
    }
    emit_pushes(app, pushes);
    server.wake.notify_all();
    revision
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_path() -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock after epoch")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "voidbound-scheduler-save-test-{}-{nonce}",
            std::process::id()
        ))
    }

    fn envelope(saved_at: u64, revision: u64) -> SaveEnvelopeV1 {
        let state = ServerState::new(0);
        let mut system = state.persistent_system();
        system.state_revision = revision;
        SaveEnvelopeV1 {
            schema_version: SAVE_SCHEMA_VERSION,
            saved_at,
            system,
        }
    }

    #[test]
    fn stale_autosave_snapshot_cannot_replace_a_newer_revision() {
        let directory = test_path();
        let path = directory.join("local-system.json");
        let store = SaveStore::open(path).expect("open test store");
        let progress = Mutex::new(SaveProgress::default());

        GameServer::save_snapshot(&store, &progress, envelope(2, 2)).expect("save revision two");
        GameServer::save_snapshot(&store, &progress, envelope(1, 1))
            .expect("ignore stale revision one");
        let saved = store.load().expect("load primary").expect("a save");
        assert_eq!(saved.saved_at, 2);
        assert_eq!(saved.system.state_revision, 2);

        drop(store);
        fs::remove_dir_all(directory).expect("remove test directory");
    }

    #[test]
    fn startup_system_reset_bypasses_an_unreadable_save() {
        let directory = test_path();
        fs::create_dir_all(&directory).expect("create test directory");
        let path = directory.join("local-system.json");
        fs::write(&path, "not a save").expect("write unreadable save");

        let server = GameServer::open(
            path,
            "Reset Pilot".to_string(),
            None,
            Some(StartupReset::System),
            10,
        )
        .expect("reset system without loading the damaged save");
        let state = server.state.lock().expect("lock fresh system");
        assert_eq!(state.player.name, "Reset Pilot");
        assert_eq!(state.parked_players.len(), 0);
        assert_eq!(state.motherships.len(), 1);

        drop(state);
        drop(server);
        fs::remove_dir_all(directory).expect("remove test directory");
    }

    #[test]
    fn startup_player_reset_rebuilds_the_selected_profile_only() {
        let directory = test_path();
        let path = directory.join("local-system.json");
        let server = GameServer::open(path.clone(), "Ada".to_string(), None, None, 0)
            .expect("create local system");
        let asteroid_count;
        {
            let mut state = server.state.lock().expect("lock state");
            state.resources.construction = 99;
            asteroid_count = state.asteroids.len();
            state
                .create_player_profile("Bea".to_string(), 0)
                .expect("create second profile");
            state.advance_revision();
        }
        server.persist().expect("persist two profiles");
        drop(server);

        let reset = GameServer::open(
            path,
            "Ada".to_string(),
            None,
            Some(StartupReset::Player),
            10,
        )
        .expect("reset the selected profile");
        let state = reset.state.lock().expect("lock reset state");
        assert_eq!(state.player.name, "Ada");
        assert_eq!(
            state.resources.construction,
            ServerState::new(10).resources.construction
        );
        assert!(state.parked_players.contains_key("bea"));
        assert_eq!(state.motherships.len(), 2);
        assert_eq!(state.asteroids.len(), asteroid_count);
        assert!(state.persistent_system().validate().is_ok());

        drop(state);
        drop(reset);
        fs::remove_dir_all(directory).expect("remove test directory");
    }

    #[test]
    fn list_players_reports_command_module_levels_without_starting_a_session() {
        let directory = test_path();
        let path = directory.join("local-system.json");
        let server = GameServer::open(path.clone(), "Ada".to_string(), None, None, 0)
            .expect("create local system");
        {
            let mut state = server.state.lock().expect("lock state");
            let command = state
                .modules
                .get_mut("module-command")
                .expect("starter command module");
            command.level = 2;
            command.pending = None;
            state.advance_revision();
        }
        server.persist().expect("persist command level");
        drop(server);

        let players = GameServer::list_players(path).expect("list saved profiles");
        assert_eq!(players.len(), 1);
        assert_eq!(players[0].name, "Ada");
        assert_eq!(players[0].command_level, 2);
        assert_eq!(players[0].pending_command_level, None);

        fs::remove_dir_all(directory).expect("remove test directory");
    }
}
