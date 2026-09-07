/**
 * Stage 13 — plain-language tooltips (RU). No spoilers.
 */
import type { BuildingId, ResourceId } from '@shared';
import { BUILDINGS } from '@shared';

export type MetricId =
  | 'prosperity'
  | 'visibility'
  | 'population'
  | 'credits'
  | 'radar'
  | 'level';

export const METRIC_TIPS: Record<
  MetricId,
  { title: string; body: string; links?: string }
> = {
  prosperity: {
    title: 'Процветание',
    body: 'Общий прогресс цивилизации. Чем выше, тем выше место в рейтинге.',
    links: 'Растёт от уровня, зданий и успешных экспедиций.',
  },
  visibility: {
    title: 'Заметность',
    body: 'Насколько громко вы «шумите» в Тёмном Лесу. Чем выше — тем быстрее вас найдут другие.',
    links: 'Растёт от мощных построек и активных сигналов. Связь: выше заметность → больше риск контактов.',
  },
  population: {
    title: 'Население',
    body: 'Жители вашей цивилизации.',
    links: 'Растёт со временем, если есть энергия и колонии.',
  },
  credits: {
    title: 'Кредиты',
    body: 'Валюта для покупок в магазине.',
    links: 'Можно купить высокие энергии, фермионы и ёмкость складов. Не покупает уровень и «тёмные» ресурсы.',
  },
  radar: {
    title: 'Радар',
    body: 'Качество радара. Чем лучше — тем дальше и точнее вы находите другие цивилизации.',
    links: 'Связь: радар открывает контакты. Улучшается тёмным сенсором и фокусом на науку.',
  },
  level: {
    title: 'Уровень цивилизации',
    body: 'Главная ступень прогресса. Открывает здания, экспедиции и поздний контент.',
    links: 'Связь: уровень → новые возможности; стоимость растёт, но энергия тоже.',
  },
};

export const RESOURCE_TIPS: Record<
  ResourceId,
  { title: string; body: string; links?: string }
> = {
  highEnergy: {
    title: 'Высокие энергии',
    body: 'Основной ресурс ранней и средней игры. Нужны для зданий, уровней и многих действий.',
    links: 'Главный источник — коллайдер. Можно докупить в магазине.',
  },
  antimatter: {
    title: 'Антиматерия',
    body: 'Плотное топливо и боевой ресурс. Нужна для флота, дальних вылазок и оружия.',
    links: 'Нельзя купить напрямую — только геймплей.',
  },
  darkEnergy: {
    title: 'Тёмная энергия',
    body: 'Энергия пространства. Важна на высоких уровнях и для редких действий.',
    links: 'Нельзя купить напрямую. Добывается сифоном и находками.',
  },
  darkMatter: {
    title: 'Тёмная материя',
    body: 'Скрытность, сенсоры, шифрование каналов.',
    links: 'Нельзя купить напрямую. Связь: помогает тише говорить с другими.',
  },
  fermions: {
    title: 'Фермионы',
    body: 'Строительные частицы материи. Нужны для редких и дорогих проектов.',
    links: 'Можно купить в магазине (заглушка покупок).',
  },
};

/** Dynamic building tip: what it gives now + why. */
export function buildingTip(
  id: BuildingId,
  level: number,
  extras?: { hePerSec?: number; radarBonus?: number }
): { title: string; body: string; links?: string } {
  const def = BUILDINGS[id];
  switch (id) {
    case 'high_energy_collider': {
      const rate =
        extras?.hePerSec != null
          ? extras.hePerSec
          : Math.max(0, level) * def.hePerLevel * 0.1;
      return {
        title: 'Коллайдер высоких энергий',
        body: `+${formatSoft(rate)} ⚡/с сейчас (ур. ${level}). Основной источник высоких энергий для прокачки.`,
        links: 'Связь: больше энергии → быстрее здания и уровни.',
      };
    }
    case 'research_node':
      return {
        title: 'Исследовательский узел',
        body: `+${level}% к научному множителю производства и качеству находок.`,
        links: 'Связь: наука усиливает и коллайдер, и экспедиции.',
      };
    case 'probe_factory':
      return {
        title: 'Зондовый завод',
        body: `Ур. ${level}. Помогает разведке и слабым сигналам.`,
        links: 'Связь: лучше зонды → больше шансов что-то найти в экспедициях.',
      };
    case 'dark_sensor': {
      const bonus = extras?.radarBonus ?? level * 5;
      return {
        title: 'Тёмный сенсор',
        body: `+${bonus} к радару (ур. ${level}). Дальше и точнее видите соседей.`,
        links: 'Связь: радар открывает контакты. Нужен для сложных экспедиций.',
      };
    }
    case 'fermion_synthesizer':
      return {
        title: 'Фермионный синтезатор',
        body: `Ур. ${level}. Готовит производство фермионов для поздней игры.`,
        links: 'Связь: фермионы — для редких построек и проектов.',
      };
    case 'dark_energy_siphon':
      return {
        title: 'Сифон вакуума',
        body: `+${formatSoft(level * 0.08)} ТЭ/с (база). Добывает тёмную энергию.`,
        links: 'Связь: тёмная энергия нужна на высоких уровнях. Нельзя заменить покупкой.',
      };
    default:
      return { title: id, body: 'Постройка цивилизации.' };
  }
}

function formatSoft(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 10) return n.toFixed(1);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(3);
}

export const ACTION_TIPS = {
  expedition: {
    title: 'Экспедиция',
    body: 'Отправка зондов в неизвестность. Может принести ресурсы, находки или сигнал.',
    links: 'Связь: активные сигналы чуть повышают заметность.',
  },
  weapon_build: {
    title: 'Оружие',
    body: 'Строительство на верфи. Готовое оружие можно применить к контакту.',
    links: 'Связь: нужна цель-контакт. Не ломает мир само по себе.',
  },
  level_up: {
    title: 'Повышение уровня',
    body: 'Тратит ресурсы и открывает новый контент.',
    links: 'Смотрите цену рядом с кнопкой — если красная, не хватает запаса.',
  },
} as const;
