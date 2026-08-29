import type { Contact, Prisma } from '@prisma/client';
import {
  ATTACK_TYPES_BY_TYPE,
  COMBAT_DECEPTION_SENSOR_PENALTY,
  COMBAT_EXPOSURE_ON_DARK,
  COMBAT_EXPOSURE_ON_STRIKE,
  COMBAT_JAM_DURATION_SEC,
  COMBAT_RECON_ACCURACY_BOOST,
  COMBAT_RECON_COORD_SHRINK,
  COMBAT_RECON_LEVEL_SHRINK,
  COMBAT_TENSION_ON_DARK,
  COMBAT_TENSION_ON_RECON,
  COMBAT_TENSION_ON_STRIKE,
  applyStructureDamage,
  attackTypeLabelRu,
  calculateAttackPower,
  calculateCounterattackChance,
  calculateCounterattackDamage,
  calculateDefensePower,
  calculateHitChance,
  combatCostAffordable,
  combatOutcomeLabelRu,
  combatPrepSeconds,
  combatTransitSeconds,
  defenseStatusFromStructures,
  euclideanDistance3,
  generateTargetStructures,
  getBuildingLevel,
  hasGravityAnomaly,
  resolveCombat,
  structuresFromPlayer,
  sumArtifactEffects,
  targetingMaxRadius,
  type AttackType,
  type GameState,
  type TargetStructures,
} from '@shared';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';
import {
  anomalyTypesOf,
  artifactKeysOf,
  buildingsToState,
  toGameState,
  type CivFull,
} from './stateService.js';
import { getUserCivilizationState, invalidateStateCache } from './gameService.js';

function parseStructures(raw: string | null | undefined, fallback: TargetStructures): TargetStructures {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as TargetStructures;
  } catch {
    return fallback;
  }
}

function trueCoordsOf(contact: Contact): { x: number; y: number; z: number } {
  return {
    x: contact.trueCoordinatesX ?? contact.coordinatesX,
    y: contact.trueCoordinatesY ?? contact.coordinatesY,
    z: contact.trueCoordinatesZ ?? contact.coordinatesZ,
  };
}

async function ensureStructures(
  tx: Prisma.TransactionClient,
  contact: Contact,
  seed: string
): Promise<TargetStructures> {
  if (contact.targetStructures) {
    return parseStructures(contact.targetStructures, {
      mainCore: 100,
      defenseMatrix: 50,
      fleetStrength: 40,
      sensorGrid: 50,
      shieldCapacity: 50,
    });
  }
  let level = 20;
  if (contact.targetBotData) {
    try {
      level = (JSON.parse(contact.targetBotData) as { level?: number }).level ?? 20;
    } catch {
      level = Math.floor((contact.levelMin + contact.levelMax) / 2);
    }
  }
  const s = generateTargetStructures(seed, contact.id, level);
  await tx.contact.update({
    where: { id: contact.id },
    data: {
      targetStructures: JSON.stringify(s),
      trueCoordinatesX: contact.trueCoordinatesX ?? contact.coordinatesX,
      trueCoordinatesY: contact.trueCoordinatesY ?? contact.coordinatesY,
      trueCoordinatesZ: contact.trueCoordinatesZ ?? contact.coordinatesZ,
      defenseStatus: contact.defenseStatus ?? 'intact',
    },
  });
  return s;
}

async function bumpTension(
  tx: Prisma.TransactionClient,
  contactId: string,
  delta: number,
  forceHostile = false
) {
  const thread = await tx.diplomaticThread.findUnique({ where: { contactId } });
  if (!thread) {
    if (forceHostile) {
      await tx.contact.update({
        where: { id: contactId },
        data: { status: 'hostile' },
      });
    }
    return;
  }
  const tension = Math.min(100, thread.tension + delta);
  const status =
    forceHostile || tension >= 100 ? 'hostile' : thread.status === 'closed' ? thread.status : thread.status;
  await tx.diplomaticThread.update({
    where: { id: thread.id },
    data: {
      tension,
      status: tension >= 100 || forceHostile ? 'hostile' : status,
      trust: Math.max(0, thread.trust - Math.floor(delta / 3)),
    },
  });
  if (tension >= 100 || forceHostile) {
    await tx.contact.update({
      where: { id: contactId },
      data: { status: 'hostile' },
    });
  }
}

