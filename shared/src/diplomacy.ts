import {
  DATA_EXCHANGE_MIN_TRUST,
  DIPLOMACY_COST_AM_PACT,
  DIPLOMACY_COST_AM_ULTIMATUM,
  DIPLOMACY_COST_HE_BASE,
  DIPLOMACY_COST_HE_MAX,
  DIPLOMACY_COST_HE_PER_LY,
  DIPLOMACY_ENCRYPT_DM_COST,
  DIPLOMACY_EXPOSURE_BUMP,
  DIPLOMACY_EXPOSURE_BUMP_ENCRYPTED,
  LY_TO_SECONDS_MULTIPLIER,
  NEUTRALITY_PACT_MIN_TRUST,
  TENSION_GAIN_DATA_REJECT,
  TENSION_GAIN_GREETING,
  TENSION_GAIN_THREAT,
  TENSION_GAIN_ULTIMATUM,
  TENSION_LOSS_GREETING_REPLY,
  TENSION_LOSS_NEUTRALITY,
  TENSION_THRESHOLD_WAR,
  TRUST_GAIN_DATA_EXCHANGE,
  TRUST_GAIN_GREETING,
  TRUST_GAIN_NEUTRALITY,
  TRUST_LOSS_THREAT,
  TRUST_LOSS_ULTIMATUM,
} from './balance';
import { createActionRng, rngInt } from './rng';
import type { ContactBotData } from './contacts';

export type DiplomacyCardType =
  | 'GREETING'
  | 'DATA_EXCHANGE'
  | 'NEUTRALITY_PACT'
  | 'ULTIMATUM'
  | 'THREAT'
  | 'CEASE_COMM'
  | 'DECLARATION_OF_WAR'
  | 'REJECT'
  | 'ACCEPT';

export type ThreadStatus = 'active' | 'closed' | 'hostile';
export type MessageStatus = 'IN_TRANSIT' | 'DELIVERED' | 'READ' | 'REJECTED';

export interface DiplomacyCardDef {
  type: DiplomacyCardType;
  nameRu: string;
  descriptionRu: string;
  playerSelectable: boolean;
  minTrust?: number;
  /** Multiplier on HE distance cost (1 = base). */
  heCostMul: number;
  requiresAntimatter: number;
  canEncrypt: boolean;
}

export const DIPLOMACY_CARDS: DiplomacyCardDef[] = [
  {
    type: 'GREETING',
    nameRu: 'Приветствие / Зондаж',
    descriptionRu:
      'Отправить базовый математический паттерн для проверки адекватности приёмника. Низкая цена, слабый эффект.',
    playerSelectable: true,
    heCostMul: 1,
    requiresAntimatter: 0,
    canEncrypt: true,
  },
  {
    type: 'DATA_EXCHANGE',
    nameRu: 'Обмен данными',
    descriptionRu:
      'Передать карту ближайших аномалий в обмен на уточнение координат и уровня. Требует Доверия ≥ 30.',
    playerSelectable: true,
    minTrust: DATA_EXCHANGE_MIN_TRUST,
    heCostMul: 1.6,
    requiresAntimatter: 0,
    canEncrypt: true,
  },
  {
    type: 'NEUTRALITY_PACT',
    nameRu: 'Пакт о ненападении',
    descriptionRu:
      'Предложить взаимное игнорирование секторов. Требует Доверия ≥ 60. Дорого.',
    playerSelectable: true,
    minTrust: NEUTRALITY_PACT_MIN_TRUST,
    heCostMul: 2.2,
    requiresAntimatter: DIPLOMACY_COST_AM_PACT,
    canEncrypt: true,
  },
  {
    type: 'ULTIMATUM',
    nameRu: 'Ультиматум',
    descriptionRu:
      'Потребовать прекратить экспансию в данном секторе. Резко повышает Напряжение.',
    playerSelectable: true,
    heCostMul: 2,
    requiresAntimatter: DIPLOMACY_COST_AM_ULTIMATUM,
    canEncrypt: false,
  },
  {
    type: 'THREAT',
    nameRu: 'Угроза / Демонстрация силы',
    descriptionRu:
      'Отправить данные о мощи флота (реальные или преувеличенные). Может запугать или спровоцировать.',
    playerSelectable: true,
    heCostMul: 1.4,
    requiresAntimatter: 0,
    canEncrypt: false,
  },
  {
    type: 'CEASE_COMM',
    nameRu: 'Разорвать связь',
    descriptionRu: 'Прекратить любую передачу. Закрыть дипломатический канал. Бесплатно.',
    playerSelectable: true,
    heCostMul: 0,
    requiresAntimatter: 0,
    canEncrypt: false,
  },
];

