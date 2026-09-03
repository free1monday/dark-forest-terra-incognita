/**
 * Stage 12 — interactive tutorial steps + "what next" goal hints.
 */

export const TUTORIAL_STEPS = [
  {
    id: 'resources',
    target: 'resources',
    titleRu: 'Ресурсы',
    bodyRu: 'Это твои ресурсы. Главный — высокие энергии (ВЭ). Они нужны для зданий и уровней.',
  },
  {
    id: 'build',
    target: 'primary-build',
    titleRu: 'Строить',
    bodyRu: 'Здания — основа цивилизации. Жми «Строить», чтобы открыть список построек.',
  },
  {
    id: 'collider',
    target: 'building-collider',
    titleRu: 'Коллайдер',
    bodyRu: 'Построй или улучши коллайдер — он производит высокие энергии каждый тик.',
  },
  {
    id: 'explore',
    target: 'primary-explore',
    titleRu: 'Исследовать',
    bodyRu: 'Экспедиции приносят открытия, ресурсы и иногда контакты. Жми «Исследовать».',
  },
  {
    id: 'scan',
    target: 'primary-scan',
    titleRu: 'Сканировать',
    bodyRu: 'Радар и контакты — взгляд во Тьму. Сканирование ищет соседей.',
  },
  {
    id: 'contacts',
    target: 'contacts',
    titleRu: 'Тёмный Лес',
    bodyRu: 'Контакты могут быть опасны. Это Тёмный Лес: любой сигнал — риск. Дипломатия — в Рубке.',
  },
  {
    id: 'level',
    target: 'level-up',
    titleRu: 'Уровень',
    bodyRu: 'Копи ресурсы и повышай уровень цивилизации. Это открывает новые здания и экспедиции.',
  },
  {
    id: 'next',
    target: 'next-goal',
    titleRu: 'Что дальше?',
    bodyRu: 'Этот блок всегда подскажет одно главное действие. Следуй ему — и не запутаешься.',
  },
] as const;

export type TutorialStepId = (typeof TUTORIAL_STEPS)[number]['id'];
export type TutorialTarget = (typeof TUTORIAL_STEPS)[number]['target'];

export type NextGoalKind =
  | 'build_collider'
  | 'upgrade_building'
  | 'send_expedition'
  | 'check_contact'
  | 'level_up'
  | 'stockpile_energy';

export interface NextGoal {
  kind: NextGoalKind;
  titleRu: string;
  bodyRu: string;
  /** Primary action hint for UI */
  action: 'build' | 'explore' | 'scan' | 'level' | 'contacts' | 'wait';
}

export function computeNextGoal(input: {
  civLevel: number;
  highEnergy: number;
  darkEnergy: number;
  levelCostHe: number;
  levelCostDe: number;
  colliderLevel: number;
  buildingsTotalLevels: number;
  hasActiveExpedition: boolean;
  unhandledContacts: number;
  canAffordAnyBuildingUpgrade: boolean;
}): NextGoal {
  const {
    highEnergy,
    darkEnergy,
    levelCostHe,
    levelCostDe,
    colliderLevel,
    hasActiveExpedition,
    unhandledContacts,
    canAffordAnyBuildingUpgrade,
  } = input;

  if (colliderLevel <= 0) {
    return {
      kind: 'build_collider',
      titleRu: 'Построй коллайдер',
      bodyRu: 'Без коллайдера энергия почти не растёт. Открой «Строить» и улучши коллайдер.',
      action: 'build',
    };
  }

  const canLevel =
    highEnergy >= levelCostHe && (levelCostDe <= 0 || darkEnergy >= levelCostDe);
  if (canLevel && input.civLevel < 100) {
    return {
      kind: 'level_up',
      titleRu: 'Повысь уровень!',
      bodyRu: 'Ресурсов хватает на следующий уровень цивилизации. Это откроет новый контент.',
      action: 'level',
    };
  }

  if (unhandledContacts > 0) {
    return {
      kind: 'check_contact',
      titleRu: 'Проверь контакт',
      bodyRu: `Есть ${unhandledContacts} контакт(а) без внимания. Открой сканирование или Рубку.`,
      action: 'contacts',
    };
  }

  if (!hasActiveExpedition) {
    return {
      kind: 'send_expedition',
      titleRu: 'Отправь экспедицию',
      bodyRu: 'Свободные зонды ждут. Исследование приносит ресурсы и открытия.',
      action: 'explore',
    };
  }

  if (canAffordAnyBuildingUpgrade) {
    return {
      kind: 'upgrade_building',
      titleRu: 'Улучши здание',
      bodyRu: 'Хватает ВЭ на улучшение постройки. Зайди в «Строить».',
      action: 'build',
    };
  }

  return {
    kind: 'stockpile_energy',
    titleRu: 'Копи энергию',
    bodyRu: 'Подожди, пока коллайдер накопит высокие энергии. Можно открыть карту или журнал.',
    action: 'wait',
  };
}
