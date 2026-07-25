use std::path::PathBuf;
use std::sync::{Arc, Condvar, Mutex, MutexGuard, PoisonError};
use std::time::Duration;

use tauri::{Emitter, Manager};

use super::persistence::{normalize_player_name, SaveEnvelopeV1, SaveStore, SAVE_SCHEMA_VERSION};
use super::state::{now_ms, Revisioned, ServerPush, ServerState, SERVER_PUSH_EVENT};

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
        now_ms: u64,
    ) -> Result<Self, String> {
        let save_store = Arc::new(SaveStore::open(save_path)?);
        let loaded = match restore_backup {
            Some(index) => Some(save_store.restore_backup(index)?),
            None => match save_store.load() {
                Ok(envelope) => envelope,
                Err(error) => {
                    eprintln!("local-system recovery exhausted: {error}; creating a fresh system");
                    None
                }
            },
        };
        let is_fresh_system = loaded.is_none();
        let mut state = match loaded {
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
        };
        if normalize_player_name(&state.player.name) != normalize_player_name(&player_name) {
            state.create_player_profile(player_name, now_ms)?;
            if is_fresh_system {
                state.parked_players.remove("player 1");
                state.motherships.remove("player-1");
            }
        }
        let server = Self {
            state: Mutex::new(state),
            save_store,
            save_progress: Arc::new(Mutex::new(SaveProgress::default())),
            wake: Condvar::new(),
        };
        server.persist()?;
        Ok(server)
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
/// in-process prototype of SERVER.md's broadcast loop (ROADMAP P3.1 moves it
/// behind a WebSocket). A poisoned lock (a panicked command) is recovered,
/// not propagated: state is plain data and pushes must keep flowing.
pub fn run_scheduler(app: tauri::AppHandle) {
    let server = app.state::<GameServer>();
    let mut state = server.state.lock().unwrap_or_else(PoisonError::into_inner);
    loop {
        state.settle_parked_players(now_ms());
        state.settle(now_ms());
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
}
