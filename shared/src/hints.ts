/**
 * Stage 13 — contextual coach marks + handbook catalog.
 * Seen-state lives in client localStorage (no DB).
 * No spoilers: explain mechanics only.
 */

export type HintCategory = 'interface' | 'upgrade' | 'cosmos' | 'danger' | 'economy';

export const HINT_CATEGORY_LABELS: Record<HintCategory, string> = {
  interface: 'Интерфейс',
  upgrade: 'Прокачка',
  cosmos: 'Космос',
  danger: 'Опасность',
  economy: 'Экономика',
};

export interface HintDef {
  id: string;
  category: HintCategory;
  /** data-tutorial / data-hint target attribute value */
  target: string;
  titleRu: string;
  bodyRu: string;
  /**
   * When to auto-show once:
   * - boot: first sessions after tutorial (or immediately if tutorial done)
   * - tab: when primary tab opens
   * - open: when overlay/panel opens
   */
  trigger: 'boot' | 'tab' | 'open';
  /** For tab triggers */
  tab?: 'build' | 'explore' | 'scan';
  /** For open triggers */
  panel?: 'contacts' | 'weapons' | 'map' | 'anomalies' | 'bridge' | 'journal';
  /** Order within boot sequence */
  bootOrder?: number;
}

export const HINTS: HintDef[] = [
  // Boot basics (2–3), no spoilers
  {
    id: 'boot_costs',
    category: 'interface',
    target: 'primary-build',
    titleRu: 'Цены на виду',
    bodyRu:
      'Стоимость всегда рядом с кнопкой. Если ресурсов мало — цена краснеет и пишет, чего не хватает.',
    trigger: 'boot',
    bootOrder: 1,
  },
  {
    id: 'boot_tips',
    category: 'interface',
    target: 'resources',
    titleRu: 'Подсказки ⓘ',
    bodyRu:
      'Наведите или нажмите ⓘ у показателя — коротко: что это и зачем. Без скрытых кнопок.',
    trigger: 'boot',
    bootOrder: 2,
  },
  {
    id: 'boot_journal',
    category: 'interface',
    target: 'journal',
    titleRu: 'Журнал — голос игры',
    bodyRu:
      'События, цели и предупреждения приходят в журнал. Радар рядом: два способа смотреть на мир.',
    trigger: 'boot',
    bootOrder: 3,
  },

  // First open tabs / panels
  {
    id: 'first_build',
    category: 'upgrade',
    target: 'primary-build',
    titleRu: 'Строить',
    bodyRu:
      'Здания — основа. Коллайдер даёт высокие энергии. Цена улучшения — прямо у кнопки.',
    trigger: 'tab',
    tab: 'build',
  },
  {
    id: 'first_explore',
    category: 'cosmos',
    target: 'primary-explore',
    titleRu: 'Исследовать',
    bodyRu:
      'Экспедиции тратят ресурсы и время. Могут принести находки или сигнал — иногда это риск.',
    trigger: 'tab',
    tab: 'explore',
  },
  {
    id: 'first_scan',
    category: 'cosmos',
    target: 'primary-scan',
    titleRu: 'Сканировать',
    bodyRu:
      'Радар ищет соседей. Контакты — не враги автоматически, но Тёмный Лес не прощает шума.',
    trigger: 'tab',
    tab: 'scan',
  },
  {
    id: 'first_contacts',
    category: 'danger',
    target: 'contacts',
    titleRu: 'Контакты',
    bodyRu:
      'Здесь видны обнаруженные цивилизации. Дипломатия — в Рубке, бой — отдельно. Сначала смотрите, потом действуйте.',
    trigger: 'open',
    panel: 'contacts',
  },
  {
    id: 'first_weapons',
    category: 'danger',
    target: 'more-menu',
    titleRu: 'Оружие',
    bodyRu:
      'Верфь строит оружие за ресурсы. Применять можно к контакту. Это серьёзный шаг — не обязательный для развития.',
    trigger: 'open',
    panel: 'weapons',
  },
  {
    id: 'first_map',
    category: 'cosmos',
    target: 'more-menu',
    titleRu: 'Карта вселенной',
    bodyRu:
      'Иерархическая карта мира. Можно осматривать системы и возвращаться хлебными крошками. Не раскрывает чужие секреты сама по себе.',
    trigger: 'open',
    panel: 'map',
  },
  {
    id: 'first_anomalies',
    category: 'cosmos',
    target: 'journal',
    titleRu: 'Аномалии',
    bodyRu:
      'Странные явления попадают в список находок. Изучайте осторожно — не всё безопасно, но и не всё опасно.',
    trigger: 'open',
    panel: 'anomalies',
  },
  {
    id: 'first_bridge',
    category: 'cosmos',
    target: 'more-menu',
    titleRu: 'Рубка',
    bodyRu:
      'Центр дипломатии и обзора. Карточки сообщений тратят ресурсы; шифрование снижает шум, но стоит тёмной материи.',
    trigger: 'open',
    panel: 'bridge',
  },
  {
    id: 'level_costs',
    category: 'upgrade',
    target: 'level-up',
    titleRu: 'Уровень цивилизации',
    bodyRu:
      'Кнопка «Ур. ↑» показывает цену крупно. Красная цена — копите энергии. Уровень открывает новый контент.',
    trigger: 'boot',
    bootOrder: 4,
  },
  {
    id: 'visibility_warn',
    category: 'danger',
    target: 'resources',
    titleRu: 'Заметность',
    bodyRu:
      'Чем громче вы «светитесь», тем проще вас найти. Мощные сигналы и сканы поднимают заметность.',
    trigger: 'boot',
    bootOrder: 5,
  },
  {
    id: 'credits_shop',
    category: 'economy',
    target: 'resources',
    titleRu: 'Кредиты и магазин',
    bodyRu:
      'Кредиты покупают только высокие энергии, фермионы и ёмкость. Уровень и «тёмные» ресурсы за кредиты не продаются.',
    trigger: 'open',
    panel: 'bridge', // won't show until bridge; also listed in handbook after seen
  },
];

export function hintsByCategory(): Record<HintCategory, HintDef[]> {
  const out: Record<HintCategory, HintDef[]> = {
    interface: [],
    upgrade: [],
    cosmos: [],
    danger: [],
    economy: [],
  };
  for (const h of HINTS) out[h.category].push(h);
  return out;
}

export function bootHints(): HintDef[] {
  return HINTS.filter((h) => h.trigger === 'boot').sort(
    (a, b) => (a.bootOrder ?? 99) - (b.bootOrder ?? 99)
  );
}
