import * as ex from "excalibur";

import { Player } from "./player";

export class MyLevel extends ex.Scene {
  override onInitialize(engine: ex.Engine): void {
    // Scene.onInitialize is where we recommend you perform the composition for your game
    const player = new Player();
    this.add(player); // Actors need to be added to a scene to be drawn
  }

  override onPreLoad(loader: ex.DefaultLoader): void {
    // Add any scene specific resources to load
  }

  override onActivate(context: ex.SceneActivationContext<unknown>): void {
    // Called when Excalibur transitions to this scene
    // Only 1 scene is active at a time
  }

  override onDeactivate(context: ex.SceneActivationContext): void {
    // Called when Excalibur transitions away from this scene
    // Only 1 scene is active at a time
  }

  override onPreUpdate(engine: ex.Engine, elapsedMs: number): void {
    // Called before anything updates in the scene
  }

  override onPostUpdate(engine: ex.Engine, elapsedMs: number): void {
    // Called after everything updates in the scene
  }

  override onPreDraw(
    ctx: ex.ExcaliburGraphicsContext,
    elapsedMs: number,
  ): void {
    // Called before Excalibur draws to the screen
  }

  override onPostDraw(
    ctx: ex.ExcaliburGraphicsContext,
    elapsedMs: number,
  ): void {
    // Called after Excalibur draws to the screen
  }
}
