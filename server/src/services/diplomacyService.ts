import type { Contact, DiplomaticMessage, DiplomaticThread, Prisma } from '@prisma/client';
import {
  DATA_EXCHANGE_ACCURACY_BOOST,
  DATA_EXCHANGE_LEVEL_RANGE_SHRINK,
  DATA_EXCHANGE_MIN_TRUST,
  DIPLOMACY_CARDS,
  NEUTRALITY_PACT_MIN_TRUST,
  TENSION_THRESHOLD_WAR,
  cardLabelRu,
  clampMetric,
  diplomacyCardCost,
  diplomacyExposureBump,
  planBotReply,
  playerCardDeliveryEffects,
  signalDelaySeconds,
  type ContactBotData,
  type DiplomacyCardType,
  type GameContact,
  type GameDiplomacyMessage,
  type GameDiplomacyThread,
  type GameState,
} from '@shared';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';
import { contactToGame } from './contactService.js';
import { getUserCivilizationState, invalidateStateCache } from './gameService.js';
import { physicsOf } from './stateService.js';

type ThreadFull = DiplomaticThread & {
  contact: Contact & { target?: { name: string } | null };
  messages: DiplomaticMessage[];
};

function parseBot(contact: Contact): ContactBotData | null {
  if (!contact.targetBotData) return null;
  try {
    return JSON.parse(contact.targetBotData) as ContactBotData;
  } catch {
    return null;
  }
}

function msgToGame(m: DiplomaticMessage, now: Date): GameDiplomacyMessage {
  const eta =
    m.status === 'IN_TRANSIT'
      ? Math.max(0, Math.ceil((m.deliverAt.getTime() - now.getTime()) / 1000))
      : 0;
  return {
    id: m.id,
    senderIsObserver: m.senderIsObserver,
    cardType: m.cardType,
    cardLabel: cardLabelRu(m.cardType),
    textFlavor: m.textFlavor,
    sentAt: m.sentAt.toISOString(),
    deliverAt: m.deliverAt.toISOString(),
    status: m.status,
    etaSeconds: eta,
  };
}

function improveContactAccuracy(contact: Contact): Prisma.ContactUpdateInput {
  const newConf = Math.min(0.95, contact.confidence + DATA_EXCHANGE_ACCURACY_BOOST);
  const newAcc = Math.min(0.95, contact.distanceAccuracy + DATA_EXCHANGE_ACCURACY_BOOST * 0.8);
  const span = Math.max(1, contact.levelMax - contact.levelMin);
  const newSpan = Math.max(2, Math.floor(span * (1 - DATA_EXCHANGE_LEVEL_RANGE_SHRINK)));
  const mid = (contact.levelMin + contact.levelMax) / 2;
  const levelMin = Math.max(1, Math.floor(mid - newSpan / 2));
  const levelMax = Math.min(100, Math.ceil(mid + newSpan / 2));
  const noise = Math.max(20, Math.floor(contact.distanceNoise * (1 - DATA_EXCHANGE_ACCURACY_BOOST)));
  return {
    confidence: newConf,
    distanceAccuracy: newAcc,
    levelAccuracy: Math.min(0.95, contact.levelAccuracy + DATA_EXCHANGE_ACCURACY_BOOST),
    coordinatesAccuracy: Math.min(0.95, contact.coordinatesAccuracy + DATA_EXCHANGE_ACCURACY_BOOST * 0.7),
    levelMin,
    levelMax,
    distanceNoise: noise,
  };
}

