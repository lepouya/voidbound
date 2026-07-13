/**
 * Random unique id for locally-created events (see the multiplayer-ready
 * event pattern in CLAUDE.md). crypto.randomUUID requires a secure context
 * (always true under Tauri), so fall back to random hex when the vite dev
 * build is served over plain http to a LAN device.
 *
 * Intentionally kept with zero current callers: every shipped action ended up
 * server-verified, so nothing constructs an event locally today. This is the
 * escape hatch for a future action that truly has nothing to verify — see
 * /add-game-event step 3. Not dead code to clean up; if it grows stale or a
 * new local-only action needs different id shape, revisit then.
 */
export function newEventId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
