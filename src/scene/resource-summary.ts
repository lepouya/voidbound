import {
  crewRequiredAtLevel,
  crewScaledAmount,
  moduleCatalogEntry,
  productionAtLevel,
  productionBoostedAmount,
  productionBoostPctForModules,
} from "../ship/module-catalog.ts";
import type {
  ModuleData,
  ResourceCounts,
  ResourceKind,
} from "../state/game-state-types.ts";

export const RESOURCE_ICON_TILESET: Record<ResourceKind, string> = {
  construction: "ui-icon-construction",
  highTech: "ui-icon-hightech",
  biological: "ui-icon-biological",
  fuel: "ui-icon-fuel",
  credits: "ui-icon-credits",
};

export const RESOURCE_NAMES: Record<ResourceKind, string> = {
  construction: "Construction",
  highTech: "High-tech",
  biological: "Biological",
  fuel: "Fuel",
  credits: "Credits",
};

/** Nominal per-minute preview using the same staffing/boost helpers as module
 * Details. Actual credits arrive on server ticks and stop at storage capacity;
 * developer time scaling does not change these normal-time catalog rates. */
export function productionForModules(
  modules: Iterable<Pick<ModuleData, "moduleId" | "moduleType" | "level">>,
  assignments: ReadonlyMap<string, { assigned: number }>,
): ResourceCounts {
  const all = [...modules];
  const boost = productionBoostPctForModules(all, assignments);
  const result: ResourceCounts = {
    construction: 0,
    highTech: 0,
    biological: 0,
    fuel: 0,
    credits: 0,
  };
  for (const module of all) {
    const entry = moduleCatalogEntry(module.moduleType);
    if (!entry || module.level < 1) continue;
    const required = crewRequiredAtLevel(entry, module.level);
    const assigned = assignments.get(module.moduleId)?.assigned ?? 0;
    for (
      const [kind, amount] of Object.entries(
        productionAtLevel(entry, module.level),
      )
    ) {
      result[kind as ResourceKind] += productionBoostedAmount(
        crewScaledAmount(amount, assigned, required),
        boost,
      );
    }
  }
  return result;
}
