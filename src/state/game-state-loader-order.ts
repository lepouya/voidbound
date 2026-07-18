/**
 * Wait for push subscription readiness before requesting the initial snapshot.
 * Kept free of Tauri/Excalibur imports so the startup ordering can be tested
 * under Deno with injected dependencies.
 */
export async function loadAfterListenerReady<T>(
  listenerReady: () => Promise<void>,
  loadSnapshot: () => Promise<T>,
): Promise<T> {
  await listenerReady();
  return await loadSnapshot();
}