async function applyMessageDelivery(
  tx: Prisma.TransactionClient,
  thread: ThreadFull,
  message: DiplomaticMessage,
  civSeed: string,
  observerLevel: number,
  physicsDelayMul = 1
): Promise<void> {
  if (message.status !== 'IN_TRANSIT') return;
  if (message.deliverAt.getTime() > Date.now()) return;

  await tx.diplomaticMessage.update({
    where: { id: message.id },
    data: { status: 'DELIVERED' },
  });

  // Player outbound card
  if (message.senderIsObserver) {
    const card = message.cardType as DiplomacyCardType;
    const effects = playerCardDeliveryEffects(card);

    let trust = clampMetric(thread.trust + effects.trustDelta);
    let tension = clampMetric(thread.tension + effects.tensionDelta);
    let status = thread.status;
    let contactStatus: string | undefined = effects.setContactStatus;

    if (effects.closeThread) {
      status = 'closed';
    }

    // Bot reply (unless closed / cease)
    if (!effects.closeThread && status !== 'closed' && status !== 'hostile') {
      const bot = parseBot(thread.contact);
      const plan = planBotReply({
        seed: civSeed,
        threadId: thread.id,
        messageId: message.id,
        playerCard: card,
        trust,
        tension,
        observerLevel,
        bot,
        contactLevelMin: thread.contact.levelMin,
        contactLevelMax: thread.contact.levelMax,
      });

      trust = clampMetric(trust + plan.trustDelta);
      tension = clampMetric(tension + plan.tensionDelta);

      if (plan.acceptDataExchange) {
        await tx.contact.update({
          where: { id: thread.contactId },
          data: improveContactAccuracy(thread.contact),
        });
      }
      if (plan.acceptPact || plan.setContactStatus) {
        contactStatus = plan.setContactStatus ?? contactStatus ?? 'allied';
      }
      if (plan.forceHostile || tension >= TENSION_THRESHOLD_WAR) {
        status = 'hostile';
        tension = Math.max(tension, TENSION_THRESHOLD_WAR);
        contactStatus = 'hostile';
      }

      const delaySec = signalDelaySeconds(thread.contact.distance, physicsDelayMul);
      const now = new Date();
      const deliverAt = new Date(now.getTime() + delaySec * 1000);
      const replyCard =
        plan.forceHostile || tension >= TENSION_THRESHOLD_WAR
          ? 'DECLARATION_OF_WAR'
          : plan.cardType;

      await tx.diplomaticMessage.create({
        data: {
          threadId: thread.id,
          senderIsObserver: false,
          cardType: replyCard,
          textFlavor: plan.flavorRu,
          sentAt: now,
          deliverAt,
          status: 'IN_TRANSIT',
          encrypted: false,
        },
      });

      // If war declaration is instant flavor, still in transit for light delay
      if (replyCard === 'DECLARATION_OF_WAR') {
        status = 'hostile';
        contactStatus = 'hostile';
      }
    }

    await tx.diplomaticThread.update({
      where: { id: thread.id },
      data: { trust, tension, status },
    });

    if (contactStatus) {
      await tx.contact.update({
        where: { id: thread.contactId },
        data: { status: contactStatus },
      });
    }

    // Update local thread snapshot for subsequent deliveries in same catch-up
    thread.trust = trust;
    thread.tension = tension;
    thread.status = status;
  } else {
    // Bot message delivered — just mark delivered; metrics already applied on send planning
    // If DECLARATION_OF_WAR arrives, ensure hostile
    if (message.cardType === 'DECLARATION_OF_WAR') {
      await tx.diplomaticThread.update({
        where: { id: thread.id },
        data: { status: 'hostile', tension: Math.max(thread.tension, TENSION_THRESHOLD_WAR) },
      });
      await tx.contact.update({
        where: { id: thread.contactId },
        data: { status: 'hostile' },
      });
      thread.status = 'hostile';
    }
  }
}

export async function catchUpThread(
  tx: Prisma.TransactionClient,
  threadId: string,
  civSeed: string,
  observerLevel: number,
  physicsDelayMul = 1
): Promise<ThreadFull> {
  let thread = (await tx.diplomaticThread.findUnique({
    where: { id: threadId },
    include: {
      contact: { include: { target: { select: { name: true } } } },
      messages: { orderBy: { sentAt: 'asc' } },
    },
  })) as ThreadFull | null;
  if (!thread) throw new AppError('THREAD_NOT_FOUND', 'Дипломатический канал не найден', 404);

  const due = thread.messages
    .filter((m) => m.status === 'IN_TRANSIT' && m.deliverAt.getTime() <= Date.now())
    .sort((a, b) => a.deliverAt.getTime() - b.deliverAt.getTime());

  for (const m of due) {
    // reload thread metrics each time
    thread = (await tx.diplomaticThread.findUnique({
      where: { id: threadId },
      include: {
        contact: { include: { target: { select: { name: true } } } },
        messages: { orderBy: { sentAt: 'asc' } },
      },
    })) as ThreadFull;
    const freshMsg = thread.messages.find((x) => x.id === m.id);
    if (freshMsg) {
      await applyMessageDelivery(tx, thread, freshMsg, civSeed, observerLevel, physicsDelayMul);
    }
  }

  return (await tx.diplomaticThread.findUnique({
    where: { id: threadId },
    include: {
      contact: { include: { target: { select: { name: true } } } },
      messages: { orderBy: { sentAt: 'asc' } },
    },
  })) as ThreadFull;
}

