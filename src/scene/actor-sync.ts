import { TileActor } from "./tile-actor.ts";

/**
 * Diffs a server-owned entity table (`source`) against the actors currently
 * on screen (`actors`) and rebuilds only what changed: entities that left
 * `source` are killed and dropped, entities whose last-applied snapshot
 * (`applied`) no longer matches `same` are rebuilt in place, everything else
 * is left alone. Shared by every TiledScene entity-sync module (motherships,
 * asteroids — see src/map/map-motherships.ts, src/map/map-asteroids.ts) whose
 * actors are a pure function of one server snapshot with no other per-actor
 * state to carry across a rebuild. Reconcilers with real quirks on top —
 * vessels (redirect-in-place lerp, arrival-based respawn skip;
 * src/map/map-vessels.ts), modules (multiple side-derived applied maps,
 * selection carry-over; src/ship/ship-modules.ts) — don't fit this shape and
 * keep their own loops.
 */
export function reconcileActors<Id, Data>(opts: {
  actors: Map<Id, TileActor>;
  applied: Map<Id, Data>;
  source: ReadonlyMap<Id, Data>;
  id: (data: Data) => Id;
  same: (a: Data, b: Data) => boolean;
  build: (data: Data) => TileActor;
  add: (actor: TileActor) => void;
  onAdd?: (data: Data, actor: TileActor) => void;
  onRemove?: (id: Id, actor: TileActor) => void;
}): void {
  for (const [id, actor] of opts.actors) {
    if (opts.source.has(id)) continue;
    actor.kill();
    opts.actors.delete(id);
    opts.applied.delete(id);
    opts.onRemove?.(id, actor);
  }
  for (const data of opts.source.values()) {
    const id = opts.id(data);
    const applied = opts.applied.get(id);
    if (applied !== undefined && opts.same(applied, data)) continue;
    opts.actors.get(id)?.kill();
    const actor = opts.build(data);
    opts.actors.set(id, actor);
    opts.applied.set(id, data);
    opts.add(actor);
    opts.onAdd?.(data, actor);
  }
}
