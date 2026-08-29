import { ANOMALY_CATALOG, type DiscoveredAnomalyType } from './anomalies';
import {
  ARTIFACTS_BY_RARITY,
  sumArtifactEffects,
  type ArtifactDef,
  type ArtifactRarity,
} from './artifacts';
import type { BuildingId, ResourceId } from './constants';
import { createActionRng, rngInt, rngPick, weightedPick } from './rng';
import type { BuildingState, CivilizationFocuses } from './types';
import { getBuildingLevel } from './formulas';

export type ExpeditionTypeId =
  | 'localScan'
  | 'probeSurvey'
  | 'deepExpedition'
  | 'rift4D';

export type ExpeditionOutcomeType =
  | 'empty'
  | 'resource'
  | 'anomaly'
  | 'artifact'
  | 'trap'
  | 'weak_signal'
  | 'strong_signal'
  | 'false_signal'
  | 'signalDetected'
  | 'ancient_traces'
  | 'ship_debris'
  | 'tech_boost'
  | 'dead_civ_knowledge'
  | 'paradox'
  | 'massive_resources'
  | 'rift_collapse';

export interface ExpeditionTypeDef {
  id: ExpeditionTypeId;
  nameRu: string;
  descriptionRu: string;
  minCivLevel: number;
  requiredBuildings: Array<{ id: BuildingId; level: number }>;
  /** Base duration range seconds before modifiers. */
  durationMin: number;
  durationMax: number;
  requires4DAccess: boolean;
}

export const EXPEDITION_TYPES: Record<ExpeditionTypeId, ExpeditionTypeDef> = {
  localScan: {
    id: 'localScan',
    nameRu: 'Локальное сканирование',
    descriptionRu:
      'Быстрое сканирование ближайшего окружения системы. Дёшево и безопасно.',
    minCivLevel: 1,
    requiredBuildings: [],
    durationMin: 30,
    durationMax: 90,
    requires4DAccess: false,
  },
  probeSurvey: {
    id: 'probeSurvey',
    nameRu: 'Зондовая разведка',
    descriptionRu: 'Зонд в соседний сектор. Основной источник непокупаемых ресурсов.',
    minCivLevel: 5,
    requiredBuildings: [{ id: 'probe_factory', level: 1 }],
    durationMin: 180,
    durationMax: 600,
    requires4DAccess: false,
  },
  deepExpedition: {
    id: 'deepExpedition',
    nameRu: 'Глубокая экспедиция',
    descriptionRu:
      'Дальний сектор. Высокий риск, артефакты, аномалии, возможный 4D-разлом.',
    minCivLevel: 15,
    requiredBuildings: [
      { id: 'probe_factory', level: 3 },
      { id: 'research_node', level: 2 },
    ],
    durationMin: 900,
    durationMax: 3600,
    requires4DAccess: false,
  },
  rift4D: {
    id: 'rift4D',
    nameRu: 'Экспедиция в 4D-разлом',
    descriptionRu:
      'Специализированный вход в четырёхмерную структуру. Экстремальный риск и награда.',
    minCivLevel: 25,
    requiredBuildings: [{ id: 'dark_sensor', level: 3 }],
    durationMin: 1800,
    durationMax: 7200,
    requires4DAccess: true,
  },
};

export const EXPEDITION_TYPE_ORDER: ExpeditionTypeId[] = [
  'localScan',
  'probeSurvey',
  'deepExpedition',
  'rift4D',
];

export interface ExpeditionCost {
  highEnergy: number;
  antimatter: number;
  darkEnergy: number;
  darkMatter: number;
  fermions: number;
}

export interface ArtifactInstanceView {
  artifactKey: string;
}

export interface AnomalyInstanceView {
  anomalyType: string;
}

export interface RadarContext {
  baseRadar: number;
  buildings: BuildingState[];
  artifactKeys: string[];
  anomalyTypes: DiscoveredAnomalyType[];
}

