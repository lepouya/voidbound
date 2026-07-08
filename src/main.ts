import * as ex from "excalibur";

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