export const DIPLOMACY_CARDS_BY_TYPE: Record<string, DiplomacyCardDef> = Object.fromEntries(
  DIPLOMACY_CARDS.map((c) => [c.type, c])
);

export interface DiplomacyCost {
  highEnergy: number;
  antimatter: number;
  darkMatter: number;
}

/** Light-speed delay in real seconds (MVP-scaled). Min 5s so UI can show transit. */
export function signalDelaySeconds(distanceLy: number, physicsDelayMul = 1): number {
  const raw = Math.max(0, distanceLy) * LY_TO_SECONDS_MULTIPLIER * Math.max(0.4, physicsDelayMul);
  return Math.max(5, Math.floor(raw));
}

export function diplomacyCardCost(
  cardType: DiplomacyCardType,
  distanceLy: number,
  useEncryption: boolean
): DiplomacyCost {
  if (cardType === 'CEASE_COMM') {
    return { highEnergy: 0, antimatter: 0, darkMatter: 0 };
  }
  const def = DIPLOMACY_CARDS_BY_TYPE[cardType];
  const mul = def?.heCostMul ?? 1;
  const raw = Math.floor(
    Math.max(1, distanceLy) * DIPLOMACY_COST_HE_PER_LY * mul + DIPLOMACY_COST_HE_BASE * mul
  );
  const he = Math.max(10, Math.min(DIPLOMACY_COST_HE_MAX, raw));
  const am = def?.requiresAntimatter ?? 0;
  const dm = useEncryption && def?.canEncrypt ? DIPLOMACY_ENCRYPT_DM_COST : 0;
  return { highEnergy: he, antimatter: am, darkMatter: dm };
}

export function diplomacyExposureBump(useEncryption: boolean): number {
  return useEncryption ? DIPLOMACY_EXPOSURE_BUMP_ENCRYPTED : DIPLOMACY_EXPOSURE_BUMP;
}