export function darkSensorRadarBonus(buildings: BuildingState[]): number {
  const lvl = getBuildingLevel(buildings, 'dark_sensor');
  return lvl * 5;
}

export function anomalyRadarBonus(types: DiscoveredAnomalyType[]): number {
  return types.reduce((s, t) => s + (ANOMALY_CATALOG[t]?.radarBonus ?? 0), 0);
}

export function effectiveRadar(ctx: RadarContext): number {
  const arts = sumArtifactEffects(ctx.artifactKeys);
  const raw =
    ctx.baseRadar +
    darkSensorRadarBonus(ctx.buildings) +
    (arts.radarBonus ?? 0) +
    anomalyRadarBonus(ctx.anomalyTypes);
  return Math.max(1, Math.min(200, Math.floor(raw)));
}

/** Architectural note: high radar increases detectability for Stage 4. */
export function signalExposureFromRadar(effRadar: number): number {
  return Math.min(100, Math.floor(effRadar * 0.35));
}

export function expeditionCost(
  type: ExpeditionTypeId,
  civLevel: number,
  artifactKeys: string[] = []
): ExpeditionCost {
  const arts = sumArtifactEffects(artifactKeys);
  const L = Math.max(1, civLevel);
  let he = 0;
  let am = 0;
  let de = 0;
  let dm = 0;
  let fm = 0;

  switch (type) {
    case 'localScan':
      he = Math.floor(50 * (1 + 0.1 * L));
      he = Math.floor(he * (1 - Math.min(0.5, arts.localScanCostReduction ?? 0)));
      break;
    case 'probeSurvey':
      he = Math.floor(200 * (1 + 0.15 * L));
      fm = 50;
      break;
    case 'deepExpedition':
      he = Math.floor(500 * (1 + 0.2 * L));
      am = 100;
      fm = 150;
      break;
    case 'rift4D':
      he = 2000;
      de = 500;
      dm = 300;
      break;
  }

  return {
    highEnergy: Math.max(1, he),
    antimatter: Math.max(0, am),
    darkEnergy: Math.max(0, de),
    darkMatter: Math.max(0, dm),
    fermions: Math.max(0, fm),
  };
}

export function expeditionDurationSec(
  type: ExpeditionTypeId,
  civLevel: number,
  effRadar: number,
  artifactKeys: string[],
  anomalyTypes: DiscoveredAnomalyType[],
  seed: string,
  nonce: number,
  physicsDurationMul = 1
): number {
  const def = EXPEDITION_TYPES[type];
  const rng = createActionRng(seed, `duration:${type}`, nonce);
  const base = rngInt(rng, def.durationMin, def.durationMax);
  const arts = sumArtifactEffects(artifactKeys);

  let speedBonus = arts.allExpeditionDurationReduction ?? 0;
  if (type === 'probeSurvey') {
    speedBonus += arts.probeDurationReduction ?? 0;
  }
  // radar shortens slightly
  const radarDurationReduction = Math.min(0.25, effRadar * 0.0015);
  // anomaly duration muls (average if several)
  let anomalyMul = 1;
  if (anomalyTypes.length > 0) {
    anomalyMul =
      anomalyTypes.reduce(
        (s, t) => s * (ANOMALY_CATALOG[t]?.expeditionDurationMul ?? 1),
        1
      ) **
      (1 / anomalyTypes.length);
  }

  let duration =
    base *
    (1 - Math.min(0.6, speedBonus)) *
    (1 - radarDurationReduction) *
    anomalyMul *
    Math.max(0.4, physicsDurationMul);
  // slight level expertise
  duration *= 1 - Math.min(0.1, civLevel * 0.002);
  const minDur = Math.floor(base * 0.35);
  return Math.max(minDur, Math.floor(duration));
}

export interface UnlockCheck {
  ok: boolean;
  reasons: string[];
}

