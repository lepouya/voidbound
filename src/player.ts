import * as ex from "excalibur";

import { Resources } from "./resources";

export class Player extends ex.Actor {
  private spinRotation = 0;
  private spinSpeed = 0;

  constructor() {
    super({
      name: "Player",
      pos: ex.vec(150, 150),
      width: 100,
      height: 100,
      // anchor: vec(0, 0), // Actors default center colliders and graphics with anchor (0.5, 0.5)
      // collisionType: CollisionType.Active, // Collision Type Active means this participates in collisions read more https://excaliburjs.com/docs/collisiontypes
    });
  }

  override onInitialize() {
    // Generally recommended to stick logic in the "On initialize"
    // This runs before the first update
    this.graphics.add(Resources.Sword.toSprite());

    // Actions are useful for scripting common behavior, for example patrolling enemies
    this.actions.delay(500);
    this.actions.repeatForever((ctx) => {
      ctx.moveBy({ offset: ex.vec(100, 0), duration: 1000 });
      ctx.moveBy({ offset: ex.vec(0, 100), duration: 1000 });
      ctx.moveBy({ offset: ex.vec(-100, 0), duration: 1000 });
      ctx.moveBy({ offset: ex.vec(0, -100), duration: 1000 });
    });

    // Sometimes you want to click on an actor!
    this.on("pointerdown", (evt) => {
      this.spinSpeed = Math.PI * 2; // radians per second
      this.spinRotation = 0;
    });
  }

  override onPreUpdate(engine: ex.Engine, elapsedMs: number): void {
    // Put any update logic here runs every frame before Actor builtins
  }

  override onPostUpdate(engine: ex.Engine, elapsedMs: number): void {
    // Handle spin rotation independently of actions
    if (this.spinSpeed > 0) {
      const delta = this.spinSpeed * (elapsedMs / 1000);
      this.spinRotation += delta;
      this.graphics.current!.rotation = this.spinRotation;

      // Stop after a full rotation
      if (this.spinRotation >= Math.PI * 2) {
        this.spinSpeed = 0;
        this.spinRotation = 0;
        this.graphics.current!.rotation = 0;
      }
    }
  }

  override onPreCollisionResolve(
    self: ex.Collider,
    other: ex.Collider,
    side: ex.Side,
    contact: ex.CollisionContact,
  ): void {
    // Called before a collision is resolved, if you want to opt out of this specific collision call contact.cancel()
  }

  override onPostCollisionResolve(
    self: ex.Collider,
    other: ex.Collider,
    side: ex.Side,
    contact: ex.CollisionContact,
  ): void {
    // Called every time a collision is resolved and overlap is solved
  }

  override onCollisionStart(
    self: ex.Collider,
    other: ex.Collider,
    side: ex.Side,
    contact: ex.CollisionContact,
  ): void {
    // Called when a pair of objects are in contact
  }

  override onCollisionEnd(
    self: ex.Collider,
    other: ex.Collider,
    side: ex.Side,
    lastContact: ex.CollisionContact,
  ): void {
    // Called when a pair of objects separates
  }
}
