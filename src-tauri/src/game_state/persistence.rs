use std::collections::{BTreeMap, HashSet};
use std::fs::{self, File, OpenOptions};
use std::io::{copy, BufReader, Write};
use std::path::{Path, PathBuf};

use fs2::FileExt;
use serde::{Deserialize, Serialize};

use super::crew::PendingHire;
use super::deals::DealData;
use super::modules::{
    catalog_entry, module_anchor_at, ModuleData, COMMAND_MODULE_TYPE, MAX_MODULE_LEVEL,
};
use super::resources::ResourceCounts;
use super::state::{NotificationData, PlayerIdentity, ServerState, MAP_COLS, MAP_ROWS};
use super::world::{AsteroidData, MothershipData, VesselMoveEventData, ASTEROID_TIERS};

pub(super) const SAVE_SCHEMA_VERSION: u32 = 2;
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

/// The dispatch-only portion of an envelope. Read this before any versioned
/// DTO so an old save can only enter through its explicit migration path.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveEnvelopeHeader {
    schema_version: u32,
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
    pub crew_assignments: BTreeMap<String, u32>,
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
        let mut player_ids = HashSet::new();
        for (key, player) in &self.players {
            if key != &normalize_player_name(&player.identity.name) {
                return Err(format!("player key {key:?} does not match its identity"));
            }
            if player.identity.name.trim().is_empty() || player.identity.id.trim().is_empty() {
                return Err("player identity is empty".to_string());
            }
            if !player_ids.insert(&player.identity.id) {
                return Err(format!("duplicate player id {:?}", player.identity.id));
            }
            validate_player(player)?;
            for (module_id, module) in &player.modules {
                if module_id != &module.module_id || module.owner_id != player.identity.id {
                    return Err(format!("invalid module entry {module_id:?}"));
                }
            }
        }
        for (id, ship) in &self.world.motherships {
            let Some(owner) = self
                .players
                .values()
                .find(|p| p.identity.id == ship.owner_id)
            else {
                return Err(format!("invalid mothership entry {id:?}"));
            };
            if id != &ship.mothership_id
                || ship.owner_name != owner.identity.name
                || ship.mothership_id != ship.owner_id
                || ship.ship_type != "mothership-1"
                || !in_bounds(ship.col, ship.row, ship.span)
                || ship.span != 4
            {
                return Err(format!("invalid mothership entry {id:?}"));
            }
        }
        for player in self.players.values() {
            if !self.world.motherships.contains_key(&player.identity.id) {
                return Err(format!("player {:?} has no mothership", player.identity.id));
            }
        }
        validate_world(&self.world, &self.players)?;
        Ok(())
    }
}

