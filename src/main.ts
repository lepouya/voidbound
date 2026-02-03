// import { invoke } from "@tauri-apps/api/core";
import * as ex from "excalibur";

import { MyLevel } from "./level";
import { loader } from "./resources";

const game = new ex.Engine({
  width: 390,
  height: 844,
  displayMode: ex.DisplayMode.FitScreenAndFill,
  pixelArt: true,
  scenes: {
    start: MyLevel,
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
  .then(() => {
    // Do something after the game starts
  });
