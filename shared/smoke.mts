import {
  generateSeed,
  generateWorld,
  DEFAULT_FOCUSES,
  resolveExpedition,
  highEnergyPerSecond,
  buildingUpgradeCost,
  civilizationLevelCostHe,
  applyProductionTick,
  BUILDING_ORDER,
} from './src/index.ts';
import { BASE_CAPACITY } from './src/balance.ts';

const seed = generateSeed('test');
const world = generateWorld(seed, DEFAULT_FOCUSES);
console.log('seed', seed);
console.log('world', world.galaxyName, world.systemName, 'radar', world.radarQuality, 'anomaly', world.anomalyType);
const buildings = BUILDING_ORDER.map((buildingType) => ({
  buildingType,
  level: buildingType === 'high_energy_collider' ? 1 : 0,
}));
const civ = {
  id: 'x', name: 'Test', seed, level: 1, prosperityScore: 100,
  focuses: DEFAULT_FOCUSES, world, createdAt: new Date().toISOString(),
};
const rate = highEnergyPerSecond(buildings, 1, DEFAULT_FOCUSES);
console.log('HE/s', rate);
console.log('upgrade collider L1->', buildingUpgradeCost('high_energy_collider', 1));
console.log('level 1->2 cost', civilizationLevelCostHe(1));
const resources = {
  highEnergy: 40, antimatter: 0, darkEnergy: 0, darkMatter: 0, fermions: 0,
  highEnergyCapacity: BASE_CAPACITY.highEnergy,
  antimatterCapacity: 100, darkEnergyCapacity: 100, darkMatterCapacity: 100, fermionsCapacity: 50,
};
const tick = applyProductionTick(resources, buildings, civ as any, 10);
console.log('after 10s HE', tick.resources.highEnergy.toFixed(3), 'mined', tick.minedHe.toFixed(3));
const kinds = new Set();
for (let i = 1; i <= 30; i++) {
  const r = resolveExpedition(seed, i, civ as any, buildings);
  kinds.add(r.kind);
}
console.log('expedition kinds seen', [...kinds].join(', '));
const a = resolveExpedition(seed, 7, civ as any, buildings);
const b = resolveExpedition(seed, 7, civ as any, buildings);
console.log('deterministic', a.kind === b.kind && a.body === b.body);
console.log('OK');
