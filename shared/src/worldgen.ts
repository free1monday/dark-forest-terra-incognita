import { createActionRng, rngInt, rngPick } from './rng';
import type { AnomalyType, Habitability, StarType, WorldState } from './types';
import type { CivilizationFocuses } from './types';

const GREAT_STRUCTURES = [
  'Великая стена Слоуна',
  'Войд Волопаса',
  'Сверхскопление Шепли',
  'Великий аттрактор',
  'Сверхскопление Девы',
  'Стена Скульптора',
  'Комплекс Рыб–Кита',
  'Сверхскопление Гидры–Центавра',
  'Войд Эридана',
  'Великая стена Геркулеса–Северной Короны',
] as const;

const GALAXY_PREFIX = [
  'Андромеда',
  'NGC',
  'IC',
  'Messier',
  'UGC',
  'ESO',
  'PGC',
  'Каталог',
  'Сектор',
  'Туманность',
];

const GALAXY_SUFFIX = [
  'Праим',
  'Минор',
  'Глубинная',
  'Теневая',
  'Квантовая',
  'Обсидиановая',
  'Сириус-ветвь',
  'Нуль-дуга',
  'Ферми-край',
  'Лямбда',
  'Омега',
  'Эпсилон',
];

const SECTOR_NAMES = [
  'Альфа-9',
  'Бета-Тень',
  'Гамма-Разлом',
  'Дельта-Тишина',
  'Эпсилон-Край',
  'Зета-Эхо',
  'Эта-Пустота',
  'Тета-Шторм',
  'Йота-Линза',
  'Каппа-Облако',
  'Лямбда-Горизонт',
  'Мю-Сигнал',
];

const SYSTEM_PREFIX = ['Кеплер', 'Траппист', 'Проксима', 'Лютен', 'Вольф', 'Барнард', 'Росс', 'Глизе', 'HR', 'TOI'];

const PLANET_TYPES = [
  'каменистая',
  'океаническая',
  'пустынная',
  'ледяная',
  'суперземля',
  'мини-нептун',
  'титан-аналог',
  'вулканическая',
];

const STAR_TYPES: StarType[] = [
  'red_dwarf',
  'yellow_dwarf',
  'orange_dwarf',
  'blue_giant',
  'white_dwarf',
  'binary',
  'neutron_star',
];

const ANOMALIES: AnomalyType[] = [
  'none',
  'none',
  'none',
  'dark_cloud',
  'wormhole_echo',
  'gravitational_lens',
  'vacuum_instability',
  'relic_radiation_spike',
  '4d_fissure_hint',
  'black_hole_nearby',
  'neutron_pulse',
];

function makeName(rng: () => number, prefixes: readonly string[], suffixes?: readonly string[]): string {
  const p = rngPick(rng, prefixes);
  if (!suffixes) {
    return `${p}-${rngInt(rng, 100, 9999)}`;
  }
  if (rng() < 0.4) {
    return `${p} ${rngInt(rng, 1, 999)}`;
  }
  return `${p} ${rngPick(rng, suffixes)}`;
}

export function generateWorld(seed: string, focuses: CivilizationFocuses): WorldState {
  const rng = createActionRng(seed, 'worldgen', 0);

  const greatStructureName = rngPick(rng, GREAT_STRUCTURES);
  const galaxyName = makeName(rng, GALAXY_PREFIX, GALAXY_SUFFIX);
  const sectorName = rngPick(rng, SECTOR_NAMES);
  const systemName = makeName(rng, SYSTEM_PREFIX);
  const mainPlanetName =
    systemName.split(' ')[0] +
    '-' +
    String.fromCharCode(98 + rngInt(rng, 0, 5)); /* b-g */

  const coordinates = {
    x: rngInt(rng, -50000, 50000),
    y: rngInt(rng, -50000, 50000),
    z: rngInt(rng, -8000, 8000),
  };

  const starType = rngPick(rng, STAR_TYPES);
  const planetCount = rngInt(rng, 2, 12);

  let habitability: Habitability = 'habitable';
  const hRoll = rng();
  if (hRoll < 0.15) habitability = 'uninhabitable';
  else if (hRoll > 0.85) habitability = 'ideal';
  // bias by expansion slightly toward habitable already chosen — keep simple

  const mainPlanetType = rngPick(rng, PLANET_TYPES);
  const anomalyType = rngPick(rng, ANOMALIES);

  const backgroundRadiation = rngInt(rng, 5, 95);
  const vacuumStability = rngInt(rng, 20, 99);
  const darkMatterDensity = rngInt(rng, 10, 90);
  const eventProbability = Math.round((0.4 + rng() * 0.8) * 100) / 100;

  const radarQuality = Math.min(
    100,
    20 + rngInt(rng, 0, 60) + Math.floor(focuses.scienceFocus / 10)
  );

  return {
    greatStructureName,
    galaxyName,
    sectorName,
    systemName,
    coordinates,
    starType,
    planetCount,
    mainPlanetName,
    mainPlanetType,
    habitability,
    anomalyType,
    backgroundRadiation,
    vacuumStability,
    darkMatterDensity,
    eventProbability,
    radarQuality,
  };
}
