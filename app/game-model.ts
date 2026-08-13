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

export function nextVisitorDay(day: number) {
  for (let candidate = Math.max(1, Math.floor(day) + 1); candidate <= day + 20; candidate += 1) {
    if (visitorForDay(candidate)) return candidate;
  }
  return null;
}

export function requestWaitDays(day: number, nextRequestDay: number) {
  return Math.max(0, Math.ceil(nextRequestDay - day));
}

export function proportionalTrade(available: number, cost: number, reward: number) {
  if (cost <= 0) return { spent: 0, received: 0 };
  const spent = Math.min(Math.max(0, available), cost);
  return { spent, received: Math.floor(reward * spent / cost) };
}

export function policyModifiers(policy: "balanced" | "harvest" | "arcane") {
  if (policy === "harvest") return { food: 1.25, mana: 1, craft: 1, joy: 0 };
  if (policy === "arcane") return { food: 1, mana: 1.3, craft: 0.9, joy: 0 };
  return { food: 1, mana: 1, craft: 1, joy: 4 };
}

export function buildingProduction(input: {
  kind: "road" | "cottage" | "farm" | "lumber" | "quarry" | "well" | "shrine" | "market" | "tower";
  level: number;
  linked?: boolean;
  morale?: number;
  terrainBonus?: boolean;
  enchanted?: boolean;
  wellRank?: number;
}) {
  const output = { wood: 0, stone: 0, food: 0, mana: 0, glory: 0 };
  const level = Math.max(1, Math.min(3, input.level));
  const flow = rankMultiplier(level) * roadMultiplier(Boolean(input.linked)) * (input.morale ?? 1);
  if (input.kind === "lumber") output.wood = (4 + (input.terrainBonus ? 2 : 0)) * flow;
  if (input.kind === "quarry") output.stone = (3 + (input.terrainBonus ? 2 : 0)) * flow;
  if (input.kind === "farm") output.food = (4 + (input.enchanted ? 4 : 0) + wellFoodBonus(input.wellRank ?? 0)) * flow;
  if (input.kind === "shrine") output.mana = 2 * flow;
  if (input.kind === "tower") { output.mana = 5 * flow; output.glory = level; }
  if (input.kind === "cottage") output.food = -level;
  return output;
}

export function advanceTownDay(
  resources: { wood: number; stone: number; food: number; mana: number; folk: number },
  income: { wood: number; stone: number; food: number; mana: number },
) {
  const food = clampResource(resources.food + income.food);
  return {
    wood: clampResource(resources.wood + income.wood),
    stone: clampResource(resources.stone + income.stone),
    food,
    mana: clampResource(resources.mana + income.mana),
    folk: food === 0 && resources.folk > 2 ? resources.folk - 1 : resources.folk,
  };
}

export function upgradeSalvage(level: number) {
  let wood = 0;
  let stone = 0;
  for (let rank = 1; rank < Math.max(1, Math.min(3, level)); rank += 1) {
    wood += 6 * rank;
    stone += 4 * rank;
  }
  return { wood, stone };
}

export function seasonalFoodIncome(production: number, upkeep: number, seasonMultiplier: number, policyMultiplier = 1) {
  return Math.floor(Math.max(0, production) * seasonMultiplier * policyMultiplier) + Math.min(0, upkeep);
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
const ACHIEVEMENT_NAMES = new Set(["Green Fingers", "Wayfinder", "Well Beloved", "Old Magic", "Promise Keeper", "Vale of Legend"]);

/** Keep a corrupt or stale browser save from breaking the whole game on load. */
export function isValidSave(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const save = value as Record<string, unknown>;
  if (!save.resources || typeof save.resources !== "object" || !Array.isArray(save.buildings) || save.buildings.length > 96) return false;
  const resources = save.resources as Record<string, unknown>;
  if (!RESOURCE_NAMES.every((name) => typeof resources[name] === "number" && Number.isFinite(resources[name]) && Number.isInteger(resources[name]) && resources[name] >= 0)) return false;
  if (!["day", "renown", "chapter"].every((name) => typeof save[name] === "number" && Number.isFinite(save[name]) && (save[name] as number) >= 0)) return false;
  if (!Number.isInteger(save.day as number) || (save.day as number) < 1 || !Number.isInteger(save.renown as number) || !Number.isInteger(save.chapter as number)) return false;
  if ((save.chapter as number) > 2 || (save.deeds !== undefined && (typeof save.deeds !== "number" || !Number.isInteger(save.deeds) || save.deeds < 0))) return false;
  if (save.speed !== undefined && save.speed !== 1 && save.speed !== 2) return false;
  if (save.sound !== undefined && typeof save.sound !== "boolean") return false;
  if (save.earned !== undefined && (!Array.isArray(save.earned) || new Set(save.earned).size !== save.earned.length || !save.earned.every((name) => typeof name === "string" && ACHIEVEMENT_NAMES.has(name)))) return false;
  if (save.history !== undefined && (!Array.isArray(save.history) || save.history.length > 8 || !save.history.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const record = entry as Record<string, unknown>;
    return Number.isInteger(record.day as number) && (record.day as number) >= 1 && (record.day as number) <= (save.day as number)
      && typeof record.text === "string" && record.text.length > 0 && record.text.length <= 300;
  }))) return false;
  if (save.policy !== undefined && !["balanced", "harvest", "arcane"].includes(save.policy as string)) return false;
  if (save.continued !== undefined && typeof save.continued !== "boolean") return false;
  if (save.nextRequestDay !== undefined && (!Number.isInteger(save.nextRequestDay as number) || (save.nextRequestDay as number) < 1 || (save.nextRequestDay as number) > (save.day as number) + 4)) return false;
  if (save.lastVisitorDay !== undefined && (!Number.isInteger(save.lastVisitorDay as number) || (save.lastVisitorDay as number) < 0 || (save.lastVisitorDay as number) > (save.day as number))) return false;
  const ids = new Set<number>();
  const positions = new Set<string>();
  return save.buildings.every((item) => {
    if (!item || typeof item !== "object") return false;
    const building = item as Record<string, unknown>;
    const id = building.id as number;
    const position = `${building.x},${building.y}`;
    const valid = Number.isInteger(id) && id >= 1 && BUILDING_KINDS.has(building.kind as string)
      && Number.isInteger(building.x as number) && (building.x as number) >= 0 && (building.x as number) < 12
      && Number.isInteger(building.y as number) && (building.y as number) >= 0 && (building.y as number) < 8
      && Number.isInteger(building.level as number) && (building.level as number) >= 1 && (building.level as number) <= 3;
    if (!valid || ids.has(id) || positions.has(position)) return false;
    ids.add(id);
    positions.add(position);
    return true;
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
  return Math.max(0, Math.round(input.renown * 30 + input.joy * 8 + input.achievements * 175 + Math.min(8, input.deeds) * 90 + paceBonus));
}

export function scoreTitle(score: number) {
  if (score >= 3000) return "Mythic Haven";
  if (score >= 2200) return "Storied Sanctuary";
  if (score >= 1500) return "Blooming Borough";
  return "Hearthlit Hamlet";
}