export function canStartExpeditionType(
  type: ExpeditionTypeId,
  civLevel: number,
  buildings: BuildingState[],
  has4DRiftAccess: boolean,
  artifactKeys: string[] = []
): UnlockCheck {
  const def = EXPEDITION_TYPES[type];
  const reasons: string[] = [];
  if (civLevel < def.minCivLevel) {
    reasons.push(`Требуется уровень цивилизации ${def.minCivLevel}`);
  }
  for (const req of def.requiredBuildings) {
    const lvl = getBuildingLevel(buildings, req.id);
    if (lvl < req.level) {
      reasons.push(`Требуется здание «${req.id}» ур. ${req.level}+ (сейчас ${lvl})`);
    }
  }
  const arts = sumArtifactEffects(artifactKeys);
  const access4d = has4DRiftAccess || !!arts.unlock4DRift;
  if (def.requires4DAccess && !access4d) {
    reasons.push('Требуется обнаруженный 4D-разлом (или мистический артефакт)');
  }
  return { ok: reasons.length === 0, reasons };
}

interface OutcomeWeight {
  type: ExpeditionOutcomeType;
  weight: number;
  /** Preferred resource when type=resource */
  resourceHint?: ResourceId;
  /** Force anomaly type */
  anomalyHint?: DiscoveredAnomalyType;
}

function baseOutcomes(type: ExpeditionTypeId): OutcomeWeight[] {
  switch (type) {
    case 'localScan':
      return [
        { type: 'empty', weight: 40 },
        { type: 'resource', weight: 25, resourceHint: 'highEnergy' },
        { type: 'resource', weight: 10, resourceHint: 'fermions' },
        { type: 'anomaly', weight: 10, anomalyHint: 'asteroid_belt' },
        { type: 'anomaly', weight: 5, anomalyHint: 'relic_radiation' },
        { type: 'weak_signal', weight: 5 },
        { type: 'trap', weight: 3 },
        { type: 'artifact', weight: 2 },
      ];
    case 'probeSurvey':
      return [
        { type: 'empty', weight: 20 },
        { type: 'resource', weight: 16, resourceHint: 'antimatter' },
        { type: 'resource', weight: 11, resourceHint: 'darkMatter' },
        { type: 'resource', weight: 9, resourceHint: 'darkEnergy' },
        { type: 'resource', weight: 7, resourceHint: 'fermions' },
        { type: 'resource', weight: 5, resourceHint: 'highEnergy' },
        { type: 'anomaly', weight: 8 },
        { type: 'ancient_traces', weight: 5 },
        { type: 'ship_debris', weight: 4 },
        { type: 'artifact', weight: 4 },
        { type: 'trap', weight: 5 },
        { type: 'signalDetected', weight: 5 },
        { type: 'false_signal', weight: 1 },
      ];
    case 'deepExpedition':
      return [
        { type: 'empty', weight: 10 },
        { type: 'resource', weight: 12, resourceHint: 'antimatter' },
        { type: 'resource', weight: 11, resourceHint: 'darkEnergy' },
        { type: 'resource', weight: 11, resourceHint: 'darkMatter' },
        { type: 'resource', weight: 7, resourceHint: 'fermions' },
        { type: 'resource', weight: 5, resourceHint: 'highEnergy' },
        { type: 'anomaly', weight: 9 },
        { type: 'artifact', weight: 8 },
        { type: 'ancient_traces', weight: 5 },
        { type: 'trap', weight: 7 },
        { type: 'signalDetected', weight: 12 },
        { type: 'false_signal', weight: 2 },
        { type: 'anomaly', weight: 2, anomalyHint: 'rift_4d' },
      ];
    case 'rift4D':
      return [
        { type: 'rift_collapse', weight: 14 },
        { type: 'tech_boost', weight: 12 },
        { type: 'artifact', weight: 14 },
        { type: 'dead_civ_knowledge', weight: 10 },
        { type: 'massive_resources', weight: 14 },
        { type: 'trap', weight: 10 },
        { type: 'paradox', weight: 6 },
        { type: 'signalDetected', weight: 20 },
        { type: 'empty', weight: 4 },
      ];
  }
}

