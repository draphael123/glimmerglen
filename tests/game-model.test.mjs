import test from "node:test";
import assert from "node:assert/strict";
import { advanceTownDay, buildingProduction, calculateJoy, canAfford, clampResource, cottageResidents, isValidSave, moraleMultiplier, nextVisitorDay, policyModifiers, proportionalTrade, rankMultiplier, requestWaitDays, roadMultiplier, scoreTitle, seasonalFoodIncome, townScore, upgradeSalvage, visitorForDay, wellFoodBonus } from "../app/game-model.ts";

test("affordability checks every requested resource", () => {
  assert.equal(canAfford({ wood: 20, stone: 5 }, { wood: 16, stone: 5 }), true);
  assert.equal(canAfford({ wood: 20, stone: 4 }, { wood: 16, stone: 5 }), false);
  assert.equal(canAfford({ wood: 20 }, { mana: 1 }), false);
});

test("roads grant exactly a 25 percent production multiplier", () => {
  assert.equal(roadMultiplier(false), 1);
  assert.equal(roadMultiplier(true), 1.25);
});

test("every building rank has a bounded gameplay effect", () => {
  assert.deepEqual([1, 2, 3].map(rankMultiplier), [1, 1.5, 2]);
  assert.equal(rankMultiplier(9), 2);
  assert.deepEqual([1, 2, 3].map(wellFoodBonus), [2, 4, 6]);
  assert.deepEqual([1, 2, 3].map(cottageResidents), [2, 4, 6]);
});

test("story visitors continue to return after the opening chapter", () => {
  assert.deepEqual([7, 15, 23, 31].map(visitorForDay), ["merchant", "spirit", "druid", "storm"]);
  assert.deepEqual([43, 55, 67, 79, 91].map(visitorForDay), ["merchant", "spirit", "druid", "storm", "merchant"]);
  assert.equal(visitorForDay(44), null);
  assert.equal(nextVisitorDay(1), 7);
  assert.equal(nextVisitorDay(31), 43);
  assert.equal(nextVisitorDay(43), 55);
});

test("town charters offer distinct, explicit tradeoffs", () => {
  assert.deepEqual(policyModifiers("balanced"), { food: 1, mana: 1, craft: 1, joy: 4 });
  assert.equal(policyModifiers("harvest").food, 1.25);
  assert.deepEqual(policyModifiers("arcane"), { food: 1, mana: 1.3, craft: 0.9, joy: 0 });
});

test("building production composes rank, terrain, roads, magic, and wells", () => {
  assert.deepEqual(buildingProduction({ kind: "lumber", level: 1, terrainBonus: true }), { wood: 6, stone: 0, food: 0, mana: 0, glory: 0 });
  assert.equal(buildingProduction({ kind: "quarry", level: 2, terrainBonus: true, linked: true }).stone, 9.375);
  assert.equal(buildingProduction({ kind: "farm", level: 1, enchanted: true, wellRank: 2 }).food, 12);
  assert.equal(buildingProduction({ kind: "cottage", level: 3, morale: 1.1 }).food, -3);
  assert.deepEqual(buildingProduction({ kind: "tower", level: 3 }), { wood: 0, stone: 0, food: 0, mana: 10, glory: 3 });
});

test("day advancement applies income, clamps stores, and handles starvation", () => {
  assert.deepEqual(
    advanceTownDay({ wood: 2, stone: 0, food: 1, mana: 3, folk: 6 }, { wood: 4, stone: 2, food: -3, mana: 1 }),
    { wood: 6, stone: 2, food: 0, mana: 4, folk: 5 },
  );
  assert.equal(advanceTownDay({ wood: 0, stone: 0, food: 0, mana: 0, folk: 2 }, { wood: 0, stone: 0, food: -1, mana: 0 }).folk, 2);
});

test("demolition returns half the materials spent on improvements", () => {
  assert.deepEqual(upgradeSalvage(1), { wood: 0, stone: 0 });
  assert.deepEqual(upgradeSalvage(2), { wood: 6, stone: 4 });
  assert.deepEqual(upgradeSalvage(3), { wood: 18, stone: 12 });
});

test("seasons and harvest policy boost crops without changing cottage upkeep", () => {
  assert.equal(seasonalFoodIncome(10, -3, 0.7), 4);
  assert.equal(seasonalFoodIncome(10, -3, 1.2, 1.25), 12);
  assert.equal(seasonalFoodIncome(0, -3, 1.35, 1.25), -3);
});

test("morale thresholds reward joy and penalize serious unhappiness", () => {
  assert.equal(moraleMultiplier(80), 1.1);
  assert.equal(moraleMultiplier(79), 1);
  assert.equal(moraleMultiplier(45), 1);
  assert.equal(moraleMultiplier(44), 0.8);
});

