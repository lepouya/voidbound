/**
 * Random unique id for locally-created events (see the multiplayer-ready
 * event pattern in CLAUDE.md). crypto.randomUUID requires a secure context
 * (always true under Tauri), so fall back to random hex when the vite dev
 * build is served over plain http to a LAN device.
 */
export function newEventId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