function buildThreadDto(
  thread: ThreadFull,
  resources: {
    highEnergy: number;
    antimatter: number;
    darkMatter: number;
  },
  now = new Date()
): GameDiplomacyThread {
  const contact = contactToGame(thread.contact, thread.contact.target?.name);
  contact.threadId = thread.id;
  contact.trust = thread.trust;
  contact.tension = thread.tension;
  contact.threadStatus = thread.status;

  const distance = thread.contact.distance;
  const availableCards = DIPLOMACY_CARDS.filter((c) => c.playerSelectable).map((c) => {
    const cost = diplomacyCardCost(c.type, distance, false);
    const costEnc = diplomacyCardCost(c.type, distance, true);
    const reasons: string[] = [];
    if (thread.status === 'closed') reasons.push('Канал закрыт');
    if (thread.status === 'hostile') reasons.push('Канал враждебен (война)');
    if (c.minTrust != null && thread.trust < c.minTrust) {
      reasons.push(`Требуется доверие ≥ ${c.minTrust} (сейчас ${thread.trust})`);
    }
    if (resources.highEnergy < cost.highEnergy) reasons.push('Недостаточно высоких энергий');
    if (resources.antimatter < cost.antimatter) reasons.push('Недостаточно антиматерии');
    // encryption optional — unlock without requiring DM
    return {
      type: c.type,
      name: c.nameRu,
      description: c.descriptionRu,
      cost,
      costEncrypted: costEnc,
      unlocked: reasons.length === 0,
      reasons,
      canEncrypt: c.canEncrypt,
    };
  });

  return {
    id: thread.id,
    contactId: thread.contactId,
    status: thread.status,
    trust: thread.trust,
    tension: thread.tension,
    contact,
    messages: thread.messages.map((m) => msgToGame(m, now)),
    availableCards: availableCards.map(({ costEncrypted: _c, ...rest }) => rest),
    serverTime: now.toISOString(),
  };
}

// attach costEncrypted only server-side helper — strip for Game type compatibility
// GameDiplomacyThread.availableCards doesn't include costEncrypted in type — OK

export async function initiateThread(
  userId: string,
  contactId: string
): Promise<{ thread: GameDiplomacyThread; state: GameState }> {
  invalidateStateCache();
  const civ = await prisma.civilization.findUnique({
    where: { userId },
    include: { resources: true },
  });
  if (!civ || !civ.resources) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, observerCivilizationId: civ.id },
  });
  if (!contact) throw new AppError('CONTACT_NOT_FOUND', 'Контакт не найден', 404);

  let thread = await prisma.diplomaticThread.findUnique({
    where: { contactId },
    include: {
      contact: { include: { target: { select: { name: true } } } },
      messages: { orderBy: { sentAt: 'asc' } },
    },
  });

  if (!thread) {
    thread = await prisma.diplomaticThread.create({
      data: {
        observerCivilizationId: civ.id,
        contactId,
        status: 'active',
        trust: 50,
        tension: contact.isFalsePositive ? 10 : 5,
      },
      include: {
        contact: { include: { target: { select: { name: true } } } },
        messages: { orderBy: { sentAt: 'asc' } },
      },
    });
    if (contact.status === 'detected' || contact.status === 'monitored') {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { status: 'contacted' },
      });
    }
    await prisma.journalEvent.create({
      data: {
        civilizationId: civ.id,
        type: 'diplomacy',
        title: 'Дипломатический канал открыт',
        message: `Открыт кабинет связи с контактом. Расстояние ~${Math.floor(contact.distance)} св. л. Молчание — золото.`,
      },
    });
  }

  const caught = await prisma.$transaction(async (tx) =>
    catchUpThread(tx, thread!.id, civ.seed, civ.level, physicsOf(civ).diplomacyDelayMul)
  );

  const state = await getUserCivilizationState(userId);
  if (!state) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  return {
    thread: buildThreadDto(caught, {
      highEnergy: civ.resources.highEnergy,
      antimatter: civ.resources.antimatter,
      darkMatter: civ.resources.darkMatter,
    }),
    state,
  };
}

