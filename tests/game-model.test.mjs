import test from "node:test";
import assert from "node:assert/strict";
import { calculateJoy, canAfford, clampResource, isValidSave, moraleMultiplier, roadMultiplier, scoreTitle, townScore } from "../app/game-model.ts";

test("affordability checks every requested resource", () => {
  assert.equal(canAfford({ wood: 20, stone: 5 }, { wood: 16, stone: 5 }), true);
  assert.equal(canAfford({ wood: 20, stone: 4 }, { wood: 16, stone: 5 }), false);
  assert.equal(canAfford({ wood: 20 }, { mana: 1 }), false);
});

test("roads grant exactly a 25 percent production multiplier", () => {
  assert.equal(roadMultiplier(false), 1);
  assert.equal(roadMultiplier(true), 1.25);
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
  assert.equal(isValidSave({ ...valid, resources: { ...valid.resources, food: -1 } }), false);
  assert.equal(isValidSave({ ...valid, buildings: [{ id: 1, kind: "castle", x: 4, y: 3, level: 1 }] }), false);
  assert.equal(isValidSave({ ...valid, speed: 5 }), false);
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
});
