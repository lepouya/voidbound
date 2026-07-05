import { assertEquals } from "jsr:@std/assert@1";

import {
  parseSegment,
  splitRefLayers,
  TileRef,
  visibleLayers,
} from "../src/ui/tile-ref-parse.ts";

Deno.test("parseSegment: bare name means tile 0", () => {
  assertEquals(parseSegment("ship-tiles"), { name: "ship-tiles", tileId: 0 });
});

Deno.test("parseSegment: name:id selects the tile index", () => {
  assertEquals(parseSegment("ship-tiles:7"), { name: "ship-tiles", tileId: 7 });
  assertEquals(parseSegment("cs1-base:31"), { name: "cs1-base", tileId: 31 });
});

Deno.test("parseSegment: only the first colon splits name from id", () => {
  // Tileset names are lowercase-kebab and never contain colons, but the
  // split must still anchor on the first colon.
  assertEquals(parseSegment("a:12"), { name: "a", tileId: 12 });
});

Deno.test("splitRefLayers: single segment passes through", () => {
  assertEquals(splitRefLayers("ss1-base:0"), ["ss1-base:0"]);
});

Deno.test("splitRefLayers: comma list splits in painter's order", () => {
  assertEquals(splitRefLayers("ts1,ts2:1,ts3"), ["ts1", "ts2:1", "ts3"]);
});

Deno.test("splitRefLayers: segments are trimmed and empties dropped", () => {
  assertEquals(splitRefLayers(" a , b:2 ,, c "), ["a", "b:2", "c"]);
  assertEquals(splitRefLayers(","), []);
});

Deno.test("visibleLayers: single ref normalizes to a one-element array", () => {
  assertEquals(visibleLayers("ship-tiles:1"), ["ship-tiles:1"]);
  const obj: TileRef = { tile: "ship-tiles", tileId: 1 };
  assertEquals(visibleLayers(obj), [obj]);
});

Deno.test("visibleLayers: object layers with visible:false are excluded", () => {
  const base: TileRef = { tile: "module-base" };
  const hidden: TileRef = { tile: "module-lights", visible: false };
  const shown: TileRef = { tile: "module-glow", visible: true };
  assertEquals(visibleLayers([base, hidden, shown]), [base, shown]);
});

Deno.test("visibleLayers: string layers are always included", () => {
  // To hide a string layer conditionally it must be converted to object form.
  assertEquals(visibleLayers(["a", "b:2"]), ["a", "b:2"]);
});

Deno.test("visibleLayers: all layers hidden yields an empty array", () => {
  assertEquals(
    visibleLayers([
      { tile: "a", visible: false },
      { tile: "b", visible: false },
    ]),
    [],
  );
});