export async function getThread(
  userId: string,
  threadId: string
): Promise<{ thread: GameDiplomacyThread; state: GameState }> {
  const civ = await prisma.civilization.findUnique({
    where: { userId },
    include: { resources: true },
  });
  if (!civ || !civ.resources) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  const existing = await prisma.diplomaticThread.findFirst({
    where: { id: threadId, observerCivilizationId: civ.id },
  });
  if (!existing) throw new AppError('THREAD_NOT_FOUND', 'Дипломатический канал не найден', 404);

  const caught = await prisma.$transaction(async (tx) =>
    catchUpThread(tx, threadId, civ.seed, civ.level, physicsOf(civ).diplomacyDelayMul)
  );

  // refresh resources after catch-up (no spend here)
  const res = await prisma.resourceState.findUnique({ where: { civilizationId: civ.id } });
  const state = await getUserCivilizationState(userId);
  if (!state || !res) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  return {
    thread: buildThreadDto(caught, {
      highEnergy: res.highEnergy,
      antimatter: res.antimatter,
      darkMatter: res.darkMatter,
    }),
    state,
  };
}

export async function sendDiplomacyCard(
  userId: string,
  threadId: string,
  cardType: DiplomacyCardType,
  useEncryption: boolean
): Promise<{ thread: GameDiplomacyThread; state: GameState; report: { type: string; message: string; title?: string } }> {
  invalidateStateCache();
  const selectable = DIPLOMACY_CARDS.find((c) => c.type === cardType && c.playerSelectable);
  if (!selectable && cardType !== 'CEASE_COMM') {
    // CEASE is selectable
  }
  if (!DIPLOMACY_CARDS.some((c) => c.type === cardType && c.playerSelectable)) {
    throw new AppError('INVALID_CARD', 'Неизвестная дипломатическая карточка', 400);
  }

  const civ = await prisma.civilization.findUnique({
    where: { userId },
    include: { resources: true },
  });
  if (!civ || !civ.resources) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  if (civ.commJammedUntil && civ.commJammedUntil.getTime() > Date.now()) {
    throw new AppError(
      'COMM_JAMMED',
      'Связь подавлена (jamming). Дипломатические пакеты недоступны до снятия помех.',
      400
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    let thread = await catchUpThread(tx, threadId, civ.seed, civ.level, physicsOf(civ).diplomacyDelayMul);
    if (thread.observerCivilizationId !== civ.id) {
      throw new AppError('THREAD_NOT_FOUND', 'Дипломатический канал не найден', 404);
    }
    if (thread.status === 'closed' && cardType !== 'CEASE_COMM') {
      throw new AppError('THREAD_CLOSED', 'Канал закрыт', 400);
    }
    if (thread.status === 'hostile' && cardType !== 'CEASE_COMM') {
      throw new AppError('THREAD_HOSTILE', 'Канал враждебен. Дипломатия недоступна.', 400);
    }

    const def = DIPLOMACY_CARDS.find((c) => c.type === cardType)!;
    if (def.minTrust != null && thread.trust < def.minTrust) {
      throw new AppError(
        'TRUST_TOO_LOW',
        `Недостаточно доверия (нужно ≥ ${def.minTrust}, сейчас ${thread.trust})`,
        400
      );
    }

    const encrypt = useEncryption && def.canEncrypt;
    const cost = diplomacyCardCost(cardType, thread.contact.distance, encrypt);
    const res = await tx.resourceState.findUnique({ where: { civilizationId: civ.id } });
    if (!res) throw new AppError('CIV_NOT_FOUND', 'Ресурсы не найдены', 404);
    if (
      res.highEnergy < cost.highEnergy ||
      res.antimatter < cost.antimatter ||
      res.darkMatter < cost.darkMatter
    ) {
      throw new AppError('INSUFFICIENT_RESOURCES', 'Недостаточно ресурсов для передачи', 400);
    }

    await tx.resourceState.update({
      where: { civilizationId: civ.id },
      data: {
        highEnergy: res.highEnergy - cost.highEnergy,
        antimatter: res.antimatter - cost.antimatter,
        darkMatter: res.darkMatter - cost.darkMatter,
      },
    });

    const bump = diplomacyExposureBump(encrypt);
    await tx.civilization.update({
      where: { id: civ.id },
      data: { signalExposure: Math.round((civ.signalExposure + bump) * 1000) / 1000 },
    });

    const now = new Date();
    const delaySec =
      cardType === 'CEASE_COMM'
        ? 0
        : signalDelaySeconds(thread.contact.distance, physicsOf(civ).diplomacyDelayMul);
    const deliverAt = new Date(now.getTime() + delaySec * 1000);

    const effectsPreview = playerCardDeliveryEffects(cardType);
    const flavor =
      cardType === 'CEASE_COMM'
        ? effectsPreview.flavorRu
        : `Исходящий пакет «${cardLabelRu(cardType)}». ` +
          `Задержка ~${delaySec} с (~${Math.floor(thread.contact.distance)} св. л.). ` +
          (encrypt ? 'Канал: шифрование (ТМ). ' : 'Канал: открытый. ') +
          `Стоимость: ВЭ ${cost.highEnergy}` +
          (cost.antimatter ? `, АМ ${cost.antimatter}` : '') +
          (cost.darkMatter ? `, ТМ ${cost.darkMatter}` : '') +
          `.`;

    await tx.diplomaticMessage.create({
      data: {
        threadId: thread.id,
        senderIsObserver: true,
        cardType,
        textFlavor: flavor,
        sentAt: now,
        deliverAt,
        status: delaySec === 0 ? 'DELIVERED' : 'IN_TRANSIT',
        encrypted: encrypt,
      },
    });

    await tx.diplomaticThread.update({
      where: { id: thread.id },
      data: { messageNonce: thread.messageNonce + 1 },
    });

    if (cardType === 'CEASE_COMM') {
      await tx.diplomaticThread.update({
        where: { id: thread.id },
        data: { status: 'closed' },
      });
    }

    await tx.journalEvent.create({
      data: {
        civilizationId: civ.id,
        type: 'diplomacy',
        title: `Сигнал отправлен: ${cardLabelRu(cardType)}`,
        message: flavor,
      },
    });

    // Immediate catch-up for zero-delay / already due
    thread = await catchUpThread(tx, thread.id, civ.seed, civ.level, physicsOf(civ).diplomacyDelayMul);
    return thread;
  });

  const res = await prisma.resourceState.findUnique({ where: { civilizationId: civ.id } });
  const state = await getUserCivilizationState(userId);
  if (!state || !res) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  return {
    thread: buildThreadDto(result, {
      highEnergy: res.highEnergy,
      antimatter: res.antimatter,
      darkMatter: res.darkMatter,
    }),
    state,
    report: {
      type: 'diplomacy_send',
      title: 'Сигнал отправлен',
      message: `Карточка ${cardLabelRu(cardType)} поставлена в очередь передачи.`,
    },
  };
}

