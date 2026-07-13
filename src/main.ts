import * as ex from "excalibur";

import {
  GameStateResource,
  startServerPushListener,
} from "./state/game-state-loader.ts";
import { MapLevel } from "./map/map-level.ts";
import { loader } from "./resources/resources.ts";
import { ShipLevel } from "./ship/ship-level.ts";

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

// Server-side changes — production ticks, build completions, vessel
// arrivals, feed notifications — arrive over the backend push channel;
// subscribe up front so nothing is missed while scenes initialize.
startServerPushListener();

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
