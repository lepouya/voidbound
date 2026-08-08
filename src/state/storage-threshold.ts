/**
 * Presentation math for P2.13's protected-storage threshold. The server keeps
 * every explicit gain; only passive production pauses at this threshold.
 * Pure module so HUD and Details can agree under Deno tests.
 */
export interface StorageThreshold {
  /** Amount protected by storage capacity. */
  protectedAmount: number;
  /** Retained stock above the protected threshold. */
  exposedAmount: number;
  /** Whether passive production for this resource is currently paused. */
  passiveProductionPaused: boolean;
}

export function storageThreshold(
  amount: number,
  capacity: number,
): StorageThreshold {
  if (!Number.isFinite(capacity)) {
    return {
      protectedAmount: amount,
      exposedAmount: 0,
      passiveProductionPaused: false,
    };
  }
  return {
    protectedAmount: Math.min(amount, capacity),
    exposedAmount: Math.max(0, amount - capacity),
    passiveProductionPaused: amount >= capacity,
  };
}