export async function catchUpCombatForCiv(
  tx: Prisma.TransactionClient,
  civ: CivFull
): Promise<void> {
  const now = new Date();
  const pending = await tx.combatAction.findMany({
    where: {
      attackerCivilizationId: civ.id,
      status: { in: ['PREPARING', 'IN_TRANSIT'] },
    },
    orderBy: { prepFinishesAt: 'asc' },
  });

  for (const action of pending) {
    if (action.status === 'PREPARING' && action.prepFinishesAt.getTime() <= now.getTime()) {
      const def = ATTACK_TYPES_BY_TYPE[action.attackType];
      if (def?.hasTransit) {
        const contact = action.targetContactId
          ? await tx.contact.findUnique({ where: { id: action.targetContactId } })
          : null;
        const dist = contact?.distance ?? 1000;
        const transitSec = combatTransitSeconds(dist);
        await tx.combatAction.update({
          where: { id: action.id },
          data: {
            status: 'IN_TRANSIT',
            transitFinishesAt: new Date(action.prepFinishesAt.getTime() + transitSec * 1000),
          },
        });
      } else {
        await resolveActionInTx(tx, civ, action.id);
      }
    }

    const fresh = await tx.combatAction.findUnique({ where: { id: action.id } });
    if (
      fresh &&
      fresh.status === 'IN_TRANSIT' &&
      fresh.transitFinishesAt &&
      fresh.transitFinishesAt.getTime() <= now.getTime()
    ) {
      await resolveActionInTx(tx, civ, fresh.id);
    }
  }
}

