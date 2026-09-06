//! Local pre-game identity selection. No gameplay server or scheduler exists
//! until selection, and no private profile state crosses this boundary.
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::Manager;

use super::modules::COMMAND_MODULE_TYPE;
use super::persistence::{normalize_player_name, SaveEnvelopeV1, SaveStore};
use super::scheduler::{run_scheduler, GameServer};
use super::state::{now_ms, PlayerIdentity, Revisioned};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LocalProfileSummary {
    name: String,
    /// Saved level; pending work is settled when the session begins.
    command_level: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LocalProfilesData {
    profiles: Vec<LocalProfileSummary>,
    selected: Option<Revisioned<PlayerIdentity>>,
}

pub(crate) struct LocalProfiles(Mutex<ProfileStartup>);

struct ProfileStartup {
    store: Option<Arc<SaveStore>>,
    loaded: Option<SaveEnvelopeV1>,
    selected: Option<Revisioned<PlayerIdentity>>,
}

impl LocalProfiles {
    pub(crate) fn open(path: PathBuf) -> Result<Self, String> {
        let store = Arc::new(SaveStore::open(path)?);
        let loaded = match store.load() {
            Ok(envelope) => envelope,
            Err(error) => {
                // Preserve the existing startup recovery policy. No replacement
                // system is written until the player explicitly creates one.
                eprintln!("local-system recovery exhausted: {error}; awaiting new profile");
                None
            }
        };
        Ok(Self(Mutex::new(ProfileStartup {
            store: Some(store),
            loaded,
            selected: None,
        })))
    }

    pub(crate) fn selected(server: &GameServer) -> Result<Self, String> {
        Ok(Self(Mutex::new(ProfileStartup {
            store: None,
            loaded: None,
            selected: Some(server.selected_profile()?),
        })))
    }
}

impl ProfileStartup {
    fn data(&self) -> LocalProfilesData {
        let profiles = self.loaded.as_ref().map_or_else(Vec::new, |envelope| {
            envelope
                .system
                .players
                .values()
                .map(|profile| LocalProfileSummary {
                    name: profile.identity.name.clone(),
                    command_level: profile
                        .modules
                        .values()
                        .find(|module| module.module_type == COMMAND_MODULE_TYPE)
                        .map_or(0, |module| module.level),
                })
                .collect()
        });
        LocalProfilesData {
            profiles,
            selected: self.selected.clone(),
        }
    }

    fn begin(
        &mut self,
        name: String,
        create: bool,
        now: u64,
    ) -> Result<(Revisioned<PlayerIdentity>, Option<GameServer>), String> {
        let name = name.trim().to_string();
        let key = normalize_player_name(&name);
        if let Some(selected) = &self.selected {
            return if normalize_player_name(&selected.data.name) == key {
                // Lost responses and webview reloads may repeat selection, but
                // never start another scheduler or create another profile.
                Ok((selected.clone(), None))
            } else {
                Err("A profile is already selected. Relaunch to choose another.".to_string())
            };
        }
        if key.is_empty() || name.chars().any(char::is_control) {
            return Err("Enter a profile name without control characters.".to_string());
        }
        if create && name.chars().count() > 40 {
            return Err("Use at most 40 characters for a new profile name.".to_string());
        }
        let exists = self
            .loaded
            .as_ref()
            .is_some_and(|envelope| envelope.system.players.contains_key(&key));
        if create && exists {
            return Err("That profile already exists. Choose it from the list.".to_string());
        }
        if !create && !exists {
            return Err("That profile does not exist. Create a new profile instead.".to_string());
        }
        let store = self.store.as_ref().ok_or("Local save is unavailable.")?;
        let server =
            GameServer::from_loaded(Arc::clone(store), self.loaded.clone(), name, None, now)?;
        let selected = server.selected_profile()?;
        self.selected = Some(selected.clone());
        self.loaded = None;
        self.store = None; // GameServer now owns the same lock without a gap.
        Ok((selected, Some(server)))
    }
}

#[tauri::command]
pub(crate) fn get_local_profiles(
    startup: tauri::State<'_, LocalProfiles>,
) -> Result<LocalProfilesData, String> {
    Ok(startup.0.lock().map_err(|error| error.to_string())?.data())
}

#[tauri::command]
pub(crate) fn request_begin_local_profile(
    app: tauri::AppHandle,
    startup: tauri::State<'_, LocalProfiles>,
    name: String,
    create: bool,
) -> Result<Revisioned<PlayerIdentity>, String> {
    // Keep the startup lock through manage(): simultaneous requests must never
    // observe selected identity before the gameplay server is installed.
    let mut session = startup.0.lock().map_err(|error| error.to_string())?;
    let (selected, server) = session.begin(name, create, now_ms())?;
    if let Some(server) = server {
        if !app.manage(server) {
            return Err("A gameplay session is already running.".to_string());
        }
        std::thread::spawn(move || run_scheduler(app));
    }
    Ok(selected)
}

#[cfg(test)]
mod tests {
    use super::super::persistence::SAVE_SCHEMA_VERSION;
    use super::super::state::ServerState;
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct Scratch(PathBuf);
    impl Scratch {
        fn new() -> Self {
            let nonce = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            Self(
                std::env::temp_dir()
                    .join(format!("voidbound-profiles-{}-{nonce}", std::process::id())),
            )
        }
        fn path(&self) -> PathBuf {
            self.0.join("local-system.json")
        }
    }
    impl Drop for Scratch {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    fn seed(path: PathBuf, now: u64) -> SaveEnvelopeV1 {
        let store = SaveStore::open(path).unwrap();
        let mut state = ServerState::new(now);
        state.resources.construction = 321;
        state.create_player_profile("Ada".to_string(), now).unwrap();
        state.resources.construction = 42;
        let saved = SaveEnvelopeV1 {
            schema_version: SAVE_SCHEMA_VERSION,
            saved_at: now,
            system: state.persistent_system(),
        };
        store.save(&saved).unwrap();
        saved
    }

    #[test]
    fn chooser_holds_lock_without_creating_a_default_profile_and_selection_is_once_only() {
        let scratch = Scratch::new();
        let chooser = LocalProfiles::open(scratch.path()).unwrap();
        assert!(!scratch.path().exists());
        assert!(SaveStore::open(scratch.path()).is_err());
        let mut session = chooser.0.lock().unwrap();
        assert!(session.data().profiles.is_empty());
        assert!(session.begin("missing".to_string(), false, 0).is_err());
        assert!(session.begin("  ".to_string(), true, 0).is_err());
        assert!(session.begin("a\nb".to_string(), true, 0).is_err());
        assert!(session.begin("a".repeat(41), true, 0).is_err());
        let (selected, server) = session
            .begin("  Ada  ".to_string(), true, now_ms())
            .unwrap();
        let server = server.unwrap();
        assert_eq!(selected.data.name, "Ada");
        assert!(selected.revision > 0);
        assert!(SaveStore::open(scratch.path()).is_err());
        let (replayed, second_server) = session.begin("ADA".to_string(), true, now_ms()).unwrap();
        assert_eq!(selected.data.id, replayed.data.id);
        assert!(second_server.is_none());
        assert!(session.begin("Other".to_string(), true, now_ms()).is_err());
        assert!(session.data().profiles.is_empty());
        let state = server.state.lock().unwrap();
        assert_eq!(state.persistent_system().players.len(), 1);
        assert_eq!(state.motherships.len(), 1);
        drop(state);
        drop(server);
        drop(session);
        drop(chooser);
        let reopened = LocalProfiles::open(scratch.path()).unwrap();
        assert_eq!(reopened.0.lock().unwrap().data().profiles[0].name, "Ada");
    }

    #[test]
    fn public_summary_excludes_private_data_and_existing_selection_preserves_every_profile() {
        let scratch = Scratch::new();
        let now = now_ms();
        let saved = seed(scratch.path(), now);
        let chooser = LocalProfiles::open(scratch.path()).unwrap();
        let mut session = chooser.0.lock().unwrap();
        let public = serde_json::to_value(session.data()).unwrap();
        assert_eq!(
            public["profiles"][0],
            serde_json::json!({
                "name": "Ada",
                "commandLevel": 1,
            })
        );
        assert_eq!(public.as_object().unwrap().len(), 2);
        assert!(session.begin("ADA".to_string(), true, now).is_err());
        let (_, server) = session.begin("aDa".to_string(), false, now).unwrap();
        let server = server.unwrap();
        let state = server.state.lock().unwrap();
        assert_eq!(state.resources.construction, 42);
        assert_eq!(state.parked_players["player 1"].resources.construction, 321);
        assert_eq!(
            state.motherships.len(),
            saved.system.world.motherships.len()
        );
    }

    #[test]
    fn creating_a_profile_preserves_existing_players_and_shared_world() {
        let scratch = Scratch::new();
        let now = now_ms();
        let saved = seed(scratch.path(), now);
        let chooser = LocalProfiles::open(scratch.path()).unwrap();
        let (_, server) = chooser
            .0
            .lock()
            .unwrap()
            .begin("New Pilot".to_string(), true, now)
            .unwrap();
        let server = server.unwrap();
        let state = server.state.lock().unwrap();
        assert_eq!(state.persistent_system().players.len(), 3);
        assert_eq!(state.parked_players["ada"].resources.construction, 42);
        assert_eq!(state.parked_players["player 1"].resources.construction, 321);
        assert_eq!(state.asteroids.len(), saved.system.world.asteroids.len());
        for (id, ship) in saved.system.world.motherships {
            assert_eq!(state.motherships[&id].col, ship.col);
            assert_eq!(state.motherships[&id].row, ship.row);
        }
    }

    #[test]
    fn backup_recovered_for_the_chooser_is_the_envelope_used_by_selection() {
        let scratch = Scratch::new();
        let now = now_ms();
        let saved = seed(scratch.path(), now);
        {
            let store = SaveStore::open(scratch.path()).unwrap();
            store.save(&saved).unwrap(); // rotate a valid backup
        }
        fs::write(scratch.path(), "corrupt").unwrap();
        let chooser = LocalProfiles::open(scratch.path()).unwrap();
        assert_eq!(chooser.0.lock().unwrap().data().profiles.len(), 2);
        let (_, server) = chooser
            .0
            .lock()
            .unwrap()
            .begin("Ada".to_string(), false, now)
            .unwrap();
        let server = server.unwrap();
        assert_eq!(server.state.lock().unwrap().resources.construction, 42);
        assert_eq!(server.state.lock().unwrap().parked_players.len(), 1);
    }

    #[test]
    fn cli_selected_sessions_bypass_the_chooser_and_reject_identity_changes() {
        let scratch = Scratch::new();
        let server = GameServer::open(
            scratch.path(),
            "CLI Pilot".to_string(),
            None,
            None,
            now_ms(),
        )
        .unwrap();
        let chooser = LocalProfiles::selected(&server).unwrap();
        let mut session = chooser.0.lock().unwrap();
        assert_eq!(session.data().selected.unwrap().data.name, "CLI Pilot");
        assert!(session
            .begin("Someone Else".to_string(), true, now_ms())
            .is_err());
        assert!(session
            .begin("cli pilot".to_string(), false, now_ms())
            .unwrap()
            .1
            .is_none());
    }
}
