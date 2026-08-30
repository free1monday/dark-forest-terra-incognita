import type { BuildingId, FocusKey, ResourceId } from './constants';

export interface CivilizationFocuses {
  scienceFocus: number;
  expansionFocus: number;
  secrecy: number;
  aggression: number;
  diplomacyFocus: number;
  riskLevel: number;
}

export type StarType =
  | 'red_dwarf'
  | 'yellow_dwarf'
  | 'orange_dwarf'
  | 'blue_giant'
  | 'white_dwarf'
  | 'neutron_star'
  | 'binary';

export type Habitability = 'uninhabitable' | 'habitable' | 'ideal';

export type AnomalyType =
  | 'none'
  | 'dark_cloud'
  | 'wormhole_echo'
  | 'gravitational_lens'
  | 'vacuum_instability'
  | 'relic_radiation_spike'
  | '4d_fissure_hint'
  | 'black_hole_nearby'
  | 'neutron_pulse';

export interface WorldState {
  greatStructureName: string;
  galaxyName: string;
  sectorName: string;
  systemName: string;
  coordinates: { x: number; y: number; z: number };
  starType: StarType;
  planetCount: number;
  mainPlanetName: string;
  mainPlanetType: string;
  habitability: Habitability;
  anomalyType: AnomalyType;
  backgroundRadiation: number;
  vacuumStability: number;
  darkMatterDensity: number;
  eventProbability: number;
  radarQuality: number;
}

export interface CivilizationState {
  id: string;
  name: string;
  seed: string;
  level: number;
  prosperityScore: number;
  focuses: CivilizationFocuses;
  world: WorldState;
  createdAt: string;
  /** Stage 10 */
  species?: string;
  politicalRegime?: string;
  governmentForm?: string;
  population?: number;
  colonies?: number;
}

export type ResourceState = Record<ResourceId, number> & {
  highEnergyCapacity: number;
  antimatterCapacity: number;
  darkEnergyCapacity: number;
  darkMatterCapacity: number;
  fermionsCapacity: number;
};

export interface BuildingState {
  buildingType: BuildingId;
  level: number;
}

export type JournalEventType =
  | 'system'
  | 'production'
  | 'upgrade'
  | 'level_up'
  | 'expedition'
  | 'discovery'
  | 'debug'
  | 'warning';

export interface JournalEntry {
  id: string;
  at: number;
  type: JournalEventType;
  title: string;
  body: string;
}

export type ExpeditionResultKind =
  | 'empty'
  | 'resource_traces'
  | 'anomaly'
  | 'high_energy_find'
  | 'weak_signal';

export interface ExpeditionState {
  active: boolean;
  startedAt: number;
  finishesAt: number;
  costPaid: number;
}

export interface SaveState {
  version: 1;
  civilization: CivilizationState;
  resources: ResourceState;
  buildings: BuildingState[];
  journal: JournalEntry[];
  expedition: ExpeditionState | null;
  expeditionNonce: number;
  actionNonce: number;
  lastTickAt: number;
  totalHighEnergyMined: number;
  successfulExpeditions: number;
}

export type SelectableObject =
  | { kind: 'resource'; id: ResourceId }
  | { kind: 'building'; id: BuildingId }
  | { kind: 'system' }
  | { kind: 'planet' }
  | { kind: 'civilization' }
  | { kind: 'great_structure' }
  | { kind: 'artifact'; id: string }
  | { kind: 'anomaly'; id: string }
  | { kind: 'contact'; id: string }
  | { kind: 'combat_action'; id: string }
  | null;

export type { BuildingId, FocusKey, ResourceId };