function modifyWeights(
  outcomes: OutcomeWeight[],
  effRadar: number,
  civLevel: number,
  expeditionType: ExpeditionTypeId,
  anomalyTypes: DiscoveredAnomalyType[]
): OutcomeWeight[] {
  const trapMulAnom =
    anomalyTypes.reduce((m, t) => m * (ANOMALY_CATALOG[t]?.trapRiskMul ?? 1), 1) || 1;

  return outcomes.map((o) => {
    let w = o.weight;
    switch (o.type) {
      case 'empty':
      case 'rift_collapse':
        w *= Math.max(0.25, 1 - effRadar / 250);
        break;
      case 'resource':
      case 'massive_resources':
        w *= 1 + effRadar / 120 + civLevel / 200;
        break;
      case 'artifact':
        w *= 1 + effRadar / 100 + civLevel / 180;
        if (expeditionType === 'rift4D') w *= 1.3;
        break;
      case 'anomaly':
        w *= 1 + effRadar / 150;
        if (o.anomalyHint === 'rift_4d') {
          w *= 1 + civLevel * 0.005;
        }
        break;
      case 'trap':
        w *= Math.max(0.2, 1 - effRadar * 0.005) * trapMulAnom;
        break;
      case 'weak_signal':
      case 'strong_signal':
      case 'signalDetected':
        w *= 1 + effRadar / 140 + civLevel / 200;
        break;
      case 'tech_boost':
      case 'dead_civ_knowledge':
      case 'paradox':
        w *= 1 + civLevel / 150;
        break;
      default:
        break;
    }
    return { ...o, weight: Math.max(0.05, w) };
  });
}

const DEEP_ANOMALY_POOL: DiscoveredAnomalyType[] = [
  'dark_cloud',
  'wormhole',
  'neutron_star',
  'black_hole',
  'relic_radiation',
  'gravitational_lens',
  'unstable_vacuum',
  'asteroid_belt',
];

const RARITY_WEIGHTS: Array<{ rarity: ArtifactRarity; weight: number }> = [
  { rarity: 'common', weight: 55 },
  { rarity: 'rare', weight: 30 },
  { rarity: 'legendary', weight: 12 },
  { rarity: 'mythic', weight: 3 },
];

function pickRarity(
  rng: () => number,
  expeditionType: ExpeditionTypeId,
  effRadar: number
): ArtifactRarity {
  let weights = RARITY_WEIGHTS.map((r) => {
    let w = r.weight;
    if (expeditionType === 'localScan' && r.rarity !== 'common') w *= 0.15;
    if (expeditionType === 'probeSurvey' && r.rarity === 'mythic') w *= 0.25;
    if (expeditionType === 'probeSurvey' && r.rarity === 'legendary') w *= 0.5;
    if (expeditionType === 'deepExpedition' && r.rarity === 'legendary') w *= 1.4;
    if (expeditionType === 'deepExpedition' && r.rarity === 'mythic') w *= 1.2;
    if (expeditionType === 'rift4D' && r.rarity === 'mythic') w *= 4;
    if (expeditionType === 'rift4D' && r.rarity === 'legendary') w *= 2;
    if (r.rarity === 'rare' || r.rarity === 'legendary') w *= 1 + effRadar / 200;
    return w;
  });
  const idx = weightedPick(rng, weights);
  return RARITY_WEIGHTS[idx]!.rarity;
}

function pickArtifact(rng: () => number, rarity: ArtifactRarity): ArtifactDef {
  const pool = ARTIFACTS_BY_RARITY[rarity];
  return rngPick(rng, pool);
}

