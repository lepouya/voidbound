use std::collections::BTreeMap;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

use fs2::FileExt;
use serde::{Deserialize, Serialize};

use super::crew::PendingHire;
use super::deals::DealData;
use super::modules::ModuleData;
use super::resources::ResourceCounts;
use super::state::{NotificationData, PlayerIdentity, ServerState};
use super::world::{AsteroidData, MothershipData, VesselMoveEventData};

pub(super) const SAVE_SCHEMA_VERSION: u32 = 1;
const BACKUP_COUNT: usize = 5;

/// The complete durable local-system snapshot. Runtime delivery state, AOI,
/// mutexes, and scheduler coordination deliberately do not appear here.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub(super) struct SaveEnvelopeV1 {
    pub schema_version: u32,
    pub saved_at: u64,
    pub system: PersistentSystemV1,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub(super) struct PersistentSystemV1 {
    pub system_id: String,
    pub system_seed: u64,
    pub state_revision: u64,
    pub world: PersistentWorldV1,
    pub players: BTreeMap<String, PersistentPlayerV1>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub(super) struct PersistentWorldV1 {
    pub motherships: BTreeMap<String, MothershipData>,
    pub vessels: BTreeMap<String, VesselMoveEventData>,
    pub asteroids: BTreeMap<String, AsteroidData>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub(super) struct PersistentPlayerV1 {
    pub identity: PlayerIdentity,
    pub resources: ResourceCounts,
    pub last_production_at: u64,
    pub modules: BTreeMap<String, ModuleData>,
    pub crew: u32,
    pub pending_hire: Option<PendingHire>,
    pub notifications: Vec<NotificationData>,
    pub deals: Vec<DealData>,
    pub deals_day_index: u64,
    pub deal_refreshes_used: u32,
    pub next_module_seq: u64,
    pub next_vessel_seq: u64,
    pub next_event_seq: u64,
    pub next_notification_seq: u64,
}

impl PersistentSystemV1 {
    pub(super) fn from_state(state: &ServerState) -> Self {
        let player = PersistentPlayerV1::from_state(state);
        let mut players = BTreeMap::new();
        players.insert(normalize_player_name(&player.identity.name), player);
        Self {
            system_id: "local-system-1".to_string(),
            system_seed: 0x9E37_79B9_7F4A_7C15,
            state_revision: state.revision,
            world: PersistentWorldV1 {
                motherships: state.motherships.clone().into_iter().collect(),
                vessels: state.vessels.clone().into_iter().collect(),
                asteroids: state.asteroids.clone().into_iter().collect(),
            },
            players,
        }
    }

    pub(super) fn validate(&self) -> Result<(), String> {
        if self.system_id != "local-system-1" {
            return Err(format!("unsupported local system id {:?}", self.system_id));
        }
        if self.players.is_empty() {
            return Err("persistent system has no players".to_string());
        }
        for (key, player) in &self.players {
            if key != &normalize_player_name(&player.identity.name) {
                return Err(format!("player key {key:?} does not match its identity"));
            }
            if player.identity.name.trim().is_empty() {
                return Err("player identity is empty".to_string());
            }
            for (module_id, module) in &player.modules {
                if module_id != &module.module_id || module.owner_id != player.identity.id {
                    return Err(format!("invalid module entry {module_id:?}"));
                }
            }
        }
        for (id, ship) in &self.world.motherships {
            if id != &ship.mothership_id
                || !self
                    .players
                    .values()
                    .any(|p| p.identity.id == ship.owner_id)
            {
                return Err(format!("invalid mothership entry {id:?}"));
            }
        }
        Ok(())
    }
}

impl PersistentPlayerV1 {
    pub(super) fn from_state(state: &ServerState) -> Self {
        Self {
            identity: state.player.clone(),
            resources: state.resources,
            last_production_at: state.last_production_at,
            modules: state.modules.clone().into_iter().collect(),
            crew: state.crew,
            pending_hire: state.pending_hire.clone(),
            notifications: state.notifications.clone(),
            deals: state.deals.clone(),
            deals_day_index: state.deals_day_index,
            deal_refreshes_used: state.deal_refreshes_used,
            next_module_seq: state.next_module_seq,
            next_vessel_seq: state.next_vessel_seq,
            next_event_seq: state.next_event_seq,
            next_notification_seq: state.next_notification_seq,
        }
    }
}

pub(super) fn normalize_player_name(name: &str) -> String {
    name.trim().to_lowercase()
}

/// Owns the one-process file lock and the complete backup/recovery lifecycle.
pub(super) struct SaveStore {
    path: PathBuf,
    _lock: File,
}

impl SaveStore {
    pub(super) fn open(path: PathBuf) -> Result<Self, String> {
        let parent = path
            .parent()
            .ok_or_else(|| "save path has no parent directory".to_string())?;
        fs::create_dir_all(parent).map_err(|err| format!("create save directory: {err}"))?;
        let lock_path = path.with_extension("lock");
        let lock = OpenOptions::new()
            .create(true)
            .read(true)
            .write(true)
            .truncate(false)
            .open(&lock_path)
            .map_err(|err| format!("open local-system lock: {err}"))?;
        lock.try_lock_exclusive()
            .map_err(|_| "another Voidbound process already owns this local system".to_string())?;
        Ok(Self { path, _lock: lock })
    }

    pub(super) fn load(&self) -> Result<Option<SaveEnvelopeV1>, String> {
        if !self.path.exists() {
            return Ok(None);
        }
        match self.read_envelope(&self.path) {
            Ok(envelope) => Ok(Some(envelope)),
            Err(primary_error) => {
                eprintln!(
                    "rejecting primary save {}: {primary_error}",
                    self.path.display()
                );
                for index in 1..=BACKUP_COUNT {
                    let backup = self.backup_path(index);
                    if !backup.exists() {
                        continue;
                    }
                    match self.read_envelope(&backup) {
                        Ok(envelope) => {
                            eprintln!("recovering local system from backup {index}");
                            return Ok(Some(envelope));
                        }
                        Err(error) => eprintln!("rejecting backup {index}: {error}"),
                    }
                }
                Err(format!(
                    "no valid local-system save remains: {primary_error}"
                ))
            }
        }
    }

    pub(super) fn restore_backup(&self, index: usize) -> Result<SaveEnvelopeV1, String> {
        if !(1..=BACKUP_COUNT).contains(&index) {
            return Err(format!("--restore-backup must be in 1..={BACKUP_COUNT}"));
        }
        let backup = self.backup_path(index);
        let envelope = self.read_envelope(&backup)?;
        eprintln!("restoring local system from requested backup {index}");
        Ok(envelope)
    }

    pub(super) fn save(&self, envelope: &SaveEnvelopeV1) -> Result<(), String> {
        let bytes = serde_json::to_vec_pretty(envelope)
            .map_err(|err| format!("serialize local-system save: {err}"))?;
        let temporary = self.path.with_extension("json.tmp");
        write_synced(&temporary, &bytes)?;
        self.rotate_backups()?;
        fs::rename(&temporary, &self.path)
            .map_err(|err| format!("replace local-system save: {err}"))?;
        Ok(())
    }

    fn read_envelope(&self, path: &Path) -> Result<SaveEnvelopeV1, String> {
        let text =
            fs::read_to_string(path).map_err(|err| format!("read {}: {err}", path.display()))?;
        let envelope: SaveEnvelopeV1 = serde_json::from_str(&text)
            .map_err(|err| format!("parse {}: {err}", path.display()))?;
        if envelope.schema_version != SAVE_SCHEMA_VERSION {
            return Err(format!(
                "unsupported save schema version {}",
                envelope.schema_version
            ));
        }
        envelope.system.validate()?;
        Ok(envelope)
    }

    fn rotate_backups(&self) -> Result<(), String> {
        for index in (1..=BACKUP_COUNT).rev() {
            let destination = self.backup_path(index);
            let source = if index == 1 {
                self.path.clone()
            } else {
                self.backup_path(index - 1)
            };
            if source.exists() {
                if destination.exists() {
                    fs::remove_file(&destination).map_err(|err| {
                        format!("remove old backup {}: {err}", destination.display())
                    })?;
                }
                fs::rename(&source, &destination)
                    .map_err(|err| format!("rotate backup {}: {err}", destination.display()))?;
            }
        }
        Ok(())
    }

    fn backup_path(&self, index: usize) -> PathBuf {
        self.path.with_extension(format!("json.bak{index}"))
    }
}

fn write_synced(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let mut file = File::create(path).map_err(|err| format!("create temporary save: {err}"))?;
    file.write_all(bytes)
        .map_err(|err| format!("write temporary save: {err}"))?;
    file.sync_all()
        .map_err(|err| format!("flush temporary save: {err}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    use crate::game_state::state::ServerState;

    fn test_path() -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock after epoch")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "voidbound-save-test-{}-{nonce}",
            std::process::id()
        ))
    }

    fn envelope(saved_at: u64) -> SaveEnvelopeV1 {
        let state = ServerState::new(0);
        SaveEnvelopeV1 {
            schema_version: SAVE_SCHEMA_VERSION,
            saved_at,
            system: state.persistent_system(),
        }
    }

    #[test]
    fn normalizes_player_names_case_insensitively() {
        assert_eq!(normalize_player_name("  Ada Lovelace  "), "ada lovelace");
    }

    #[test]
    fn saves_a_versioned_snapshot_and_recovers_the_newest_valid_backup() {
        let directory = test_path();
        let path = directory.join("local-system.json");
        let store = SaveStore::open(path.clone()).expect("open test store");
        store.save(&envelope(1)).expect("first save");
        store.save(&envelope(2)).expect("second save");
        fs::write(&path, "not json").expect("corrupt primary");

        let recovered = store.load().expect("recover backup").expect("a backup");
        assert_eq!(recovered.saved_at, 1);
        drop(store);
        fs::remove_dir_all(directory).expect("remove test directory");
    }

    #[test]
    fn rejects_a_second_process_lock_for_the_same_system() {
        let directory = test_path();
        let path = directory.join("local-system.json");
        let store = SaveStore::open(path.clone()).expect("open first store");
        assert!(SaveStore::open(path).is_err());
        drop(store);
        fs::remove_dir_all(directory).expect("remove test directory");
    }
}
