import * as ex from "excalibur";

import { GameStateResource } from "./game-state-loader.ts";
import { gameState } from "./game-state.ts";
import { MapLevel } from "./map-level.ts";
import { loader } from "./resources.ts";
import { ShipLevel } from "./ship-level.ts";

const game = new ex.Engine({
  width: 390,
  height: 844,
  displayMode: ex.DisplayMode.FitScreenAndFill,
  pixelArt: true,
  scenes: {
    map: MapLevel,
    ship: ShipLevel,
  },
});

// The backend game-state sync rides the loader alongside asset loading, so
// the splash/loading screen covers the fetch. Scenes tolerate late or failed
// loads — see GameStateResource.
loader.addResource(new GameStateResource());

// Production tick (ROADMAP P1.1): applyProduction only accrues whole
// intervals, so driving it from the frame loop is free between ticks and
// catches up in one call after a pause.
game.on("postupdate", () => gameState.applyProduction(Date.now()));

game
  .start("ship", {
    loader,
    inTransition: new ex.FadeInOut({
      duration: 1000,
      direction: "in",
      color: ex.Color.ExcaliburBlue,
    }),
  })
  .catch(console.error);
