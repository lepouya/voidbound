import { assertEquals, assertThrows } from "@std/assert";
import { LocalProfileState } from "../src/state/local-profile-state.ts";

Deno.test("profile selection replay is idempotent and cannot switch identity", () => {
  const state = new LocalProfileState();
  assertEquals(state.player, null);
  const event = { revision: 7, data: { id: "ada", name: "Ada" } };
  state.applyLocalProfileEvent(event);
  state.applyLocalProfileEvent(event);
  state.applyLocalProfileEvent({
    revision: 6,
    data: { id: "old", name: "Old" },
  });
  assertEquals(state.player, event.data);
  assertThrows(
    () =>
      state.applyLocalProfileEvent({
        revision: 8,
        data: { id: "other", name: "Other" },
      }),
    Error,
    "cannot change",
  );
  assertEquals(state.player, event.data);
});
