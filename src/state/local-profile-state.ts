import type { PlayerIdentity, Revisioned } from "./game-state-types.ts";

/** Identity selection is a bootstrap event, before GameState's first snapshot.
 * The later gameplay snapshot still carries the same authoritative player. */
export class LocalProfileState {
  private selected: Revisioned<PlayerIdentity> | null = null;

  get player(): PlayerIdentity | null {
    return this.selected?.data ?? null;
  }

  applyLocalProfileEvent(message: Revisioned<PlayerIdentity>): void {
    if (this.selected && message.revision < this.selected.revision) return;
    if (this.selected && this.selected.data.id !== message.data.id) {
      throw new Error("Profile identity cannot change during a session.");
    }
    this.selected = { revision: message.revision, data: { ...message.data } };
  }
}
