import * as ex from "excalibur";

import { MapLevel } from "./map-level";
import { loader } from "./resources";

const game = new ex.Engine({
  width: 390,
  height: 844,
  displayMode: ex.DisplayMode.FitScreenAndFill,
  pixelArt: true,
  scenes: {
    start: MapLevel,
  },
});

game
  .start("start", {
    loader,
    inTransition: new ex.FadeInOut({
      duration: 1000,
      direction: "in",
      color: ex.Color.ExcaliburBlue,
    }),
  })
  .catch(console.error);