export function clampMetric(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export interface DiplomacyEffectResult {
  trustDelta: number;
  tensionDelta: number;
  improveContactAccuracy: boolean;
  closeThread: boolean;
  forceHostile: boolean;
  setContactStatus?: string;
  flavorRu: string;
}

/** Effects applied when a player card is *delivered* (before bot reply). */
export function playerCardDeliveryEffects(cardType: DiplomacyCardType): DiplomacyEffectResult {
  switch (cardType) {
    case 'GREETING':
      return {
        trustDelta: TRUST_GAIN_GREETING,
        tensionDelta: TENSION_GAIN_GREETING,
        improveContactAccuracy: false,
        closeThread: false,
        forceHostile: false,
        flavorRu:
          'Пакет приветствия доставлен. Базовый математический паттерн принят приёмником цели.',
      };
    case 'DATA_EXCHANGE':
      return {
        trustDelta: 0,
        tensionDelta: 0,
        improveContactAccuracy: false, // only if bot accepts
        closeThread: false,
        forceHostile: false,
        flavorRu: 'Предложение обмена данными доставлено. Ожидание решения цели.',
      };
    case 'NEUTRALITY_PACT':
      return {
        trustDelta: 0,
        tensionDelta: 0,
        improveContactAccuracy: false,
        closeThread: false,
        forceHostile: false,
        flavorRu: 'Черновик пакта о ненападении доставлен. Ожидание акцепта.',
      };
    case 'ULTIMATUM':
      return {
        trustDelta: -TRUST_LOSS_ULTIMATUM,
        tensionDelta: TENSION_GAIN_ULTIMATUM,
        improveContactAccuracy: false,
        closeThread: false,
        forceHostile: false,
        flavorRu: 'Ультиматум доставлен. Локальное напряжение канала возросло.',
      };
    case 'THREAT':
      return {
        trustDelta: -TRUST_LOSS_THREAT,
        tensionDelta: TENSION_GAIN_THREAT,
        improveContactAccuracy: false,
        closeThread: false,
        forceHostile: false,
        flavorRu: 'Демонстрация силы доставлена. Спектр угрозы зафиксирован.',
      };
    case 'CEASE_COMM':
      return {
        trustDelta: 0,
        tensionDelta: 0,
        improveContactAccuracy: false,
        closeThread: true,
        forceHostile: false,
        flavorRu: 'Канал закрыт. Темное молчание.',
      };
    default:
      return {
        trustDelta: 0,
        tensionDelta: 0,
        improveContactAccuracy: false,
        closeThread: false,
        forceHostile: false,
        flavorRu: 'Пакет доставлен.',
      };
  }
}

export interface BotReplyPlan {
  cardType: DiplomacyCardType;
  trustDelta: number;
  tensionDelta: number;
  acceptDataExchange: boolean;
  acceptPact: boolean;
  forceHostile: boolean;
  flavorRu: string;
  setContactStatus?: string;
}

/**
 * Deterministic bot reaction after player message is delivered.
 */
export function planBotReply(params: {
  seed: string;
  threadId: string;
  messageId: string;
  playerCard: DiplomacyCardType;
  trust: number;
  tension: number;
  observerLevel: number;
  bot: ContactBotData | null;
  contactLevelMin: number;
  contactLevelMax: number;
}): BotReplyPlan {
  const {
    seed,
    threadId,
    messageId,
    playerCard,
    trust,
    tension,
    observerLevel,
    bot,
    contactLevelMin,
    contactLevelMax,
  } = params;

  const rng = createActionRng(seed, `diplo_bot:${threadId}:${messageId}`, 0);
  const aggression = bot?.aggression ?? 40;
  const diplomacy = bot?.diplomacyFocus ?? 40;
  const botLevel = bot?.level ?? Math.floor((contactLevelMin + contactLevelMax) / 2);
  const stronger = botLevel >= observerLevel;

  if (playerCard === 'CEASE_COMM') {
    return {
      cardType: 'CEASE_COMM',
      trustDelta: 0,
      tensionDelta: 0,
      acceptDataExchange: false,
      acceptPact: false,
      forceHostile: false,
      flavorRu: 'Цель приняла режим молчания. Канал закрыт с обеих сторон.',
    };
  }

  // War check after player delivery tension will be applied by server first;
  // bot sees post-player metrics passed in.
  if (tension >= TENSION_THRESHOLD_WAR) {
    return {
      cardType: 'DECLARATION_OF_WAR',
      trustDelta: -30,
      tensionDelta: 0,
      acceptDataExchange: false,
      acceptPact: false,
      forceHostile: true,
      setContactStatus: 'hostile',
      flavorRu:
        'КРИТИЧЕСКИЙ ПРОТОКОЛ. Цель объявила состояние войны. Канал переведён в hostile. (Заготовка Этапа 6).',
    };
  }

  switch (playerCard) {
    case 'GREETING': {
      const peaceful = diplomacy >= 45 && aggression < 60;
      if (peaceful || rng() < 0.55 + diplomacy / 300 - aggression / 400) {
        return {
          cardType: 'GREETING',
          trustDelta: TRUST_GAIN_GREETING,
          tensionDelta: -TENSION_LOSS_GREETING_REPLY,
          acceptDataExchange: false,
          acceptPact: false,
          forceHostile: false,
          flavorRu:
            'Ответный математический паттерн. Цель подтвердила приём. Небольшой рост доверия.',
        };
      }
      if (aggression > 70 || rng() < aggression / 200) {
        return {
          cardType: 'THREAT',
          trustDelta: -TRUST_LOSS_THREAT,
          tensionDelta: TENSION_GAIN_THREAT,
          acceptDataExchange: false,
          acceptPact: false,
          forceHostile: false,
          flavorRu: 'Цель ответила демонстрацией силы. Канал напряжён.',
        };
      }
      return {
        cardType: 'REJECT',
        trustDelta: -2,
        tensionDelta: 4,
        acceptDataExchange: false,
        acceptPact: false,
        forceHostile: false,
        flavorRu: 'Молчание / отказ в подтверждении. Приёмник активен, но не дружелюбен.',
      };
    }
    case 'DATA_EXCHANGE': {
      if (trust >= DATA_EXCHANGE_MIN_TRUST && (diplomacy > 35 || rng() < 0.5 + trust / 200)) {
        return {
          cardType: 'ACCEPT',
          trustDelta: TRUST_GAIN_DATA_EXCHANGE,
          tensionDelta: -4,
          acceptDataExchange: true,
          acceptPact: false,
          forceHostile: false,
          flavorRu:
            'Цель приняла обмен. Получены уточняющие эфемериды. Точность контакта повышена.',
        };
      }
      return {
        cardType: 'REJECT',
        trustDelta: -6,
        tensionDelta: TENSION_GAIN_DATA_REJECT,
        acceptDataExchange: false,
        acceptPact: false,
        forceHostile: false,
        flavorRu: 'Обмен отклонён. Подозрение в разведке. Напряжение выросло.',
      };
    }
    case 'NEUTRALITY_PACT': {
      if (
        trust >= NEUTRALITY_PACT_MIN_TRUST &&
        !stronger &&
        aggression < 65 &&
        rng() < 0.4 + diplomacy / 200 + trust / 250
      ) {
        return {
          cardType: 'ACCEPT',
          trustDelta: TRUST_GAIN_NEUTRALITY,
          tensionDelta: -TENSION_LOSS_NEUTRALITY,
          acceptDataExchange: false,
          acceptPact: true,
          forceHostile: false,
          setContactStatus: 'allied',
          flavorRu:
            'Пакт о ненападении акцептован. Статус контакта: allied (нейтральный пакт).',
        };
      }
      if (stronger && aggression > 50) {
        return {
          cardType: 'THREAT',
          trustDelta: -12,
          tensionDelta: TENSION_GAIN_THREAT + 5,
          acceptDataExchange: false,
          acceptPact: false,
          forceHostile: false,
          flavorRu: 'Цель отвергла пакт с позиции силы. Канал дестабилизирован.',
        };
      }
      return {
        cardType: 'REJECT',
        trustDelta: -8,
        tensionDelta: 10,
        acceptDataExchange: false,
        acceptPact: false,
        forceHostile: false,
        flavorRu: 'Пакт отклонён. Формулировка «не сейчас».',
      };
    }
    case 'ULTIMATUM': {
      if (!stronger && (botLevel < observerLevel - 3 || rng() < 0.55)) {
        return {
          cardType: 'ACCEPT',
          trustDelta: -5,
          tensionDelta: -8,
          acceptDataExchange: false,
          acceptPact: false,
          forceHostile: false,
          setContactStatus: 'monitored',
          flavorRu:
            'Цель подчинилась ультиматуму (оценка силы не в её пользу). Экспансия заморожена (роль).',
        };
      }
      return {
        cardType: 'THREAT',
        trustDelta: -15,
        tensionDelta: TENSION_GAIN_ULTIMATUM,
        acceptDataExchange: false,
        acceptPact: false,
        forceHostile: tension + TENSION_GAIN_ULTIMATUM >= TENSION_THRESHOLD_WAR,
        flavorRu: stronger
          ? 'Цель отвергла ультиматум. Ответная угроза. Подготовка контрмер вероятна.'
          : 'Цель отвергла ультиматум несмотря на слабость. Иррациональная агрессия.',
      };
    }
    case 'THREAT': {
      const scared = aggression < 40 && !stronger;
      if (scared || rng() < 0.35 - aggression / 300) {
        return {
          cardType: 'REJECT',
          trustDelta: -3,
          tensionDelta: 6,
          acceptDataExchange: false,
          acceptPact: false,
          forceHostile: false,
          flavorRu: 'Цель снизила активность. Молчаливое признание угрозы.',
        };
      }
      return {
        cardType: 'THREAT',
        trustDelta: -8,
        tensionDelta: TENSION_GAIN_THREAT,
        acceptDataExchange: false,
        acceptPact: false,
        forceHostile: false,
        flavorRu: `Зеркальная демонстрация силы. Итерация угроз #${rngInt(rng, 1, 9)}.`,
      };
    }
    default:
      return {
        cardType: 'REJECT',
        trustDelta: 0,
        tensionDelta: 2,
        acceptDataExchange: false,
        acceptPact: false,
        forceHostile: false,
        flavorRu: 'Неклассифицированный ответ / шум канала.',
      };
  }
}

export function cardLabelRu(type: string): string {
  if (type === 'DECLARATION_OF_WAR') return 'Объявление войны';
  if (type === 'REJECT') return 'Отказ';
  if (type === 'ACCEPT') return 'Принятие';
  return DIPLOMACY_CARDS_BY_TYPE[type]?.nameRu ?? type;
}
