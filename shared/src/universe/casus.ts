/**
 * Stage 11 — expedition casus (пасхалки). Flavor only, no rewards.
 */

import { createActionRng, rngInt } from '../rng';

export interface CasusDef {
  id: string;
  titleRu: string;
  bodyRu: string;
}

/** Chance on deep / rift expeditions (deterministic roll). */
export const CASUS_CHANCE = 0.08;

export const CASUS_CATALOG: readonly CasusDef[] = [
  {
    id: 'einstein_chess',
    titleRu: 'Партия вне времени',
    bodyRu:
      'На борту заброшенного корабля Эйнштейн играет с роботом в шахматы и тихо жалеет, что так и не «справился» с гравитационным взаимодействием. Робот делает рокировку. Пространство слегка морщится.',
  },
  {
    id: 'monkey_shakespeare',
    titleRu: 'Бесконечные обезьяны',
    bodyRu:
      'В герметичном отсеке обезьяна печатает на машинке полный текст «Гамлета». Опечатка только одна: «быть или не бить». Рядом стопка бананов и том Ницше.',
  },
  {
    id: 'hawking_sarcophagus',
    titleRu: 'Последний радиус',
    bodyRu:
      'Саркофаг с прахом Стивена Хокинга медленно дрейфует к горизонту событий. На табличке: «Information is not lost — only delayed». Сигнал обрывается на полуслове «black…».',
  },
  {
    id: 'schrodinger_cat',
    titleRu: 'Суперпозиция мурлыканья',
    bodyRu:
      'Кот Шрёдингера в ящике одновременно мурчит и не мурчит. Датчики фиксируют +1 и 0 жизней. Открывать ящик запрещено протоколом этики экспедиции.',
  },
  {
    id: 'voyager_lullaby',
    titleRu: 'Золотая пластинка',
    bodyRu:
      'Зонд Voyager на окраине сектора крутит послание: «не бойтесь». Затем — Chuck Berry. Радар на секунду показывает smiley из нейтрино.',
  },
  {
    id: 'iss_sock',
    titleRu: 'Потерянный носок',
    bodyRu:
      'В облаке космического мусора — один носок с МКС, размер 42. На бирке: «Property of Earth, return if found». Фермионный анализ подтверждает запах спортзала 2019 года.',
  },
  {
    id: 'last_programmer',
    titleRu: 'Памятник без StackOverflow',
    bodyRu:
      'Астероид-обелиск: «Последнему программисту, писавшему без StackOverflow». В основании — табличка 404 и пустой поиск `how to center a div`.',
  },
  {
    id: 'fermi_paradox_cafe',
    titleRu: 'Кафе «Где все?»',
    bodyRu:
      'Автомат выдаёт кофе с надписью Fermi Paradox Blend. В меню сто позиций, все «out of stock». Официант-дрон шепчет: «они просто не оставили чаевых».',
  },
  {
    id: 'maxwell_demon',
    titleRu: 'Демон у двери',
    bodyRu:
      'Крошечная дверь между двумя камерами: демон Максвелла сортирует молекулы и жалуется на профсоюз. Энтропия в журнале временно отрицательная (ошибка округления).',
  },
  {
    id: 'turing_tea',
    titleRu: 'Тест с чаем',
    bodyRu:
      'Терминал предлагает чай. Если ответить «да» — вас принимают за человека. Если «no» — за машину. Если промолчать — за дипломата Тёмного леса.',
  },
  {
    id: 'planck_pixel',
    titleRu: 'Пиксель Планка',
    bodyRu:
      'Найден объект размером с длину Планка. При зуме UI клиента падает до 1 FPS. Подпись: «do not screenshot».',
  },
  {
    id: 'dark_forest_sign',
    titleRu: 'Лесная табличка',
    bodyRu:
      'У нейтральной станции табличка: «Тише: вселенная слушает». Ниже граффити: «мы тоже». Датчики фиксируют чужой ping… и тишину.',
  },
  {
    id: 'bohr_bar',
    titleRu: 'Квантовый бар',
    bodyRu:
      'Бор и Гейзенберг спорят у стойки. Заказ неопределён, пока не наблюдают. Счёт приходит в суперпозиции «оплачен/не оплачен».',
  },
  {
    id: 'mars_invoice',
    titleRu: 'Счёт за тераформинг',
    bodyRu:
      'В обломках — счёт-фактура «Mars LLC» на 1 атмосферу, просрочен на 4.2 млрд лет. Штамп: unpaid. Кредитная история планеты — ужас.',
  },
] as const;

export function pickCasus(seed: string, nonce: number): CasusDef {
  const rng = createActionRng(seed, 'casus', nonce);
  const idx = rngInt(rng, 0, CASUS_CATALOG.length - 1);
  return CASUS_CATALOG[idx]!;
}

/** Returns casus if roll succeeds; null otherwise. Flavor only. */
export function rollCasus(
  seed: string,
  nonce: number,
  expeditionType: string
): CasusDef | null {
  // Prefer deeper scans
  const deep =
    expeditionType === 'deepExpedition' ||
    expeditionType === 'rift4D' ||
    expeditionType === 'probeSurvey';
  if (!deep && expeditionType !== 'localScan') return null;
  const rng = createActionRng(seed, 'casus-roll', nonce);
  const chance =
    expeditionType === 'localScan'
      ? CASUS_CHANCE * 0.25
      : expeditionType === 'probeSurvey'
        ? CASUS_CHANCE * 0.6
        : CASUS_CHANCE;
  if (rng() > chance) return null;
  return pickCasus(seed, nonce);
}