fn validate_player(player: &PersistentPlayerV1) -> Result<(), String> {
    let mut rooms = HashSet::new();
    let mut module_types = HashSet::new();
    let mut notification_ids = HashSet::new();
    let mut highest_module_seq = 0;
    let mut highest_event_seq = 0;
    let mut highest_notification_seq = 0;
    for module in player.modules.values() {
        let Some(_) = catalog_entry(&module.module_type) else {
            return Err(format!("unknown module type {:?}", module.module_type));
        };
        if module.owner_name != player.identity.name
            || module.level == 0 && module.pending.is_none()
            || module.level > MAX_MODULE_LEVEL
            || module.pending.as_ref().is_some_and(|pending| {
                module.level.checked_add(1) != Some(pending.level)
                    || pending.level > MAX_MODULE_LEVEL
                    || pending.action_id.is_empty()
                    || pending.completes_at < pending.dispatched_at
            })
            || module_anchor_at(module.col, module.row) != Some((module.col, module.row))
            || !rooms.insert((module.col, module.row))
            || !module_types.insert(&module.module_type)
        {
            return Err(format!("invalid module {:?}", module.module_id));
        }
        if module.module_type == COMMAND_MODULE_TYPE {
            let command_anchor = module_anchor_at(18, 18).expect("command module room");
            if module.module_id != "module-command" || (module.col, module.row) != command_anchor {
                return Err("command module has an invalid identity or placement".to_string());
            }
        } else {
            highest_module_seq =
                highest_module_seq.max(generated_id_sequence(&module.module_id, "module")?);
        }
        if let Some(pending) = &module.pending {
            highest_event_seq =
                highest_event_seq.max(event_sequence(&pending.action_id, &player.identity.id)?);
        }
    }
    let mut command_modules = player
        .modules
        .values()
        .filter(|module| module.module_type == COMMAND_MODULE_TYPE)
        .peekable();
    let Some(command_module) = command_modules.next() else {
        return Err(format!(
            "player {:?} has 0 command modules",
            player.identity.id
        ));
    };
    if command_modules.next().is_some() {
        return Err(format!(
            "player {:?} has multiple command modules",
            player.identity.id
        ));
    }
    if command_module.level == 0 {
        return Err("command module cannot be unbuilt".to_string());
    }
    for module in player.modules.values() {
        let entry = catalog_entry(&module.module_type).expect("catalog validated above");
        if module.module_type != COMMAND_MODULE_TYPE
            && (module.level > command_module.level
                || module
                    .pending
                    .as_ref()
                    .is_some_and(|pending| pending.level > command_module.level)
                || entry.unlock_command_level > command_module.level)
        {
            return Err(format!(
                "module {:?} exceeds the Command Module progression",
                module.module_id
            ));
        }
    }
    if player.next_module_seq < highest_module_seq {
        return Err("next module sequence would reuse an existing id".to_string());
    }
    if let Some(pending) = &player.pending_hire {
        if pending.action_id.is_empty() || pending.completes_at < pending.dispatched_at {
            return Err("invalid pending crew hire".to_string());
        }
        highest_event_seq =
            highest_event_seq.max(event_sequence(&pending.action_id, &player.identity.id)?);
    }
    let mut assigned = 0u32;
    for (module_id, count) in &player.crew_assignments {
        let Some(module) = player.modules.get(module_id) else {
            return Err(format!("crew assignment names no module {module_id:?}"));
        };
        let Some(entry) = catalog_entry(&module.module_type) else {
            return Err(format!("crew assignment has unknown module {module_id:?}"));
        };
        let required = if module.level == 0 {
            0
        } else {
            entry
                .crew_required_base
                .saturating_add(entry.crew_required_per_level.saturating_mul(module.level))
        };
        if *count == 0 || *count > required {
            return Err(format!("invalid crew assignment for {module_id:?}"));
        }
        assigned = assigned.saturating_add(*count);
    }
    if assigned > player.crew {
        return Err("crew assignments exceed available crew".to_string());
    }
    for notification in &player.notifications {
        if notification.notification_id.is_empty()
            || notification.source_event_id.is_empty()
            || !notification_ids.insert(&notification.notification_id)
        {
            return Err("invalid notification entry".to_string());
        }
        highest_notification_seq = highest_notification_seq.max(generated_id_sequence(
            &notification.notification_id,
            "notif",
        )?);
        highest_event_seq = highest_event_seq.max(event_sequence(
            &notification.source_event_id,
            &player.identity.id,
        )?);
    }
    let mut deal_slots = HashSet::new();
    let mut deal_ids = HashSet::new();
    for deal in &player.deals {
        if deal.deal_id.is_empty()
            || !deal_ids.insert(&deal.deal_id)
            || !deal_slots.insert(deal.slot)
            || deal.get.amount == 0
            || deal
                .give
                .as_ref()
                .is_some_and(|give| give.amount == 0 || give.kind == deal.get.kind)
        {
            return Err(format!("invalid deal {:?}", deal.deal_id));
        }
    }
    if player.next_event_seq < highest_event_seq {
        return Err("next event sequence would reuse an existing id".to_string());
    }
    if player.next_notification_seq < highest_notification_seq {
        return Err("next notification sequence would reuse an existing id".to_string());
    }
    Ok(())
}

