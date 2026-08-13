export type NumericResources = Record<string, number>;

export function canAfford(resources: NumericResources, cost: NumericResources) {
  return Object.entries(cost).every(([name, amount]) => (resources[name] ?? 0) >= amount);
}

export function roadMultiplier(linked: boolean) {
  return linked ? 1.25 : 1;
}

export function rankMultiplier(level: number) {
  return 1 + (Math.max(1, Math.min(3, level)) - 1) * 0.5;
}

export function wellFoodBonus(level: number) {
  return Math.max(0, Math.min(3, level)) * 2;
}

export function cottageResidents(level: number) {
  return Math.max(1, Math.min(3, level)) * 2;
}

export function visitorForDay(day: number) {
  const visitors = ["merchant", "spirit", "druid", "storm"] as const;
  const openingIndex = [7, 15, 23, 31].indexOf(day);
  if (openingIndex >= 0) return visitors[openingIndex];
  if (day > 31 && (day - 31) % 12 === 0) return visitors[Math.floor((day - 43) / 12) % visitors.length];
  return null;
}

export function moraleMultiplier(joy: number) {
  if (joy >= 80) return 1.1;
  if (joy < 45) return 0.8;
  return 1;
}

export function clampResource(value: number) {
  return Math.max(0, Math.floor(value));
}

const RESOURCE_NAMES = ["wood", "stone", "food", "mana", "folk"] as const;
const BUILDING_KINDS = new Set(["road", "cottage", "farm", "lumber", "quarry", "well", "shrine", "market", "tower"]);

/** Keep a corrupt or stale browser save from breaking the whole game on load. */
export function isValidSave(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const save = value as Record<string, unknown>;
  if (!save.resources || typeof save.resources !== "object" || !Array.isArray(save.buildings)) return false;
  const resources = save.resources as Record<string, unknown>;
  if (!RESOURCE_NAMES.every((name) => typeof resources[name] === "number" && Number.isFinite(resources[name]) && resources[name] >= 0)) return false;
  if (!["day", "renown", "chapter"].every((name) => typeof save[name] === "number" && Number.isFinite(save[name]) && (save[name] as number) >= 0)) return false;
  if ((save.chapter as number) > 2 || (save.deeds !== undefined && (typeof save.deeds !== "number" || save.deeds < 0))) return false;
  if (save.speed !== undefined && save.speed !== 1 && save.speed !== 2) return false;
  if (save.sound !== undefined && typeof save.sound !== "boolean") return false;
  if (save.earned !== undefined && (!Array.isArray(save.earned) || !save.earned.every((name) => typeof name === "string"))) return false;
  if (save.history !== undefined && (!Array.isArray(save.history) || save.history.length > 8 || !save.history.every((entry) => entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).day === "number" && typeof (entry as Record<string, unknown>).text === "string"))) return false;
  return save.buildings.every((item) => {
    if (!item || typeof item !== "object") return false;
    const building = item as Record<string, unknown>;
    return typeof building.id === "number" && BUILDING_KINDS.has(building.kind as string)
      && typeof building.x === "number" && building.x >= 0 && building.x < 12
      && typeof building.y === "number" && building.y >= 0 && building.y < 8
      && typeof building.level === "number" && building.level >= 1 && building.level <= 3;
  });
}

export function calculateJoy(input: {
  shrines: number;
  markets: number;
  wells: number;
  roads: number;
  food: number;
  folk: number;
  cottages: number;
}) {
  const housing = 2 + input.cottages * 2;
  const unhoused = Math.max(0, input.folk - housing);
  return Math.max(20, Math.min(100,
    66 + input.shrines * 3 + input.markets * 8 + input.wells * 2 + Math.min(6, input.roads)
    - (input.food === 0 ? 35 : 0) - unhoused * 6,
  ));
}

export function townScore(input: { day: number; renown: number; joy: number; achievements: number; deeds: number }) {
  const paceBonus = Math.max(0, 80 - input.day) * 12;
  return Math.max(0, Math.round(input.renown * 30 + input.joy * 8 + input.achievements * 175 + input.deeds * 90 + paceBonus));
}

export function scoreTitle(score: number) {
  if (score >= 3000) return "Mythic Haven";
  if (score >= 2200) return "Storied Sanctuary";
  if (score >= 1500) return "Blooming Borough";
  return "Hearthlit Hamlet";
}