function resourceAmount(
  rng: () => number,
  expeditionType: ExpeditionTypeId,
  resource: ResourceId,
  civLevel: number,
  effRadar: number,
  focuses: CivilizationFocuses,
  massive = false
): number {
  const typeMul: Record<ExpeditionTypeId, number> = {
    localScan: 1,
    probeSurvey: 2.2,
    deepExpedition: 4.5,
    rift4D: 8,
  };
  const resMul: Record<ResourceId, number> = {
    highEnergy: 1.2,
    antimatter: 0.7,
    darkEnergy: 0.65,
    darkMatter: 0.65,
    fermions: 0.9,
  };
  const base = 20 + civLevel * 3 + rngInt(rng, 0, 40);
  let amount = base * typeMul[expeditionType] * resMul[resource];
  amount *= 1 + effRadar / 100;
  amount *= 1 + focuses.scienceFocus / 400 + focuses.expansionFocus / 500;
  if (massive) amount *= 3.5 + rng() * 2;
  return Math.max(1, Math.floor(amount));
}

function trapLoss(
  rng: () => number,
  expeditionType: ExpeditionTypeId,
  civLevel: number
): Partial<Record<ResourceId, number>> {
  const base = 15 + civLevel * 2 + rngInt(rng, 0, 40);
  const mul =
    expeditionType === 'localScan'
      ? 0.6
      : expeditionType === 'probeSurvey'
        ? 1
        : expeditionType === 'deepExpedition'
          ? 1.8
          : 2.5;
  const he = Math.floor(base * mul);
  const out: Partial<Record<ResourceId, number>> = { highEnergy: he };
  if (expeditionType === 'deepExpedition' || expeditionType === 'rift4D') {
    if (rng() < 0.5) out.antimatter = Math.floor(he * 0.3);
    if (rng() < 0.4) out.fermions = Math.floor(he * 0.25);
  }
  if (expeditionType === 'rift4D') {
    if (rng() < 0.4) out.darkEnergy = Math.floor(30 + rng() * 80);
    if (rng() < 0.4) out.darkMatter = Math.floor(20 + rng() * 60);
  }
  return out;
}

function sectorCode(rng: () => number): string {
  const greek = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'λ', 'μ', 'ξ', 'π', 'σ', 'τ', 'φ', 'ψ', 'ω'];
  return `${rngPick(rng, greek)}-${rngInt(rng, 100, 9999)}`;
}

export interface ExpeditionRewardResources {
  highEnergy?: number;
  antimatter?: number;
  darkEnergy?: number;
  darkMatter?: number;
  fermions?: number;
}

export interface ExpeditionResolutionV2 {
  outcomeType: ExpeditionOutcomeType;
  title: string;
  body: string;
  journalStyle:
    | 'normal'
    | 'artifact'
    | 'trap'
    | 'rift'
    | 'signal'
    | 'boost'
    | 'paradox';
  resourcesGained: ExpeditionRewardResources;
  resourcesLost: ExpeditionRewardResources;
  artifactKey?: string;
  artifactRarity?: ArtifactRarity;
  anomalyType?: DiscoveredAnomalyType;
  anomalyName?: string;
  grants4DAccess?: boolean;
  buildingLevelsGained?: number;
  civLevelsGained?: number;
  sectorCode: string;
  distanceLy?: number;
  confidence?: number;
  /** Stage 4: create Contact record on server */
  createContact?: boolean;
}

