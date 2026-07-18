import { assertEquals } from "@std/assert";

import {
  loadAfterListenerReady,
} from "../src/state/game-state-loader-order.ts";

Deno.test("initial snapshot waits for push listener registration", async () => {
  const calls: string[] = [];
  let markListenerReady: (() => void) | undefined;
  const listenerRegistration = new Promise<void>((resolve) => {
    markListenerReady = resolve;
  });

  const loading = loadAfterListenerReady(
    () => {
      calls.push("listener-started");
      return listenerRegistration;
    },
    () => {
      calls.push("snapshot-invoked");
      return Promise.resolve("snapshot");
    },
  );

  await Promise.resolve();
  assertEquals(calls, ["listener-started"]);

  markListenerReady?.();
  assertEquals(await loading, "snapshot");
  assertEquals(calls, ["listener-started", "snapshot-invoked"]);
});
