# Баланс и формулы — Тёмный Лес: Терра Инкогнита

Все формулы реализованы в `shared/src/formulas.ts` и `shared/src/balance.ts`.

## 1. Обозначения

| Символ | Смысл |
|--------|--------|
| L | Уровень здания или цивилизации |
| B | Базовая константа |
| r | Коэффициент роста (обычно 1.15–1.55) |
| S | Seed / детерминированный roll ∈ [0, 1) |

## 2. Стоимость улучшения здания

```
cost(L) = floor(baseCost * growth^L)
```

| Building | baseCost (HE) | growth | Эффект / уровень |
|----------|---------------|--------|------------------|
| high_energy_collider | 15 | 1.35 | +0.5 HE/s base production |
| research_node | 25 | 1.40 | +science power; unlocks better rolls |
| probe_factory | 40 | 1.45 | unlock expeditions quality (stub Stage 1) |
| fermion_synthesizer | 80 | 1.50 | fermions/s (locked early) |
| dark_sensor | 60 | 1.42 | radar/detection (stub) |

Производство коллайдера:

```
hePerSec = colliderLevel * 0.5 * (1 + civLevel * 0.02) * (1 + expansionFocus/200)
```

## 3. Стоимость уровня цивилизации

Для L → L+1 (L от 1 до 99):

```
# 1–60: в основном Высокие энергии
heCost(L) = floor(50 * 1.22^(L-1))

# 61–89: + Тёмная энергия
deCost(L) = floor(20 * 1.28^(L-60))   # 0 если L < 60

# 90–99: + дополнительные ресурсы (заготовка)
dmCost(L) = floor(10 * 1.30^(L-89))   # 0 если L < 89
amCost(L) = floor(15 * 1.25^(L-89))
```

Этап 1: списываем только HE; проверка DE/DM — заготовка (return 0 requirement если L < threshold).

## 4. Процветание (prosperity)

```
prosperity =
  civLevel * 100
  + sum(building.level) * 10
  + floor(log10(1 + totalResourcesMined)) * 25
  + artifacts * 50
  + successfulExpeditions * 5
  + contacts * 20
  + pacts * 30
  + combatWins * 40
```

MVP: упрощённо `civLevel*100 + buildings*10 + expeditions*5`.

## 5. Экспедиция Терра Инкогнита (Этап 1)

- Стоимость: `10 + floor(civLevel * 1.5)` HE
- Длительность: `3 + floor(civLevel * 0.1)` секунд (коротко для прототипа)
- Roll: `rng(seed, 'expedition', nonce)`

| Результат | Вес (base) | Модификаторы |
|-----------|------------|--------------|
| empty | 35 | — |
| resource_traces | 20 | +radar |
| anomaly | 15 | +risk |
| high_energy_find | 18 | +radar, +science |
| weak_signal | 12 | +radar, −secrecy target (N/A stage1) |

Награда HE find: `5 + floor(roll * 20 * (1 + radar/100))`

## 6. Обнаружение (Этап 4, формула-заготовка)

```
detectChance = clamp(
  0.05
  + sensors*0.01
  + (1 - targetSecrecy/100)*0.3
  - distanceFactor*0.2
  + anomalyNoise,
  0.01, 0.95
)

confidence = 0.3 + sensors*0.02 + science*0.01 - distanceFactor*0.15
levelNoise = floor((1 - confidence) * 15)
```

## 7. Бой (Этап 6, заготовка)

```
attackPower = civLevel * (1 + aggression/100) * techMul * artifactMul * budgetMul
defensePower = civLevel * (1 + secrecy/200) * techMul * anomalyDefMul
distancePenalty = 1 / (1 + distanceLY / 1000)
hitChance = attack / (attack + defense) * distancePenalty * intelQuality
```

## 8. Расстояние

Время сигнала (часы игры, абстракция):

```
signalHours = distanceLY / (civLevel * 10 + commTech * 50)
```

В Этапе 1 расстояние только отображается в gen мире.

## 9. Радар / Локация

`radarQuality` ∈ [1..100], генерируется при worldgen:

```
radarQuality = 20 + floor(rng * 60) + floor(scienceFocus/10)
```

Влияет на expedition weights и future loot tables.

## 10. Принципы баланса

1. Экспоненциальный рост стоимости.
2. Ранняя игра понятна (1 ресурс, 2–3 здания).
3. Поздняя игра рискованна (тёмный лес).
4. Сильный сигнал / низкая скрытность → выше шанс контакта-угрозы.
5. Pay-only HE/Fermions не ломают единственный путь прогресса.


## Stage 9 notes

См. комментарии в `shared/src/balance.ts` и `shared/src/progression.ts`.
MVP soft-caps на late HE/DE сохранены для тестируемости. Магазин: только HE/фермионы/ёмкости.
