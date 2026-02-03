import * as ex from "excalibur";

export const Resources = {
  Sword: new ex.ImageSource("/src/assets/sword.png"),
} as const;

export const loader = new ex.DefaultLoader();
for (const res of Object.values(Resources)) {
  loader.addResource(res);
}