fn validate_world(
    world: &PersistentWorldV1,
    players: &BTreeMap<String, PersistentPlayerV1>,
) -> Result<(), String> {
    for (id, asteroid) in &world.asteroids {
        let Some(tier) = ASTEROID_TIERS
            .iter()
            .find(|tier| tier.tier == asteroid.tier)
        else {
            return Err(format!("unknown asteroid tier {:?}", asteroid.tier));
        };
        if id != &asteroid.asteroid_id
            || asteroid.asteroid_id.is_empty()
            || asteroid.span != tier.span
            || !in_bounds(asteroid.col, asteroid.row, asteroid.span)
            || asteroid.total == 0
            || asteroid.remaining == 0
            || asteroid.remaining > asteroid.total
        {
            return Err(format!("invalid asteroid {:?}", asteroid.asteroid_id));
        }
        if let Some(mining) = &asteroid.mining {
            let Some(vessel) = world.vessels.get(&mining.vessel_id) else {
                return Err(format!(
                    "mining asteroid {:?} has no vessel",
                    asteroid.asteroid_id
                ));
            };
            if mining.action_id != vessel.event_id
                || vessel.mining_asteroid_id.as_deref() != Some(&asteroid.asteroid_id)
                || mining.completes_at < mining.started_at
            {
                return Err(format!("invalid mining job for {:?}", asteroid.asteroid_id));
            }
        }
    }
    for (id, vessel) in &world.vessels {
        let Some(owner) = players
            .values()
            .find(|player| player.identity.id == vessel.owner_id)
        else {
            return Err(format!("vessel {:?} has no owner", vessel.vessel_id));
        };
        if id != &vessel.vessel_id
            || vessel.event_id.is_empty()
            || vessel.vessel_id.is_empty()
            || vessel.owner_name != owner.identity.name
            || vessel.mothership_id != vessel.owner_id
            || !world.motherships.contains_key(&vessel.mothership_id)
            || vessel.vessel_type != "vessel-1"
            || !vessel.speed.is_finite()
            || vessel.speed <= 0.0
            || !vessel.src_col.is_finite()
            || !vessel.src_row.is_finite()
            || !in_bounds(vessel.dest_col, vessel.dest_row, 1)
            || vessel.arrival_at < vessel.dispatched_at
            || vessel.returning && vessel.mining_asteroid_id.is_some()
            || vessel
                .mining_asteroid_id
                .as_ref()
                .is_some_and(|id| !world.asteroids.contains_key(id))
        {
            return Err(format!("invalid vessel {:?}", vessel.vessel_id));
        }
        if generated_id_sequence(&vessel.vessel_id, "vessel")? > owner.next_vessel_seq {
            return Err("next vessel sequence would reuse an existing id".to_string());
        }
        if event_sequence(&vessel.event_id, &owner.identity.id)? > owner.next_event_seq {
            return Err("next event sequence would reuse an existing id".to_string());
        }
    }
    let motherships: Vec<_> = world.motherships.values().collect();
    for (index, ship) in motherships.iter().enumerate() {
        for other in &motherships[index + 1..] {
            if footprints_overlap(
                (ship.col, ship.row, ship.span),
                (other.col, other.row, other.span),
            ) {
                return Err("motherships overlap".to_string());
            }
        }
    }
    let asteroids: Vec<_> = world.asteroids.values().collect();
    for (index, asteroid) in asteroids.iter().enumerate() {
        for other in &asteroids[index + 1..] {
            if footprints_overlap(
                (asteroid.col, asteroid.row, asteroid.span),
                (other.col, other.row, other.span),
            ) {
                return Err("asteroids overlap".to_string());
            }
        }
    }
    for ship in world.motherships.values() {
        for asteroid in world.asteroids.values() {
            if footprints_overlap(
                (ship.col, ship.row, ship.span),
                (asteroid.col, asteroid.row, asteroid.span),
            ) {
                return Err("mothership overlaps asteroid".to_string());
            }
        }
    }
    Ok(())
}