export function resolveExpeditionV2(params: {
  civSeed: string;
  nonce: number;
  expeditionType: ExpeditionTypeId;
  civLevel: number;
  focuses: CivilizationFocuses;
  buildings: BuildingState[];
  baseRadar: number;
  artifactKeys: string[];
  anomalyTypes: DiscoveredAnomalyType[];
  expeditionId: string;
}): ExpeditionResolutionV2 {
  const {
    civSeed,
    nonce,
    expeditionType,
    civLevel,
    focuses,
    buildings,
    baseRadar,
    artifactKeys,
    anomalyTypes,
    expeditionId,
  } = params;

  const rng = createActionRng(civSeed, `expedition_v2:${expeditionType}:${expeditionId}`, nonce);
  const effRadar = effectiveRadar({
    baseRadar,
    buildings,
    artifactKeys,
    anomalyTypes,
  });
  const sector = sectorCode(rng);

  const outcomes = modifyWeights(
    baseOutcomes(expeditionType),
    effRadar,
    civLevel,
    expeditionType,
    anomalyTypes
  );
  const idx = weightedPick(
    rng,
    outcomes.map((o) => o.weight)
  );
  const chosen = outcomes[idx]!;

  const baseReport = {
    resourcesGained: {} as ExpeditionRewardResources,
    resourcesLost: {} as ExpeditionRewardResources,
    sectorCode: sector,
  };

  switch (chosen.type) {
    case 'empty':
      return {
        ...baseReport,
        outcomeType: 'empty',
        journalStyle: 'normal',
        title: 'Экспедиция: пустой сектор',
        body:
          `${EXPEDITION_TYPES[expeditionType].nameRu} сектора ${sector} завершена. ` +
          `Сектор пуст. Следов активности не обнаружено. Фоновое излучение в пределах нормы. ` +
          `Радар/Локация (эфф.): ${effRadar}.`,
      };

    case 'rift_collapse':
      return {
        ...baseReport,
        outcomeType: 'rift_collapse',
        journalStyle: 'rift',
        title: '4D: схлопывание',
        body:
          `Экспедиция в 4D-разлом (${sector}): структура оказалась метастабильной и схлопнулась. ` +
          `Значимых артефактов не извлечено. Энергетический бюджет израсходован впустую.`,
      };

    case 'resource':
    case 'massive_resources': {
      const massive = chosen.type === 'massive_resources';
      const resourcePool: ResourceId[] =
        expeditionType === 'localScan'
          ? ['highEnergy', 'fermions']
          : ['highEnergy', 'antimatter', 'darkEnergy', 'darkMatter', 'fermions'];
      const res =
        chosen.resourceHint && resourcePool.includes(chosen.resourceHint)
          ? chosen.resourceHint
          : rngPick(rng, resourcePool);
      const amount = resourceAmount(
        rng,
        expeditionType,
        res,
        civLevel,
        effRadar,
        focuses,
        massive
      );
      const labels: Record<ResourceId, string> = {
        highEnergy: 'Высоких энергий',
        antimatter: 'Антиматерии',
        darkEnergy: 'Тёмной энергии',
        darkMatter: 'Тёмной материи',
        fermions: 'Фермионов',
      };
      const gained = { [res]: amount } as ExpeditionRewardResources;
      return {
        ...baseReport,
        outcomeType: chosen.type,
        journalStyle: 'normal',
        title: massive ? 'Экспедиция: массивные ресурсы' : 'Экспедиция: ресурсы',
        body:
          `${EXPEDITION_TYPES[expeditionType].nameRu} сектора ${sector} завершена. ` +
          `Обнаружены залежи. Извлечено: ${amount} ед. ${labels[res]}. ` +
          `Качество: ${massive ? 'аномально высокое' : 'стандартное'}. ` +
          `Модификатор радара: +${(effRadar / 10).toFixed(1)}%.`,
        resourcesGained: gained,
      };
    }

    case 'anomaly': {
      let aType: DiscoveredAnomalyType =
        chosen.anomalyHint ??
        (expeditionType === 'localScan'
          ? rngPick(rng, ['asteroid_belt', 'relic_radiation', 'dark_cloud'] as DiscoveredAnomalyType[])
          : rngPick(rng, DEEP_ANOMALY_POOL));
      // very rare forced 4d in deep if not hinted but roll already picked rift weight
      if (aType === 'rift_4d' || (expeditionType === 'deepExpedition' && rng() < 0.002 * (1 + civLevel * 0.005))) {
        aType = 'rift_4d';
      }
      const def = ANOMALY_CATALOG[aType];
      const isRift = aType === 'rift_4d';
      return {
        ...baseReport,
        outcomeType: 'anomaly',
        journalStyle: isRift ? 'rift' : 'normal',
        title: isRift ? 'АНОМАЛИЯ ВЫСШЕГО ПРИОРИТЕТА' : `Аномалия: ${def.nameRu}`,
        body: isRift
          ? `В секторе ${sector} зафиксирован разрыв пространственной ткани. ` +
            `Предварительный анализ указывает на четырёхмерную структуру. ` +
            `Стабильность разлома: ${rngInt(rng, 18, 67)}%. Рекомендуется специализированная экспедиция.`
          : `${EXPEDITION_TYPES[expeditionType].nameRu}: в секторе ${sector} идентифицирована аномалия «${def.nameRu}». ` +
            `${def.descriptionRu} Объект каталогизирован.`,
        anomalyType: aType,
        anomalyName: def.nameRu,
        grants4DAccess: isRift,
      };
    }

    case 'artifact':
    case 'ship_debris': {
      const rarity =
        chosen.type === 'ship_debris' ? ('common' as ArtifactRarity) : pickRarity(rng, expeditionType, effRadar);
      const art = pickArtifact(rng, rarity);
      return {
        ...baseReport,
        outcomeType: chosen.type === 'ship_debris' ? 'ship_debris' : 'artifact',
        journalStyle: 'artifact',
        title: 'ВНИМАНИЕ: артефакт',
        body:
          `${EXPEDITION_TYPES[expeditionType].nameRu} сектора ${sector} обнаружила объект неизвестного происхождения. ` +
          `Классификация: ${rarityLabel(rarity)} артефакт. Идентификатор: ${art.nameRu}. ` +
          `${art.descriptionRu} Объект помещён в хранилище.`,
        artifactKey: art.key,
        artifactRarity: rarity,
      };
    }

    case 'trap': {
      const lost = trapLoss(rng, expeditionType, civLevel);
      const lostStr = Object.entries(lost)
        .map(([k, v]) => `${v} ${k}`)
        .join(', ');
      return {
        ...baseReport,
        outcomeType: 'trap',
        journalStyle: 'trap',
        title: 'ПРЕДУПРЕЖДЕНИЕ: ловушка',
        body:
          `Зонд в секторе ${sector} попал в зону гравитационной/информационной нестабильности. ` +
          `Частичная потеря груза. Утрачено: ${lostStr}. Зонд повреждён, но функционален.`,
        resourcesLost: lost,
      };
    }

    case 'signalDetected':
    case 'weak_signal':
    case 'strong_signal': {
      // Stage 4: formal contact creation (server generates full Contact params)
      return {
        ...baseReport,
        outcomeType: 'signalDetected',
        journalStyle: 'signal',
        title: 'КОНФИДЕНЦИАЛЬНО: организованный сигнал',
        body:
          `${EXPEDITION_TYPES[expeditionType].nameRu} сектора ${sector}: зафиксирован организованный сигнал. ` +
          `Каталогизация контакта выполняется сервером. Статус объекта: Терра Инкогнита.`,
        createContact: true,
      };
    }

    case 'false_signal': {
      const dist = rngInt(rng, 120, 9800);
      const conf = rngInt(rng, 8, 28);
      return {
        ...baseReport,
        outcomeType: 'false_signal',
        journalStyle: 'signal',
        title: 'КОНФИДЕНЦИАЛЬНО: сигнал (низкая когерентность)',
        body:
          `Детектор зафиксировал сигнал на ~${dist} св. лет. Достоверность: ${conf}%. ` +
          `Характер близок к природной имитации, но объект каталогизирован как контакт.`,
        distanceLy: dist,
        confidence: conf,
        // Still create contact — marked false-positive inside generateContactParameters roll
        createContact: true,
      };
    }

    case 'ancient_traces':
      return {
        ...baseReport,
        outcomeType: 'ancient_traces',
        journalStyle: 'normal',
        title: 'Следы древней цивилизации',
        body:
          `В секторе ${sector} обнаружены эрозионные следы техногенной активности. ` +
          `Возраст оценки: ${rngInt(rng, 50, 900)} млн лет. Полезной нагрузки мало, но данные архивированы. ` +
          `Извлечено фрагментарных фермионов: ${resourceAmount(rng, expeditionType, 'fermions', civLevel, effRadar, focuses)}.`,
        resourcesGained: {
          fermions: resourceAmount(rng, expeditionType, 'fermions', civLevel, effRadar, focuses),
        },
      };

    case 'tech_boost': {
      const bGain = rngInt(rng, 1, 2);
      const cGain = rng() < 0.35 ? 1 : 0;
      return {
        ...baseReport,
        outcomeType: 'tech_boost',
        journalStyle: 'boost',
        title: '4D: технологический буст',
        body:
          `Контакт с 4D-структурой (${sector}) дал нелокальный информационный пакет. ` +
          `Автокалибровка построек: +${bGain} ур. к ключевым узлам` +
          (cGain ? `, цивилизация +${cGain} ур.` : '') +
          `.`,
        buildingLevelsGained: bGain,
        civLevelsGained: cGain,
      };
    }

    case 'dead_civ_knowledge':
      return {
        ...baseReport,
        outcomeType: 'dead_civ_knowledge',
        journalStyle: 'boost',
        title: 'Знания опустевшей цивилизации',
        body:
          `В 4D-кармане ${sector} считан архив исчезнувшей цивилизации. ` +
          `Часть данных непереводима. Разблокированы заготовки будущих технологий (метаданные). ` +
          `Побочный выход ТЭ/ТМ каталогизирован.`,
        resourcesGained: {
          darkEnergy: resourceAmount(rng, 'rift4D', 'darkEnergy', civLevel, effRadar, focuses),
          darkMatter: resourceAmount(rng, 'rift4D', 'darkMatter', civLevel, effRadar, focuses),
        },
      };

    case 'paradox':
      return {
        ...baseReport,
        outcomeType: 'paradox',
        journalStyle: 'paradox',
        title: 'ПАРАДОКС',
        body:
          `Событие в ${sector} не согласуется с локальной причинностью. ` +
          `Телеметрия содержит замкнутые временны́е петли. Отложенный эффект зарегистрирован. ` +
          `Рекомендация: не повышать светимость радара до анализа (Этап 4+).`,
        resourcesGained: {
          highEnergy: rngInt(rng, 0, 200),
          darkEnergy: rngInt(rng, 0, 80),
        },
      };

    default:
      return {
        ...baseReport,
        outcomeType: 'empty',
        journalStyle: 'normal',
        title: 'Экспедиция: сбой классификации',
        body: `Данные сектора ${sector} повреждены. Повторный анализ рекомендован.`,
      };
  }
}

function rarityLabel(r: ArtifactRarity): string {
  switch (r) {
    case 'common':
      return 'Обычный';
    case 'rare':
      return 'Редкий';
    case 'legendary':
      return 'Легендарный';
    case 'mythic':
      return 'Мистический';
  }
}

export function passiveProductionFromAnomalies(
  types: DiscoveredAnomalyType[]
): Record<ResourceId, number> {
  const out: Record<ResourceId, number> = {
    highEnergy: 0,
    antimatter: 0,
    darkEnergy: 0,
    darkMatter: 0,
    fermions: 0,
  };
  for (const t of types) {
    const d = ANOMALY_CATALOG[t];
    if (!d) continue;
    out.highEnergy += d.passiveHePerSec;
    out.antimatter += d.passiveAntimatterPerSec;
    out.darkEnergy += d.passiveDarkEnergyPerSec;
    out.darkMatter += d.passiveDarkMatterPerSec;
    out.fermions += d.passiveFermionsPerSec;
  }
  return out;
}
