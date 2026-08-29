import type { AnomalyType, Habitability, StarType } from './types';
import type { BuildingId, FocusKey, ResourceId } from './constants';
import type { ArtifactRarity } from './artifacts';
import type { ExpeditionTypeId } from './expeditions';
import type { ContactStatus, SignalType } from './contacts';

export interface GameContact {
  id: string;
  distance: number;
  distanceNoise: number;
  levelMin: number;
  levelMax: number;
  confidence: number;
  signalType: SignalType | string;
  coordinates: { x: number; y: number; z: number };
  coordinatesAccuracy: number;
  galaxyName: string | null;
  sectorName: string | null;
  systemName: string | null;
  status: ContactStatus | string;
  firstDetectedAt: string;
  lastUpdated: string;
  displayName: string;
  isRealPlayer: boolean;
  fuzzy: boolean;
  /** Stage 5 diplomatic thread if opened */
  threadId: string | null;
  trust: number | null;
  tension: number | null;
  threadStatus: string | null;
  /** Stage 6 */
  isDestroyed: boolean;
  defenseStatus: string | null;
  /** Fuzzy recon estimate — never exact hidden stats */
  structureEstimate: Partial<
    Record<'mainCore' | 'defenseMatrix' | 'fleetStrength' | 'sensorGrid' | 'shieldCapacity', string>
  > | null;
  reconLevel: number;
}

export interface GameDiplomacyMessage {
  id: string;
  senderIsObserver: boolean;
  cardType: string;
  cardLabel: string;
  textFlavor: string;
  sentAt: string;
  deliverAt: string;
  status: string;
  /** Seconds remaining if IN_TRANSIT (client hint; server authoritative). */
  etaSeconds: number;
}

export interface GameDiplomacyThread {
  id: string;
  contactId: string;
  status: string;
  trust: number;
  tension: number;
  contact: GameContact;
  messages: GameDiplomacyMessage[];
  availableCards: Array<{
    type: string;
    name: string;
    description: string;
    cost: { highEnergy: number; antimatter: number; darkMatter: number };
    unlocked: boolean;
    reasons: string[];
    canEncrypt: boolean;
  }>;
  serverTime: string;
}

export interface GameCombatAction {
  id: string;
  attackType: string;
  attackLabel: string;
  targetContactId: string | null;
  targetName: string | null;
  status: string;
  statusLabel: string;
  outcome: string | null;
  outcomeLabel: string | null;
  prepStartedAt: string;
  prepFinishesAt: string;
  transitFinishesAt: string | null;
  resolvedAt: string | null;
  damageDealt: number | null;
  damageTaken: number | null;
  etaSeconds: number;
  phase: 'prep' | 'transit' | 'done';
  targetCoordinates: { x: number; y: number; z: number } | null;
  flavorText: string | null;
}

export interface GameCombatReport {
  id: string;
  combatActionId: string;
  attackType: string;
  attackLabel: string;
  outcome: string;
  outcomeLabel: string;
  hitChance: number;
  attackPower: number;
  defensePower: number;
  damageDealt: number;
  damageTaken: number;
  flavorText: string;
  createdAt: string;
  targetName: string | null;
}

export interface GameArtifact {
  id: string;
  artifactKey: string;
  name: string;
  rarity: ArtifactRarity | string;
  description: string;
  effects: Record<string, unknown>;
  createdAt: string;
}

export interface GameAnomaly {
  id: string;
  anomalyType: string;
  name: string;
  description: string;
  effects: Record<string, unknown>;
  sectorSeed: string;
  createdAt: string;
}

export interface GameExpeditionInfo {
  active: boolean;
  type: string | null;
  expeditionType: ExpeditionTypeId | string | null;
  status: string | null;
  startedAt: string | null;
  finishesAt: string | null;
  outcomeType?: string | null;
}