async function resolveActionInTx(
  tx: Prisma.TransactionClient,
  civ: CivFull,
  actionId: string
): Promise<void> {
  const action = await tx.combatAction.findUnique({ where: { id: actionId } });
  if (!action || action.status === 'RESOLVED' || action.status === 'FAILED' || action.status === 'CANCELLED') {
    return;
  }

  const def = ATTACK_TYPES_BY_TYPE[action.attackType as AttackType];
  if (!def) {
    await tx.combatAction.update({
      where: { id: actionId },
      data: { status: 'FAILED', outcome: 'FAILED', resolvedAt: new Date() },
    });
    return;
  }

  const buildingStates = buildingsToState(civ.buildings);
  const keys = artifactKeysOf(civ.artifacts);
  const arts = sumArtifactEffects(keys);
  void anomalyTypesOf(civ.discoveredAnomalies);
  const effRadar =
    civ.radarQuality +
    getBuildingLevel(buildingStates, 'dark_sensor') * 5 +
    (arts.radarBonus ?? 0);

  // Self actions
  if (def.selfAction) {
    if (action.attackType === 'EVACUATION') {
      await tx.civilization.update({
        where: { id: civ.id },
        data: { evacuationActive: true },
      });
      await finishReport(tx, action, {
        outcome: 'EVACUATION_READY',
        hitChance: 1,
        attackPower: 0,
        defensePower: 0,
        damageDealt: 0,
        damageTaken: 0,
        flavor:
          'Эвакуация ключевых узлов завершена. Следующий входящий удар будет ослаблен на 50%.',
        targetName: civ.name,
      });
      return;
    }
    if (action.attackType === 'CAPITAL_RELOCATION') {
      const angle = (Date.now() % 360) * (Math.PI / 180);
      const jump = 500 + (civ.level % 200);
      const nx = Math.floor(civ.coordinatesX + Math.cos(angle) * jump);
      const ny = Math.floor(civ.coordinatesY + Math.sin(angle) * jump);
      const nz = Math.floor(civ.coordinatesZ + ((civ.level % 17) - 8) * 3);
      await tx.civilization.update({
        where: { id: civ.id },
        data: {
          coordinatesX: nx,
          coordinatesY: ny,
          coordinatesZ: nz,
          sectorName: `Сектор-${Math.abs(nx % 9000)}`,
        },
      });
      // degrade all contacts' accuracy
      const contacts = await tx.contact.findMany({
        where: { observerCivilizationId: civ.id },
      });
      for (const c of contacts) {
        await tx.contact.update({
          where: { id: c.id },
          data: {
            coordinatesAccuracy: Math.max(0.1, c.coordinatesAccuracy * 0.4),
            confidence: Math.max(0.15, c.confidence * 0.5),
            distanceNoise: Math.floor(c.distanceNoise * 1.8 + 50),
          },
        });
      }
      await finishReport(tx, action, {
        outcome: 'RELOCATION_DONE',
        hitChance: 1,
        attackPower: 0,
        defensePower: 0,
        damageDealt: 0,
        damageTaken: 0,
        flavor: `Столица перенесена в (${nx}, ${ny}, ${nz}). Каталоги контактов десинхронизированы.`,
        targetName: civ.name,
      });
      return;
    }
  }

  if (!action.targetContactId) {
    await tx.combatAction.update({
      where: { id: actionId },
      data: { status: 'FAILED', outcome: 'FAILED', resolvedAt: new Date() },
    });
    return;
  }

  const contact = await tx.contact.findUnique({
    where: { id: action.targetContactId },
    include: { target: true, thread: true },
  });
  if (!contact || contact.observerCivilizationId !== civ.id) {
    await tx.combatAction.update({
      where: { id: actionId },
      data: { status: 'FAILED', outcome: 'FAILED', resolvedAt: new Date() },
    });
    return;
  }

  if (contact.isDestroyed || contact.isFalsePositive) {
    await finishReport(tx, action, {
      outcome: 'FAILED',
      hitChance: 0,
      attackPower: 0,
      defensePower: 0,
      damageDealt: 0,
      damageTaken: 0,
      flavor: contact.isFalsePositive
        ? 'Цель оказалась ложным сигналом. Удар поглощён вакуумом.'
        : 'Цель уже уничтожена. Ресурсы потрачены впустую.',
      targetName: contact.target?.name ?? 'Цель',
      status: 'FAILED',
    });
    return;
  }

  let structures = await ensureStructures(tx, contact, civ.seed);
  const trueC = trueCoordsOf(contact);
  const aim = {
    x: action.targetCoordinatesX,
    y: action.targetCoordinatesY,
    z: action.targetCoordinatesZ,
  };
  const distanceError = euclideanDistance3(aim, trueC);
  const maxRadius = targetingMaxRadius(contact.distanceNoise, contact.coordinatesAccuracy);

  const targetLevel =
    contact.target?.level ??
    (() => {
      try {
        return contact.targetBotData
          ? (JSON.parse(contact.targetBotData) as { level?: number }).level ??
              Math.floor((contact.levelMin + contact.levelMax) / 2)
          : Math.floor((contact.levelMin + contact.levelMax) / 2);
      } catch {
        return Math.floor((contact.levelMin + contact.levelMax) / 2);
      }
    })();

  // ——— RECON ———
  if (action.attackType === 'RECON_SCAN') {
    const hitChance = calculateHitChance({
      attackerRadar: effRadar,
      targetSensors: structures.sensorGrid,
      distanceError,
      maxRadius,
      accuracyMul: 1.1,
    });
    const rngHit =
      createDetHit(civ.seed, action.id) < hitChance;
    const boost = rngHit ? COMBAT_RECON_ACCURACY_BOOST : COMBAT_RECON_ACCURACY_BOOST * 0.4;
    const span = Math.max(1, contact.levelMax - contact.levelMin);
    const newSpan = Math.max(2, Math.floor(span * (1 - (rngHit ? COMBAT_RECON_LEVEL_SHRINK : 0.15))));
    const mid = (contact.levelMin + contact.levelMax) / 2;
    const levelMin = Math.max(1, Math.floor(mid - newSpan / 2));
    const levelMax = Math.min(100, Math.ceil(mid + newSpan / 2));
    // pull reported coords toward true
    const pull = rngHit ? COMBAT_RECON_COORD_SHRINK : 0.15;
    const nx = contact.coordinatesX + (trueC.x - contact.coordinatesX) * pull;
    const ny = contact.coordinatesY + (trueC.y - contact.coordinatesY) * pull;
    const nz = contact.coordinatesZ + (trueC.z - contact.coordinatesZ) * pull;

    await tx.contact.update({
      where: { id: contact.id },
      data: {
        confidence: Math.min(0.95, contact.confidence + boost),
        coordinatesAccuracy: Math.min(0.95, contact.coordinatesAccuracy + boost * 0.8),
        distanceAccuracy: Math.min(0.95, contact.distanceAccuracy + boost * 0.6),
        levelAccuracy: Math.min(0.95, contact.levelAccuracy + boost),
        levelMin,
        levelMax,
        coordinatesX: nx,
        coordinatesY: ny,
        coordinatesZ: nz,
        distanceNoise: Math.max(15, Math.floor(contact.distanceNoise * (1 - boost))),
        reconLevel: Math.min(5, (contact.reconLevel ?? 0) + (rngHit ? 1 : 0)),
        status: contact.status === 'detected' ? 'monitored' : contact.status,
      },
    });

    await bumpTension(tx, contact.id, COMBAT_TENSION_ON_RECON, false);
    await tx.civilization.update({
      where: { id: civ.id },
      data: {
        signalExposure: Math.round((civ.signalExposure + 0.04) * 1000) / 1000,
      },
    });

    await finishReport(tx, action, {
      outcome: rngHit ? 'RECON_SUCCESS' : 'RECON_PARTIAL',
      hitChance,
      attackPower: 0,
      defensePower: structures.sensorGrid,
      damageDealt: 0,
      damageTaken: 0,
      flavor: rngHit
        ? `Зонды вернулись. Эфемериды уточнены. Достоверность ↑. Напряжение канала +${COMBAT_TENSION_ON_RECON}.`
        : `Частичный возврат телеметрии. Шумовой фон высок. Слабое уточнение параметров.`,
      targetName: contact.target?.name ?? 'Цель',
    });
    return;
  }

  // ——— DECEPTION ———
  if (action.attackType === 'DECEPTION_SIGNAL') {
    structures = {
      ...structures,
      sensorGrid: Math.max(5, structures.sensorGrid - COMBAT_DECEPTION_SENSOR_PENALTY),
    };
    await tx.contact.update({
      where: { id: contact.id },
      data: { targetStructures: JSON.stringify(structures) },
    });
    await bumpTension(tx, contact.id, 12, false);
    await finishReport(tx, action, {
      outcome: 'DECEPTION_SUCCESS',
      hitChance: 0.9,
      attackPower: 0,
      defensePower: structures.sensorGrid,
      damageDealt: 0,
      damageTaken: 0,
      flavor: `Ложный пакет координат принят сенсорной сетью цели. sensorGrid −${COMBAT_DECEPTION_SENSOR_PENALTY}.`,
      targetName: contact.target?.name ?? 'Цель',
    });
    return;
  }

  // ——— JAMMING ———
  if (action.attackType === 'COMM_JAMMING') {
    const until = new Date(Date.now() + COMBAT_JAM_DURATION_SEC * 1000);
    if (contact.targetCivilizationId) {
      await tx.civilization.update({
        where: { id: contact.targetCivilizationId },
        data: { commJammedUntil: until },
      });
    }
    // Also mark local contact status flavor
    await bumpTension(tx, contact.id, 15, false);
    await finishReport(tx, action, {
      outcome: 'JAMMING_SUCCESS',
      hitChance: 0.85,
      attackPower: 0,
      defensePower: structures.sensorGrid,
      damageDealt: 0,
      damageTaken: 0,
      flavor: `Каналы связи цели подавлены до ${until.toISOString()}. Дипломатия цели ограничена.`,
      targetName: contact.target?.name ?? 'Цель',
    });
    return;
  }

  // ——— STRIKES ———
  const ignoreShields = action.attackType === 'GRAVITATIONAL_STRIKE';
  const accuracyMul = action.attackType === 'GRAVITATIONAL_STRIKE' ? 0.75 : 1;

  const hitChance = calculateHitChance({
    attackerRadar: effRadar,
    targetSensors: structures.sensorGrid,
    distanceError,
    maxRadius,
    accuracyMul,
  });

  const attackPower = calculateAttackPower({
    attackType: action.attackType as AttackType,
    civLevel: civ.level,
    artifacts: arts,
    antimatterSpent: def.cost.antimatter,
  });

  // Target player structures if real
  if (contact.targetCivilizationId && contact.target) {
    const tCiv = await tx.civilization.findUnique({
      where: { id: contact.targetCivilizationId },
      include: { buildings: true, artifacts: true },
    });
    if (tCiv) {
      const tb = buildingsToState(tCiv.buildings);
      const tArts = sumArtifactEffects(tCiv.artifacts.map((a) => a.artifactKey));
      structures = structuresFromPlayer({
        level: tCiv.level,
        darkSensorLevel: getBuildingLevel(tb, 'dark_sensor'),
        colliderLevel: getBuildingLevel(tb, 'high_energy_collider'),
        probeLevel: getBuildingLevel(tb, 'probe_factory'),
        artifactDefenseBonus: tArts.combatDefenseBonus ?? 0,
      });
      // merge with stored damage state if any
      if (contact.targetStructures) {
        const stored = parseStructures(contact.targetStructures, structures);
        structures = {
          mainCore: Math.min(structures.mainCore, stored.mainCore),
          defenseMatrix: Math.min(structures.defenseMatrix, stored.defenseMatrix),
          fleetStrength: Math.min(structures.fleetStrength, stored.fleetStrength),
          sensorGrid: Math.min(structures.sensorGrid, stored.sensorGrid),
          shieldCapacity: Math.min(structures.shieldCapacity, stored.shieldCapacity),
        };
      }
    }
  }

  const targetEvac = contact.target?.evacuationActive ?? false;
  const defensePower = calculateDefensePower({
    targetLevel,
    structures,
    artifacts: arts,
    ignoreShields,
    evacuationActive: targetEvac,
  });

  const resolved = resolveCombat({
    attackPower,
    defensePower,
    hitChance,
    seed: civ.seed,
    actionId: action.id,
    attackType: action.attackType as AttackType,
    structures,
    evacuationActive: targetEvac,
  });

  if (targetEvac && contact.targetCivilizationId && resolved.hit) {
    await tx.civilization.update({
      where: { id: contact.targetCivilizationId },
      data: { evacuationActive: false },
    });
  }

  if (resolved.hit) {
    let newStructures = applyStructureDamage(structures, resolved.structureDamage);
    if (resolved.destroyed) {
      newStructures = { ...newStructures, mainCore: 0 };
    }
    const defStatus = defenseStatusFromStructures(newStructures, resolved.destroyed);
    await tx.contact.update({
      where: { id: contact.id },
      data: {
        targetStructures: JSON.stringify(newStructures),
        isDestroyed: resolved.destroyed,
        defenseStatus: defStatus,
        status: resolved.destroyed ? 'destroyed' : 'hostile',
      },
    });
  } else {
    // Miss still reveals hostility
    await tx.contact.update({
      where: { id: contact.id },
      data: {
        status: contact.status === 'destroyed' ? 'destroyed' : 'hostile',
      },
    });
  }

  const tensionBump =
    action.attackType === 'DARK_STRIKE' ? COMBAT_TENSION_ON_DARK : COMBAT_TENSION_ON_STRIKE;
  await bumpTension(tx, contact.id, tensionBump, true);

  const exposureBump =
    action.attackType === 'DARK_STRIKE' ? COMBAT_EXPOSURE_ON_DARK : COMBAT_EXPOSURE_ON_STRIKE;
  await tx.civilization.update({
    where: { id: civ.id },
    data: {
      signalExposure: Math.round((civ.signalExposure + exposureBump) * 1000) / 1000,
    },
  });

  // Counterattack
  let damageTaken = 0;
  let finalOutcome = resolved.outcome;
  let finalStatus: string = 'RESOLVED';
  const counterChance = calculateCounterattackChance({
    targetLevel,
    targetSensors: structures.sensorGrid,
    attackType: action.attackType as AttackType,
    targetDestroyed: resolved.destroyed,
  });
  if (createDetHit(civ.seed, action.id + ':counter') < counterChance) {
    const counterPower = calculateAttackPower({
      attackType: 'LIMITED_STRIKE',
      civLevel: targetLevel,
      artifacts: {},
      antimatterSpent: 20,
    });
    const attackerDef = calculateDefensePower({
      targetLevel: civ.level,
      structures: structuresFromPlayer({
        level: civ.level,
        darkSensorLevel: getBuildingLevel(buildingStates, 'dark_sensor'),
        colliderLevel: getBuildingLevel(buildingStates, 'high_energy_collider'),
        probeLevel: getBuildingLevel(buildingStates, 'probe_factory'),
        artifactDefenseBonus: arts.combatDefenseBonus ?? 0,
      }),
      artifacts: arts,
      evacuationActive: civ.evacuationActive,
    });
    if (civ.evacuationActive) {
      await tx.civilization.update({
        where: { id: civ.id },
        data: { evacuationActive: false },
      });
    }
    const counter = calculateCounterattackDamage({
      counterPower,
      attackerDefense: attackerDef,
      seed: civ.seed,
      actionId: action.id,
    });
    damageTaken = counter.damageRatio;
    finalOutcome = 'COUNTERATTACKED';
    finalStatus = 'COUNTERATTACKED';
    // Prosperity / resource sting
    if (civ.resources) {
      const lossHe = Math.min(
        civ.resources.highEnergy,
        Math.floor(40 + counter.damageRatio * 200)
      );
      await tx.resourceState.update({
        where: { civilizationId: civ.id },
        data: { highEnergy: Math.max(0, civ.resources.highEnergy - lossHe) },
      });
    }
    await tx.civilization.update({
      where: { id: civ.id },
      data: {
        prosperityScore: Math.max(0, civ.prosperityScore - Math.floor(5 + counter.damageRatio * 30)),
      },
    });
  }

  const flavor = buildStrikeFlavor({
    attackType: action.attackType,
    outcome: resolved.outcome,
    counter: finalOutcome === 'COUNTERATTACKED',
    damageRatio: resolved.damageRatio,
    damageTaken,
    hitChance,
    destroyed: resolved.destroyed,
    distanceError,
  });

  await finishReport(tx, action, {
    outcome: finalOutcome,
    hitChance,
    attackPower,
    defensePower,
    damageDealt: resolved.damageRatio,
    damageTaken,
    flavor,
    targetName: contact.target?.name ?? 'Цель',
    status: finalStatus,
  });
}

