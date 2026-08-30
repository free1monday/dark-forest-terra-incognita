import {
  buildUniverseMap,
  type MapLevel,
  generateSolarSystem,
} from '@shared';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';
import { planetToGame, solarSystemToGame } from './stateService.js';

const mapCache = new Map<string, { at: number; data: unknown }>();
const MAP_TTL_MS = 60_000;

export async function getUniverseMapForUser(
  userId: string,
  opts: { level?: MapLevel; superclusterId?: string; galaxyId?: string } = {}
) {
  const civ = await prisma.civilization.findUnique({
    where: { userId },
    include: {
      contactsObserved: {
        take: 40,
        orderBy: { firstDetectedAt: 'desc' },
        include: { target: { select: { name: true } } },
      },
    },
  });
  if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  const cacheKey = `${civ.id}:${opts.level ?? 0}:${opts.superclusterId ?? ''}:${opts.galaxyId ?? ''}`;
  const hit = mapCache.get(cacheKey);
  if (hit && Date.now() - hit.at < MAP_TTL_MS) {
    return hit.data;
  }

  const contactMarkers = (civ.contactsObserved ?? []).map((c) => ({
    id: c.id,
    name: c.target?.name ?? c.systemName ?? 'Контакт',
    x: c.coordinatesX,
    y: c.coordinatesY,
    z: c.coordinatesZ,
  }));

  const data = buildUniverseMap({
    civSeed: civ.seed,
    galaxyName: civ.galaxyName,
    systemName: civ.systemName,
    greatStructureName: civ.greatStructureName,
    coordinates: {
      x: civ.coordinatesX,
      y: civ.coordinatesY,
      z: civ.coordinatesZ,
    },
    contactMarkers,
    level: opts.level,
    focusSuperclusterId: opts.superclusterId,
    focusGalaxyId: opts.galaxyId,
  });

  mapCache.set(cacheKey, { at: Date.now(), data });
  return data;
}

export async function getHomeSolarSystem(userId: string) {
  const civ = await prisma.civilization.findUnique({ where: { userId } });
  if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  let systemId = (civ as { homeSolarSystemId?: string | null }).homeSolarSystemId;
  if (!systemId) {
    // Lazy bootstrap for pre-stage-10 civs
    const sol = generateSolarSystem(civ.seed, civ.systemName);
    const created = await prisma.solarSystem.create({
      data: {
        seed: sol.seed,
        name: sol.name,
        starClass: sol.star.class,
        starTemperature: sol.star.temperature,
        starLuminosity: sol.star.luminosity,
        starMass: sol.star.mass,
        starAgeGyr: sol.star.ageGyr,
        starColor: sol.star.color,
        ownerCivilizationId: civ.id,
        planets: {
          create: sol.planets.map((pl) => ({
            planetKey: pl.key,
            indexInSystem: pl.index,
            name: pl.isHomeworld ? civ.mainPlanetName : pl.name,
            type: pl.isHomeworld ? (civ.mainPlanetType || pl.type) : pl.type,
            atmosphere: pl.atmosphere,
            gravity: pl.gravity,
            moons: pl.moons,
            cosmicDust: pl.cosmicDust,
            radiation: pl.radiation,
            temperatureDay: pl.temperatureDay,
            temperatureNight: pl.temperatureNight,
            resourcesJson: JSON.stringify(pl.resources),
            orbitRadius: pl.orbitRadius,
            hue: pl.hue,
            isHomeworld: pl.isHomeworld,
            colonized: pl.isHomeworld,
            ownerCivilizationId: pl.isHomeworld ? civ.id : null,
          })),
        },
      },
      include: { planets: true },
    });
    const home = created.planets.find((p) => p.isHomeworld) ?? created.planets[0]!;
    await prisma.civilization.update({
      where: { id: civ.id },
      data: { homeSolarSystemId: created.id, homePlanetId: home.id },
    });
    systemId = created.id;
  }

  return getSolarSystemById(userId, systemId);
}

export async function getSolarSystemById(userId: string, systemId: string) {
  const civ = await prisma.civilization.findUnique({ where: { userId } });
  if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  const sys = await prisma.solarSystem.findUnique({
    where: { id: systemId },
    include: { planets: true },
  });
  if (!sys) throw new AppError('SYSTEM_NOT_FOUND', 'Система не найдена', 404);
  if (sys.ownerCivilizationId && sys.ownerCivilizationId !== civ.id) {
    throw new AppError('FORBIDDEN', 'Нет доступа к чужой системе', 403);
  }
  return solarSystemToGame(sys);
}

export async function getPlanetById(userId: string, planetId: string) {
  const civ = await prisma.civilization.findUnique({ where: { userId } });
  if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  const planet = await prisma.planet.findUnique({
    where: { id: planetId },
    include: { solarSystem: true },
  });
  if (!planet) throw new AppError('PLANET_NOT_FOUND', 'Планета не найдена', 404);
  if (
    planet.solarSystem.ownerCivilizationId &&
    planet.solarSystem.ownerCivilizationId !== civ.id
  ) {
    throw new AppError('FORBIDDEN', 'Нет доступа', 403);
  }
  return {
    planet: planetToGame(planet),
    systemId: planet.solarSystemId,
    systemName: planet.solarSystem.name,
  };
}