/** Server-authoritative game snapshot returned by API. */
export interface GameState {
  civilization: {
    id: string;
    name: string;
    seed: string;
    level: number;
    prosperityScore: number;
    isDestroyed: boolean;
    /** Stage 8 active physics law ids */
    physicsLaws: string[];
    isInterstellarTraveling: boolean;
    galaxyTravelFinishesAt: string | null;
    greatStructureName: string;
    galaxyName: string;
    sectorName: string;
    systemName: string;
    coordinates: { x: number; y: number; z: number };
    starType: StarType | string;
    mainPlanetName: string;
    mainPlanetType: string;
    habitability: Habitability | string;
    anomalyType: AnomalyType | string;
    radarQuality: number;
    backgroundRadiation: number;
    vacuumStability: number;
    darkMatterDensity: number;
    eventProbability: number;
    constants: Record<FocusKey, number>;
    has4DRiftAccess: boolean;
  };
  resources: {
    highEnergy: number;
    antimatter: number;
    darkEnergy: number;
    darkMatter: number;
    fermions: number;
    capacities: Record<ResourceId, number>;
  };
  production: {
    highEnergyPerSec: number;
    antimatterPerSec: number;
    darkEnergyPerSec: number;
    darkMatterPerSec: number;
    fermionsPerSec: number;
  };
  buildings: Array<{ type: BuildingId | string; level: number }>;
  expedition: GameExpeditionInfo;
  artifacts: GameArtifact[];
  discoveredAnomalies: GameAnomaly[];
  effectiveRadar: number;
  /** Civilization glow metric (Stage 4). Higher = easier to detect. */
  signalExposure: number;
  contacts: GameContact[];
  /** Stage 6 active + recent combat actions */
  combatActions: GameCombatAction[];
  combatReports: GameCombatReport[];
  evacuationActive: boolean;
  commJammedUntil: string | null;
  /** Stage 7 — ether credits mirror (authoritative on User). */
  premiumCredits: number;
  shopCatalog: Array<{
    key: string;
    name: string;
    description: string;
    category: string;
    costCredits: number;
    resourceType?: string;
    amount?: number;
    capacityBonusPercent?: number;
    premiumTier?: string;
  }>;
  /** Stage 8 */
  physicsCatalog: Array<{
    id: string;
    name: string;
    description: string;
    cost: { darkEnergy: number; darkMatter: number; antimatter: number };
    active: boolean;
    unlocked: boolean;
    reasons: string[];
  }>;
  galaxyTravel: {
    unlocked: boolean;
    traveling: boolean;
    finishesAt: string | null;
    cost: { fermions: number; darkEnergy: number; highEnergy: number };
    durationSec: number;
    reasons: string[];
  };
  levelCosts: { highEnergy: number; darkEnergy: number };
  combatCatalog: Array<{
    type: string;
    name: string;
    description: string;
    cost: {
      highEnergy: number;
      antimatter: number;
      darkEnergy: number;
      darkMatter: number;
      fermions: number;
    };
    minCivLevel: number;
    unlocked: boolean;
    reasons: string[];
    requiresTarget: boolean;
    selfAction: boolean;
    prepSecEstimate: number;
  }>;
  expeditionCatalog: Array<{
    id: ExpeditionTypeId | string;
    name: string;
    description: string;
    unlocked: boolean;
    reasons: string[];
    cost: {
      highEnergy: number;
      antimatter: number;
      darkEnergy: number;
      darkMatter: number;
      fermions: number;
    };
    durationSecEstimate: number;
    minCivLevel: number;
  }>;
  journal: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    createdAt: string;
  }>;
  meta: {
    totalHighEnergyMined: number;
    successfulExpeditions: number;
    expeditionNonce: number;
  };
  serverTime: string;
}

export interface ActionReport {
  type: string;
  message: string;
  title?: string;
}

export interface ActionResponse {
  state: GameState;
  report: ActionReport;
}

export type { BuildingId, FocusKey, ResourceId };