fn generated_id_sequence(id: &str, kind: &str) -> Result<u64, String> {
    let prefix = format!("{kind}-");
    let Some(rest) = id.strip_prefix(&prefix) else {
        return Err(format!("invalid {kind} id {id:?}"));
    };
    let Some((timestamp, sequence)) = rest.rsplit_once('-') else {
        return Err(format!("invalid {kind} id {id:?}"));
    };
    if timestamp.parse::<u64>().is_err() {
        return Err(format!("invalid {kind} id {id:?}"));
    }
    let sequence = sequence
        .parse::<u64>()
        .map_err(|_| format!("invalid {kind} id {id:?}"))?;
    if sequence == 0 {
        return Err(format!("invalid {kind} id {id:?}"));
    }
    Ok(sequence)
}

fn event_sequence(id: &str, player_id: &str) -> Result<u64, String> {
    let prefix = format!("{player_id}:event-");
    // Early local saves predate per-profile IDs and used the unprefixed form.
    // Keep accepting it: the durable sequence still prevents a future ID from
    // colliding, while newly created events retain the owner prefix.
    let Some(sequence) = id
        .strip_prefix(&prefix)
        .or_else(|| id.strip_prefix("event-"))
    else {
        return Err(format!("invalid event id {id:?}"));
    };
    let sequence = sequence
        .parse::<u64>()
        .map_err(|_| format!("invalid event id {id:?}"))?;
    if sequence == 0 {
        return Err(format!("invalid event id {id:?}"));
    }
    Ok(sequence)
}

fn in_bounds(col: i64, row: i64, span: i64) -> bool {
    span > 0 && col >= 0 && row >= 0 && col + span <= MAP_COLS && row + span <= MAP_ROWS
}

fn footprints_overlap(a: (i64, i64, i64), b: (i64, i64, i64)) -> bool {
    let (a_col, a_row, a_span) = a;
    let (b_col, b_row, b_span) = b;
    a_col < b_col + b_span
        && b_col < a_col + a_span
        && a_row < b_row + b_span
        && b_row < a_row + a_span
}

impl PersistentPlayerV1 {
    pub(super) fn from_state(state: &ServerState) -> Self {
        Self {
            identity: state.player.clone(),
            resources: state.resources,
            last_production_at: state.last_production_at,
            modules: state.modules.clone().into_iter().collect(),
            crew: state.crew,
            crew_assignments: state.crew_assignments.clone().into_iter().collect(),
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
                self.quarantine_rejected(&self.path)?;
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
                        Err(error) => {
                            eprintln!("rejecting backup {index}: {error}");
                            self.quarantine_rejected(&backup)?;
                        }
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
        if self.path.exists() {
            let backup_temporary = self.path.with_extension("json.bak1.tmp");
            copy_synced(&self.path, &backup_temporary)?;
            self.rotate_backups()?;
            replace_file(
                &backup_temporary,
                &self.backup_path(1),
                "install primary backup",
            )?;
        }
        replace_file(&temporary, &self.path, "replace local-system save")?;
        sync_parent_directory(&self.path);
        Ok(())
    }

    fn read_envelope(&self, path: &Path) -> Result<SaveEnvelopeV1, String> {
        let text =
            fs::read_to_string(path).map_err(|err| format!("read {}: {err}", path.display()))?;
        decode_save(&text).map_err(|err| format!("{}: {err}", path.display()))
    }

    fn rotate_backups(&self) -> Result<(), String> {
        for index in (2..=BACKUP_COUNT).rev() {
            let destination = self.backup_path(index);
            let source = self.backup_path(index - 1);
            if source.exists() {
                replace_file(&source, &destination, "rotate backup")?;
            }
        }
        Ok(())
    }

    fn backup_path(&self, index: usize) -> PathBuf {
        self.path.with_extension(format!("json.bak{index}"))
    }

    fn quarantine_rejected(&self, path: &Path) -> Result<(), String> {
        let file_name = path
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| format!("rejected save has no UTF-8 filename: {}", path.display()))?;
        let parent = path
            .parent()
            .ok_or_else(|| format!("rejected save has no parent: {}", path.display()))?;
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|error| format!("timestamp rejected save: {error}"))?
            .as_nanos();
        for suffix in 0..1_000_u32 {
            let rejected = parent.join(format!("{file_name}.rejected-{stamp}-{suffix}"));
            if !rejected.exists() {
                fs::rename(path, &rejected).map_err(|error| {
                    format!(
                        "preserve rejected save {} as {}: {error}",
                        path.display(),
                        rejected.display()
                    )
                })?;
                eprintln!("preserved rejected save as {}", rejected.display());
                return Ok(());
            }
        }
        Err(format!(
            "could not find a unique rejected-save path for {}",
            path.display()
        ))
    }
}