test("joy respects housing, food, bonuses, and hard bounds", () => {
  assert.equal(calculateJoy({ shrines: 0, markets: 0, wells: 0, roads: 0, food: 20, folk: 4, cottages: 1 }), 66);
  assert.equal(calculateJoy({ shrines: 0, markets: 0, wells: 0, roads: 0, food: 0, folk: 4, cottages: 1 }), 31);
  assert.equal(calculateJoy({ shrines: 8, markets: 8, wells: 8, roads: 20, food: 100, folk: 4, cottages: 1 }), 100);
  assert.equal(calculateJoy({ shrines: 0, markets: 0, wells: 0, roads: 0, food: 0, folk: 30, cottages: 0 }), 20);
});

test("resource clamp prevents negative or fractional stores", () => {
  assert.equal(clampResource(-3), 0);
  assert.equal(clampResource(5.9), 5);
});

test("save validation accepts a real chronicle and rejects damaged data", () => {
  const valid = {
    resources: { wood: 10, stone: 4, food: 12, mana: 2, folk: 4 },
    buildings: [{ id: 1, kind: "farm", x: 4, y: 3, level: 1 }],
    day: 8, renown: 3, chapter: 0, deeds: 1,
  };
  assert.equal(isValidSave(valid), true);
  assert.equal(isValidSave({ ...valid, chapter: 9 }), false);
  assert.equal(isValidSave({ ...valid, day: 0 }), false);
  assert.equal(isValidSave({ ...valid, renown: 2.5 }), false);
  assert.equal(isValidSave({ ...valid, resources: { ...valid.resources, food: -1 } }), false);
  assert.equal(isValidSave({ ...valid, buildings: [{ id: 1, kind: "castle", x: 4, y: 3, level: 1 }] }), false);
  assert.equal(isValidSave({ ...valid, buildings: [{ id: 1, kind: "farm", x: 4, y: 3, level: 1 }, { id: 2, kind: "well", x: 4, y: 3, level: 1 }] }), false);
  assert.equal(isValidSave({ ...valid, speed: 5 }), false);
  assert.equal(isValidSave({ ...valid, earned: ["Wayfinder", 7] }), false);
  assert.equal(isValidSave({ ...valid, earned: ["Wayfinder", "Wayfinder"] }), false);
  assert.equal(isValidSave({ ...valid, earned: ["Dragon Tamer"] }), false);
  assert.equal(isValidSave({ ...valid, history: [{ day: 3, text: "A visitor arrived." }] }), true);
  assert.equal(isValidSave({ ...valid, history: [{ day: "soon", text: "A visitor arrived." }] }), false);
  assert.equal(isValidSave({ ...valid, history: [{ day: 99, text: "A visitor arrived." }] }), false);
  assert.equal(isValidSave({ ...valid, policy: "arcane" }), true);
  assert.equal(isValidSave({ ...valid, policy: "plunder" }), false);
  assert.equal(isValidSave({ ...valid, continued: "yes" }), false);
  assert.equal(isValidSave({ ...valid, buildings: [{ id: 1, kind: "farm", x: 4.5, y: 3, level: 1 }] }), false);
  assert.equal(isValidSave({ ...valid, nextRequestDay: 4 }), true);
  assert.equal(isValidSave({ ...valid, nextRequestDay: -1 }), false);
  assert.equal(isValidSave({ ...valid, nextRequestDay: 99 }), false);
  assert.equal(isValidSave({ ...valid, lastVisitorDay: 7 }), true);
  assert.equal(isValidSave({ ...valid, lastVisitorDay: 2.5 }), false);
  assert.equal(isValidSave({ ...valid, lastVisitorDay: 99 }), false);
  assert.equal(isValidSave("not a chronicle"), false);
});

test("town score rewards renown, joy, deeds, achievements, and efficient play", () => {
  const swift = townScore({ day: 40, renown: 30, joy: 90, achievements: 5, deeds: 3 });
  const slow = townScore({ day: 90, renown: 30, joy: 90, achievements: 5, deeds: 3 });
  assert.ok(swift > slow);
  assert.equal(scoreTitle(1499), "Hearthlit Hamlet");
  assert.equal(scoreTitle(1500), "Blooming Borough");
  assert.equal(scoreTitle(2200), "Storied Sanctuary");
  assert.equal(scoreTitle(3000), "Mythic Haven");
  assert.equal(
    townScore({ day: 90, renown: 0, joy: 0, achievements: 0, deeds: 8 }),
    townScore({ day: 90, renown: 0, joy: 0, achievements: 0, deeds: 80 }),
  );
});

test("town requests expose a clear four-day recovery window", () => {
  assert.equal(requestWaitDays(12, 16), 4);
  assert.equal(requestWaitDays(16, 16), 0);
  assert.equal(requestWaitDays(20, 16), 0);
});

test("storm bargains scale down when the town cannot pay the full cost", () => {
  assert.deepEqual(proportionalTrade(18, 18, 28), { spent: 18, received: 28 });
  assert.deepEqual(proportionalTrade(9, 18, 28), { spent: 9, received: 14 });
  assert.deepEqual(proportionalTrade(0, 18, 28), { spent: 0, received: 0 });
  assert.deepEqual(proportionalTrade(10, 0, 28), { spent: 0, received: 0 });
});
