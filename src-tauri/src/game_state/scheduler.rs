use std::sync::{Condvar, Mutex, MutexGuard, PoisonError};
use std::time::Duration;

use tauri::{Emitter, Manager};

use super::state::{now_ms, Revisioned, ServerPush, ServerState, SERVER_PUSH_EVENT};

/// The managed Tauri state: the authoritative ServerState behind a mutex,
/// plus the condvar that wakes the scheduler thread early when a command
/// creates a nearer deadline (a build started, a vessel dispatched or
/// recalled) — without it, a short vessel flight's arrival push would wait
/// out the scheduler's current sleep.
pub struct GameServer {
    pub(super) state: Mutex<ServerState>,
    wake: Condvar,
}

impl GameServer {
    pub fn new(now_ms: u64) -> Self {
        Self {
            state: Mutex::new(ServerState::new(now_ms)),
            wake: Condvar::new(),
        }
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
    emit_pushes(app, pushes);
    server.wake.notify_all();
    revision
}