/// Decode one historical save shape and migrate it to the current DTO. There
/// are no pre-v1 saves: adding a fictional migration would violate the rule
/// that only a known historical shape may be repaired. Future migrations are
/// appended here as explicit `vN -> vN+1` transformations.
fn decode_save(text: &str) -> Result<SaveEnvelopeV1, String> {
    let header: SaveEnvelopeHeader =
        serde_json::from_str(text).map_err(|err| format!("parse save envelope header: {err}"))?;
    match header.schema_version {
        SAVE_SCHEMA_VERSION => {
            let envelope: SaveEnvelopeV1 =
                serde_json::from_str(text).map_err(|err| format!("parse v2 save: {err}"))?;
            envelope.system.validate()?;
            Ok(envelope)
        }
        1 => {
            let migrated = migrate_v1_to_v2(text)?;
            let envelope: SaveEnvelopeV1 = serde_json::from_value(migrated)
                .map_err(|err| format!("parse migrated v2 save: {err}"))?;
            envelope.system.validate()?;
            Ok(envelope)
        }
        version => Err(format!("unsupported save schema version {version}")),
    }
}

/// P2.8 adds explicit crew assignments. Existing pooled-staffing saves carry
/// no equivalent per-module choice, so migration deliberately starts every
/// assignment empty and lets the player make the now-visible decision.
fn migrate_v1_to_v2(text: &str) -> Result<serde_json::Value, String> {
    let mut value: serde_json::Value =
        serde_json::from_str(text).map_err(|err| format!("parse v1 save: {err}"))?;
    let players = value
        .pointer_mut("/system/players")
        .and_then(serde_json::Value::as_object_mut)
        .ok_or("v1 save has no player table")?;
    for player in players.values_mut() {
        let player = player
            .as_object_mut()
            .ok_or("v1 save player is not an object")?;
        player.insert("crewAssignments".to_string(), serde_json::json!({}));
    }
    let envelope = value
        .as_object_mut()
        .ok_or("v1 save envelope is not an object")?;
    envelope.insert(
        "schemaVersion".to_string(),
        serde_json::Value::from(SAVE_SCHEMA_VERSION),
    );
    Ok(value)
}

fn write_synced(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let mut file = File::create(path).map_err(|err| format!("create temporary save: {err}"))?;
    file.write_all(bytes)
        .map_err(|err| format!("write temporary save: {err}"))?;
    file.sync_all()
        .map_err(|err| format!("flush temporary save: {err}"))
}

fn copy_synced(source: &Path, destination: &Path) -> Result<(), String> {
    let source = File::open(source)
        .map_err(|error| format!("open primary save {}: {error}", source.display()))?;
    let mut destination = File::create(destination).map_err(|error| {
        format!(
            "create temporary primary backup {}: {error}",
            destination.display()
        )
    })?;
    copy(&mut BufReader::new(source), &mut destination)
        .map_err(|error| format!("copy primary save to temporary backup: {error}"))?;
    destination
        .sync_all()
        .map_err(|error| format!("flush temporary primary backup: {error}"))
}