function createDetHit(seed: string, channel: string): number {
  // lightweight hash to 0..1
  let h = 2166136261;
  const s = `${seed}::${channel}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function buildStrikeFlavor(p: {
  attackType: string;
  outcome: string;
  counter: boolean;
  damageRatio: number;
  damageTaken: number;
  hitChance: number;
  destroyed: boolean;
  distanceError: number;
}): string {
  const lines = [
    `Протокол: ${attackTypeLabelRu(p.attackType)}.`,
    `Ошибка наведения: ${p.distanceError.toFixed(1)} у.е. P(hit)=${(p.hitChance * 100).toFixed(1)}%.`,
    `Исход: ${combatOutcomeLabelRu(p.outcome)} (урон ${p.damageRatio.toFixed(2)}).`,
  ];
  if (p.destroyed) lines.push('Главное ядро цели обнулено. Статус: destroyed.');
  if (p.counter) {
    lines.push(
      `КОНТРУДАР. Получен ответный пакет. Собственный урон ${p.damageTaken.toFixed(2)}. Потери ВЭ/процветания.`
    );
  }
  return lines.join(' ');
}

async function finishReport(
  tx: Prisma.TransactionClient,
  action: {
    id: string;
    attackerCivilizationId: string;
    targetCivilizationId: string | null;
    attackType: string;
  },
  data: {
    outcome: string;
    hitChance: number;
    attackPower: number;
    defensePower: number;
    damageDealt: number;
    damageTaken: number;
    flavor: string;
    targetName: string | null;
    status?: string;
  }
) {
  const status = data.status ?? 'RESOLVED';
  await tx.combatAction.update({
    where: { id: action.id },
    data: {
      status,
      outcome: data.outcome,
      resolvedAt: new Date(),
      damageDealt: data.damageDealt,
      damageTaken: data.damageTaken,
      hitChance: data.hitChance,
      attackPower: data.attackPower,
      defensePower: data.defensePower,
    },
  });
  await tx.combatReport.create({
    data: {
      combatActionId: action.id,
      attackerCivilizationId: action.attackerCivilizationId,
      targetCivilizationId: action.targetCivilizationId,
      attackType: action.attackType,
      outcome: data.outcome,
      hitChance: data.hitChance,
      attackPower: data.attackPower,
      defensePower: data.defensePower,
      damageDealt: data.damageDealt,
      damageTaken: data.damageTaken,
      flavorText: data.flavor,
      targetName: data.targetName,
    },
  });
  await tx.journalEvent.create({
    data: {
      civilizationId: action.attackerCivilizationId,
      type: 'combat',
      title: `Боевой отчёт: ${attackTypeLabelRu(action.attackType)}`,
      message: data.flavor,
      payload: JSON.stringify({ actionId: action.id, outcome: data.outcome }),
    },
  });
}

export async function startCombatAction(
  userId: string,
  input: {
    attackType: AttackType;
    contactId?: string;
    targetCoordinates?: { x: number; y: number; z: number };
  }
): Promise<{ state: GameState; report: { type: string; message: string; title?: string } }> {
  invalidateStateCache();
  const def = ATTACK_TYPES_BY_TYPE[input.attackType];
  if (!def) throw new AppError('INVALID_ATTACK', 'Неизвестный тип атаки', 400);

  const civ = await prisma.civilization.findUnique({
    where: { userId },
    include: {
      resources: true,
      buildings: true,
      artifacts: true,
      discoveredAnomalies: true,
      expeditions: { where: { status: 'active' }, take: 1 },
    },
  });
  if (!civ || !civ.resources) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  // Clear expired jam on self (doesn't block our outbound attacks)
  if (civ.commJammedUntil && civ.commJammedUntil.getTime() > Date.now() && def.requiresTarget === false) {
    // self actions ok while jammed
  }

  if (civ.level < def.minCivLevel) {
    throw new AppError(
      'LEVEL_TOO_LOW',
      `Требуется уровень ≥ ${def.minCivLevel} (сейчас ${civ.level})`,
      400
    );
  }

  const aTypes = [
    civ.anomalyType,
    ...civ.discoveredAnomalies.map((a) => a.anomalyType),
  ];
  if (def.requiresGravityAnomaly && !hasGravityAnomaly(aTypes)) {
    throw new AppError(
      'NO_GRAVITY_ANOMALY',
      'Нужна аномалия «Чёрная дыра» или «Гравитационная линза»',
      400
    );
  }

  if (def.type === 'EVACUATION' && civ.evacuationActive) {
    throw new AppError('EVAC_ACTIVE', 'Эвакуация уже активна', 400);
  }

  if (!combatCostAffordable(def.cost, civ.resources)) {
    throw new AppError('INSUFFICIENT_RESOURCES', 'Недостаточно ресурсов для боевой операции', 400);
  }

  let contact: Contact | null = null;
  let aim = { x: 0, y: 0, z: 0 };
  let distanceLy = 0;

  if (def.requiresTarget) {
    if (!input.contactId) {
      throw new AppError('CONTACT_REQUIRED', 'Укажите contactId цели', 400);
    }
    contact = await prisma.contact.findFirst({
      where: { id: input.contactId, observerCivilizationId: civ.id },
    });
    if (!contact) throw new AppError('CONTACT_NOT_FOUND', 'Контакт не найден', 404);
    if (contact.isDestroyed) {
      throw new AppError('TARGET_DESTROYED', 'Цель уже уничтожена', 400);
    }
    distanceLy = contact.distance;
    aim = input.targetCoordinates ?? {
      x: contact.coordinatesX,
      y: contact.coordinatesY,
      z: contact.coordinatesZ,
    };
  }

  const keys = artifactKeysOf(civ.artifacts);
  const arts = sumArtifactEffects(keys);
  const techBonus = Math.min(0.35, (arts.radarBonus ?? 0) * 0.005 + civ.level * 0.002);
  const prepSec = combatPrepSeconds({
    attackType: input.attackType,
    distanceLy,
    techBonus,
  });

  const now = new Date();
  const prepFinishesAt = new Date(now.getTime() + prepSec * 1000);

  await prisma.$transaction(async (tx) => {
    const res = await tx.resourceState.findUnique({ where: { civilizationId: civ.id } });
    if (!res) throw new AppError('CIV_NOT_FOUND', 'Ресурсы не найдены', 404);
    if (!combatCostAffordable(def.cost, res)) {
      throw new AppError('INSUFFICIENT_RESOURCES', 'Недостаточно ресурсов для боевой операции', 400);
    }
    await tx.resourceState.update({
      where: { civilizationId: civ.id },
      data: {
        highEnergy: res.highEnergy - def.cost.highEnergy,
        antimatter: res.antimatter - def.cost.antimatter,
        darkEnergy: res.darkEnergy - def.cost.darkEnergy,
        darkMatter: res.darkMatter - def.cost.darkMatter,
        fermions: res.fermions - def.cost.fermions,
      },
    });

    await tx.combatAction.create({
      data: {
        attackerCivilizationId: civ.id,
        targetContactId: contact?.id ?? null,
        targetCivilizationId: contact?.targetCivilizationId ?? null,
        attackType: input.attackType,
        targetCoordinatesX: aim.x,
        targetCoordinatesY: aim.y,
        targetCoordinatesZ: aim.z,
        status: 'PREPARING',
        prepStartedAt: now,
        prepFinishesAt,
        seedChannel: `combat:${input.attackType}:${now.getTime()}`,
      },
    });

    await tx.journalEvent.create({
      data: {
        civilizationId: civ.id,
        type: 'combat',
        title: `Подготовка: ${def.nameRu}`,
        message: def.requiresTarget
          ? `Операция «${def.nameRu}» начата. Подготовка ~${prepSec} с. Цель: сектор (${aim.x.toFixed(0)}, ${aim.y.toFixed(0)}, ${aim.z.toFixed(0)}).`
          : `Операция «${def.nameRu}» начата. Подготовка ~${prepSec} с.`,
      },
    });
  });

  // Immediate catch-up if prep already done (won't be) + return state
  const state = await getUserCivilizationState(userId);
  if (!state) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  return {
    state,
    report: {
      type: 'combat_start',
      title: 'Боевая операция',
      message: `«${def.nameRu}» в фазе подготовки (~${prepSec} с).`,
    },
  };
}

export async function cancelCombatAction(
  userId: string,
  actionId: string
): Promise<{ state: GameState; report: { type: string; message: string } }> {
  const civ = await prisma.civilization.findUnique({ where: { userId } });
  if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  const action = await prisma.combatAction.findFirst({
    where: { id: actionId, attackerCivilizationId: civ.id },
  });
  if (!action) throw new AppError('ACTION_NOT_FOUND', 'Операция не найдена', 404);
  if (action.status !== 'PREPARING') {
    throw new AppError('CANNOT_CANCEL', 'Отменить можно только на фазе подготовки', 400);
  }

  const def = ATTACK_TYPES_BY_TYPE[action.attackType];
  // Refund 40%
  if (def && civ) {
    await prisma.$transaction(async (tx) => {
      const res = await tx.resourceState.findUnique({ where: { civilizationId: civ.id } });
      if (res) {
        await tx.resourceState.update({
          where: { civilizationId: civ.id },
          data: {
            highEnergy: res.highEnergy + Math.floor(def.cost.highEnergy * 0.4),
            antimatter: res.antimatter + Math.floor(def.cost.antimatter * 0.4),
            darkEnergy: res.darkEnergy + Math.floor(def.cost.darkEnergy * 0.4),
            darkMatter: res.darkMatter + Math.floor(def.cost.darkMatter * 0.4),
            fermions: res.fermions + Math.floor(def.cost.fermions * 0.4),
          },
        });
      }
      await tx.combatAction.update({
        where: { id: actionId },
        data: { status: 'CANCELLED', outcome: 'FAILED', resolvedAt: new Date() },
      });
      await tx.journalEvent.create({
        data: {
          civilizationId: civ.id,
          type: 'combat',
          title: 'Операция отменена',
          message: `«${attackTypeLabelRu(action.attackType)}» прервана. Возврат ~40% ресурсов.`,
        },
      });
    });
  }

  const state = await getUserCivilizationState(userId);
  if (!state) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  return {
    state,
    report: { type: 'combat_cancel', message: 'Операция отменена, частичный возврат ресурсов.' },
  };
}

export async function debugResolveAllCombat(userId: string): Promise<GameState> {
  const civRow = await prisma.civilization.findUnique({ where: { userId } });
  if (!civRow) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  await prisma.$transaction(async (tx) => {
    const past = new Date(Date.now() - 1000);
    await tx.combatAction.updateMany({
      where: {
        attackerCivilizationId: civRow.id,
        status: { in: ['PREPARING', 'IN_TRANSIT'] },
      },
      data: {
        prepFinishesAt: past,
        transitFinishesAt: past,
      },
    });
    // Load minimal civ for resolve
    const civ = (await tx.civilization.findUnique({
      where: { id: civRow.id },
      include: {
        resources: true,
        buildings: true,
        artifacts: true,
        discoveredAnomalies: true,
        expeditions: { where: { status: 'active' }, take: 1 },
        journal: { take: 1 },
      },
    })) as CivFull | null;
    if (!civ) return;
    // Force both phases
    const actions = await tx.combatAction.findMany({
      where: {
        attackerCivilizationId: civ.id,
        status: { in: ['PREPARING', 'IN_TRANSIT'] },
      },
    });
    for (const a of actions) {
      if (a.status === 'PREPARING') {
        const def = ATTACK_TYPES_BY_TYPE[a.attackType];
        if (def?.hasTransit) {
          await tx.combatAction.update({
            where: { id: a.id },
            data: { status: 'IN_TRANSIT', transitFinishesAt: past },
          });
        }
      }
      await resolveActionInTx(tx, civ, a.id);
    }
  });

  const state = await getUserCivilizationState(userId);
  if (!state) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  return state;
}

export async function debugGrantCombatResources(userId: string): Promise<GameState> {
  const civ = await prisma.civilization.findUnique({
    where: { userId },
    include: { resources: true },
  });
  if (!civ?.resources) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  await prisma.resourceState.update({
    where: { civilizationId: civ.id },
    data: {
      highEnergyCapacity: Math.max(civ.resources.highEnergyCapacity, 80000),
      antimatterCapacity: Math.max(civ.resources.antimatterCapacity, 5000),
      darkEnergyCapacity: Math.max(civ.resources.darkEnergyCapacity, 5000),
      darkMatterCapacity: Math.max(civ.resources.darkMatterCapacity, 5000),
      fermionsCapacity: Math.max(civ.resources.fermionsCapacity, 2000),
      highEnergy: Math.min(80000, civ.resources.highEnergy + 30000),
      antimatter: Math.min(5000, civ.resources.antimatter + 1000),
      darkEnergy: Math.min(5000, civ.resources.darkEnergy + 500),
      darkMatter: Math.min(5000, civ.resources.darkMatter + 500),
      fermions: Math.min(2000, civ.resources.fermions + 200),
    },
  });
  // Ensure level for dark strike testing
  if (civ.level < 20) {
    await prisma.civilization.update({
      where: { id: civ.id },
      data: { level: 20 },
    });
  }
  const state = await getUserCivilizationState(userId);
  if (!state) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  return state;
}

// re-export catch-up helper used from gameService
export { toGameState };