export async function debugDeliverAll(userId: string): Promise<GameState> {
  const civ = await prisma.civilization.findUnique({ where: { userId } });
  if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  await prisma.$transaction(async (tx) => {
    const threads = await tx.diplomaticThread.findMany({
      where: { observerCivilizationId: civ.id },
      select: { id: true },
    });
    const past = new Date(Date.now() - 1000);
    await tx.diplomaticMessage.updateMany({
      where: {
        threadId: { in: threads.map((t) => t.id) },
        status: 'IN_TRANSIT',
      },
      data: { deliverAt: past },
    });
    for (const t of threads) {
      await catchUpThread(tx, t.id, civ.seed, civ.level, physicsOf(civ).diplomacyDelayMul);
    }
  });

  const state = await getUserCivilizationState(userId);
  if (!state) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  return state;
}

export async function debugResetDiplomacyMetrics(
  userId: string,
  threadId?: string
): Promise<GameState> {
  const civ = await prisma.civilization.findUnique({ where: { userId } });
  if (!civ) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);

  await prisma.diplomaticThread.updateMany({
    where: {
      observerCivilizationId: civ.id,
      ...(threadId ? { id: threadId } : {}),
    },
    data: { trust: 50, tension: 0, status: 'active' },
  });

  const state = await getUserCivilizationState(userId);
  if (!state) throw new AppError('CIV_NOT_FOUND', 'Цивилизация не найдена', 404);
  return state;
}

/** Enrich GameContact with thread summary — used by stateService */
export function enrichContactWithThread(
  contact: GameContact,
  thread: { id: string; trust: number; tension: number; status: string } | null | undefined
): GameContact {
  if (!thread) {
    return {
      ...contact,
      threadId: contact.threadId ?? null,
      trust: contact.trust ?? null,
      tension: contact.tension ?? null,
      threadStatus: contact.threadStatus ?? null,
    };
  }
  return {
    ...contact,
    threadId: thread.id,
    trust: thread.trust,
    tension: thread.tension,
    threadStatus: thread.status,
  };
}

// silence unused imports of trust constants used only in shared
void DATA_EXCHANGE_MIN_TRUST;
void NEUTRALITY_PACT_MIN_TRUST;