fn replace_file(source: &Path, destination: &Path, operation: &str) -> Result<(), String> {
    fs::rename(source, destination)
        .map_err(|error| format!("{operation} {}: {error}", destination.display()))
}

/// Directory syncing is not available on every supported platform. A file
/// replacement is still atomic when both paths live in this directory; where
/// the OS permits opening it, syncing the directory also persists the rename.
fn sync_parent_directory(path: &Path) {
    let Some(parent) = path.parent() else {
        return;
    };
    if let Ok(directory) = File::open(parent) {
        if let Err(error) = directory.sync_all() {
            eprintln!("sync save directory {}: {error}", parent.display());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    use crate::game_state::state::ServerState;

    /// A private directory per test. Cargo runs these as parallel threads in
    /// one process, and each test ends by `remove_dir_all`-ing its own
    /// directory — so two tests sharing a path don't merely interfere, one
    /// deletes the other's save mid-run. The pid is identical across those
    /// threads and a `SystemTime` reading is only microsecond-resolution, so
    /// the counter is what actually guarantees uniqueness within a process;
    /// pid and timestamp keep separate `cargo test` runs (and reused pids)
    /// apart.
    fn test_path() -> PathBuf {
        static NEXT_TEST_DIR: AtomicU64 = AtomicU64::new(0);
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock after epoch")
            .as_nanos();
        let seq = NEXT_TEST_DIR.fetch_add(1, Ordering::Relaxed);
        std::env::temp_dir().join(format!(
            "voidbound-save-test-{}-{nonce}-{seq}",
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
    fn migrates_the_hand_authored_v1_fixture_to_empty_assignments() {
        let envelope =
            decode_save(include_str!("fixtures/save-v1.json")).expect("decode v1 fixture");
        assert_eq!(envelope.schema_version, SAVE_SCHEMA_VERSION);
        assert_eq!(envelope.system.players.len(), 1);
        assert_eq!(envelope.system.world.motherships.len(), 1);
        assert!(envelope
            .system
            .players
            .values()
            .next()
            .expect("one migrated player")
            .crew_assignments
            .is_empty());
    }

    #[test]
    fn rejects_unknown_future_versions_without_guessing_a_migration() {
        let error = decode_save(include_str!("fixtures/save-future.json")).unwrap_err();
        assert!(
            error.contains("unsupported save schema version 99"),
            "{error}"
        );
    }

    #[test]
    fn rejects_invalid_references_and_timer_relationships() {
        let mut invalid_owner = envelope(1);
        invalid_owner
            .system
            .world
            .motherships
            .get_mut("player-1")
            .expect("starter mothership")
            .owner_id = "missing-player".to_string();
        assert!(invalid_owner.system.validate().is_err());

        let mut invalid_timer = envelope(1);
        let player = invalid_timer
            .system
            .players
            .get_mut("player 1")
            .expect("starter player");
        player
            .modules
            .get_mut("module-command")
            .expect("command")
            .pending = Some(super::super::modules::ModulePendingBuild {
            level: 2,
            action_id: "event-1".to_string(),
            dispatched_at: 2,
            completes_at: 1,
        });
        assert!(invalid_timer.system.validate().is_err());
    }

    #[test]
    fn rejects_unreachable_module_types_levels_and_command_placement() {
        let mut duplicate_type = envelope(1);
        let player = duplicate_type
            .system
            .players
            .get_mut("player 1")
            .expect("starter player");
        player.next_module_seq = 2;
        for (id, col) in [("module-1-1", 2), ("module-1-2", 10)] {
            player.modules.insert(
                id.to_string(),
                ModuleData {
                    module_id: id.to_string(),
                    owner_id: player.identity.id.clone(),
                    owner_name: player.identity.name.clone(),
                    module_type: "ore-refinery".to_string(),
                    col,
                    row: 2,
                    level: 1,
                    pending: None,
                },
            );
        }
        assert!(duplicate_type.system.validate().is_err());

        let mut over_cap = envelope(1);
        over_cap
            .system
            .players
            .get_mut("player 1")
            .expect("starter player")
            .modules
            .get_mut("module-command")
            .expect("command")
            .level = MAX_MODULE_LEVEL + 1;
        assert!(over_cap.system.validate().is_err());

        let mut skipped_pending_level = envelope(1);
        let player = skipped_pending_level
            .system
            .players
            .get_mut("player 1")
            .expect("starter player");
        player.next_event_seq = 1;
        player
            .modules
            .get_mut("module-command")
            .expect("command")
            .pending = Some(super::super::modules::ModulePendingBuild {
            level: 3,
            action_id: "player-1:event-1".to_string(),
            dispatched_at: 1,
            completes_at: 2,
        });
        assert!(skipped_pending_level.system.validate().is_err());

        let mut moved_command = envelope(1);
        let command = moved_command
            .system
            .players
            .get_mut("player 1")
            .expect("starter player")
            .modules
            .get_mut("module-command")
            .expect("command");
        command.col = 2;
        command.row = 2;
        assert!(moved_command.system.validate().is_err());
    }

    #[test]
    fn rejects_overlapping_mothership_and_asteroid_footprints() {
        let mut overlapping_motherships = envelope(1);
        let first_player = overlapping_motherships
            .system
            .players
            .get("player 1")
            .expect("starter player")
            .clone();
        let mut second_player = first_player.clone();
        second_player.identity.id = "player-2".to_string();
        second_player.identity.name = "Player 2".to_string();
        for module in second_player.modules.values_mut() {
            module.owner_id = second_player.identity.id.clone();
            module.owner_name = second_player.identity.name.clone();
        }
        overlapping_motherships
            .system
            .players
            .insert("player 2".to_string(), second_player);
        let first_ship = overlapping_motherships
            .system
            .world
            .motherships
            .get("player-1")
            .expect("starter mothership")
            .clone();
        overlapping_motherships.system.world.motherships.insert(
            "player-2".to_string(),
            super::super::world::MothershipData {
                mothership_id: "player-2".to_string(),
                owner_id: "player-2".to_string(),
                owner_name: "Player 2".to_string(),
                ..first_ship
            },
        );
        assert!(overlapping_motherships.system.validate().is_err());

        let mut overlapping_asteroids = envelope(1);
        let first_asteroid = overlapping_asteroids
            .system
            .world
            .asteroids
            .values()
            .next()
            .expect("seeded asteroid")
            .clone();
        overlapping_asteroids.system.world.asteroids.insert(
            "asteroid-duplicate".to_string(),
            super::super::world::AsteroidData {
                asteroid_id: "asteroid-duplicate".to_string(),
                ..first_asteroid
            },
        );
        assert!(overlapping_asteroids.system.validate().is_err());
    }

    #[test]
    fn rejects_sequence_counters_behind_durable_identifiers() {
        let mut module_counter = envelope(1);
        let player = module_counter
            .system
            .players
            .get_mut("player 1")
            .expect("starter player");
        player.modules.insert(
            "module-1-2".to_string(),
            ModuleData {
                module_id: "module-1-2".to_string(),
                owner_id: player.identity.id.clone(),
                owner_name: player.identity.name.clone(),
                module_type: "ore-refinery".to_string(),
                col: 2,
                row: 2,
                level: 1,
                pending: None,
            },
        );
        player.next_module_seq = 1;
        assert!(module_counter.system.validate().is_err());

        let mut vessel_counter = envelope(1);
        let player = vessel_counter
            .system
            .players
            .get_mut("player 1")
            .expect("starter player");
        player.next_vessel_seq = 1;
        player.next_event_seq = 2;
        vessel_counter.system.world.vessels.insert(
            "vessel-1-2".to_string(),
            super::super::world::VesselMoveEventData {
                event_id: "player-1:event-2".to_string(),
                vessel_id: "vessel-1-2".to_string(),
                owner_id: player.identity.id.clone(),
                owner_name: player.identity.name.clone(),
                mothership_id: player.identity.id.clone(),
                vessel_type: "vessel-1".to_string(),
                src_col: 0.0,
                src_row: 0.0,
                dest_col: 1,
                dest_row: 1,
                speed: 1.0,
                dispatched_at: 1,
                arrival_at: 2,
                returning: false,
                mining_asteroid_id: None,
                cargo: None,
                arrival_settled: false,
            },
        );
        assert!(vessel_counter.system.validate().is_err());

        let mut notification_counter = envelope(1);
        let player = notification_counter
            .system
            .players
            .get_mut("player 1")
            .expect("starter player");
        player.notifications.push(NotificationData {
            notification_id: "notif-1-2".to_string(),
            source_event_id: "player-1:event-2".to_string(),
            payload: super::super::state::NotificationPayload::DealsRefreshed { day_index: 1 },
            created_at: 1,
            read: false,
        });
        player.next_event_seq = 1;
        player.next_notification_seq = 1;
        assert!(notification_counter.system.validate().is_err());
    }

    #[test]
    fn accepts_legacy_unprefixed_event_ids() {
        let mut legacy = envelope(1);
        let player = legacy
            .system
            .players
            .get_mut("player 1")
            .expect("starter player");
        player.next_event_seq = 1;
        player
            .modules
            .get_mut("module-command")
            .expect("command")
            .pending = Some(super::super::modules::ModulePendingBuild {
            level: 2,
            action_id: "event-1".to_string(),
            dispatched_at: 1,
            completes_at: 2,
        });
        assert!(legacy.system.validate().is_ok());
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
    fn retains_five_complete_backup_generations_before_replacing_primary() {
        let directory = test_path();
        let path = directory.join("local-system.json");
        let store = SaveStore::open(path.clone()).expect("open test store");
        for saved_at in 1..=6 {
            store.save(&envelope(saved_at)).expect("save generation");
        }

        assert_eq!(store.read_envelope(&path).expect("primary").saved_at, 6);
        for (index, saved_at) in (1..=5).zip((1..=5).rev()) {
            assert_eq!(
                store
                    .read_envelope(&store.backup_path(index))
                    .expect("complete backup")
                    .saved_at,
                saved_at
            );
        }

        drop(store);
        fs::remove_dir_all(directory).expect("remove test directory");
    }

    #[test]
    fn skips_rejected_generations_and_preserves_them_for_diagnosis() {
        let directory = test_path();
        let path = directory.join("local-system.json");
        let store = SaveStore::open(path.clone()).expect("open test store");
        store.save(&envelope(1)).expect("first save");
        store.save(&envelope(2)).expect("second save");
        store.save(&envelope(3)).expect("third save");
        fs::write(&path, "not json").expect("corrupt primary");
        fs::write(store.backup_path(1), "also not json").expect("corrupt newest backup");

        let recovered = store.load().expect("recover backup").expect("a backup");
        assert_eq!(recovered.saved_at, 1);
        let rejected = fs::read_dir(&directory)
            .expect("read save directory")
            .filter_map(Result::ok)
            .filter(|entry| entry.file_name().to_string_lossy().contains(".rejected-"))
            .count();
        assert_eq!(rejected, 2);

        drop(store);
        fs::remove_dir_all(directory).expect("remove test directory");
    }

    #[test]
    fn restore_backup_leaves_the_current_primary_in_the_backup_set() {
        let directory = test_path();
        let path = directory.join("local-system.json");
        let store = SaveStore::open(path.clone()).expect("open test store");
        store.save(&envelope(1)).expect("first save");
        store.save(&envelope(2)).expect("second save");
        store.save(&envelope(3)).expect("third save");

        let restored = store.restore_backup(2).expect("restore selected backup");
        assert_eq!(restored.saved_at, 1);
        store.save(&restored).expect("write restored primary");
        assert_eq!(store.read_envelope(&path).expect("primary").saved_at, 1);
        assert_eq!(
            store
                .read_envelope(&store.backup_path(1))
                .expect("previous primary backup")
                .saved_at,
            3
        );

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
