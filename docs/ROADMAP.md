# Дорожная карта

## Этап 0 — Документация и архитектура ✅

- README, GDD, ARCHITECTURE, BALANCE, ASSUMPTIONS, ROADMAP
- Структура monorepo
- Shared типы и формулы

## Этап 1 — Локальный прототип ✅

- Создание цивилизации + константы
- Seeded worldgen
- Ресурсы, тик, localStorage
- Постройки (Collider, Research Node; Probe stub)
- Уровень цивилизации 1–10+
- Detail panel по клику
- Экспедиция TI (упрощённая)
- Журнал, слоган, dark-blue UI
- Debug panel

## Этап 2 — Сервер и сохранение ✅

- Fastify + Prisma + SQLite
- Регистрация / вход (JWT)
- Civilization на сервере (1 на user)
- Lazy server catch-up + offline progress (cap 2h)
- Валидация действий (Zod), integer resources
- Клиент переведён на API (localStorage save больше не source of truth)

## Этап 3 — Терра Инкогнита (полная) ✅

- 4 типа экспедиций (localScan / probeSurvey / deepExpedition / rift4D)
- Артефакты (18 шт., 4 rarity) + эффекты в формулах
- Обнаруженные аномалии + пассивная добыча
- effectiveRadar (база + Dark Sensor + артефакты + аномалии)
- 4D-разлом unlock + стилизованный журнал
- POST /api/civilizations/current/actions/explore

## Этап 4 — Обнаружение цивилизаций ✅

- Contact model + bot/real targets
- signalDetected outcomes on probe/deep/rift
- Неточные параметры (distance/level/confidence/coords)
- signalExposure на Civilization
- Панель контактов + debug create/bump/simulate
- GET /contacts, GET /contacts/:id

## Этап 5 — Дипломатический кабинет ✅

- DiplomaticThread / DiplomaticMessage (Prisma)
- Карточки: GREETING, DATA_EXCHANGE, NEUTRALITY_PACT, ULTIMATUM, THREAT, CEASE_COMM
- SoL delay: max(5, floor(ly * 60)) сек; lazy catch-up
- trust / tension; tension≥100 → hostile + DECLARATION_OF_WAR (без боя)
- DATA_EXCHANGE: accuracy boost + сужение level range
- UI: DiplomacyPanel (comm-terminal), unlock «Установить контакт»
- Debug: deliver-all, reset trust/tension, diplo resources
- API: POST threads/:contactId/initiate, POST threads/:threadId/send, GET threads/:threadId

## Этап 6 — Боевая система ✅

- CombatAction / CombatReport + targetStructures на Contact
- Атаки: RECON, LIMITED, DARK, GRAVITATIONAL, DECEPTION, JAMMING
- Оборона: EVACUATION, CAPITAL_RELOCATION
- Hit chance, prep/transit, counterattack, async resolve
- UI: CombatPanel (strike-board), unlock «Подготовить удар»
- Debug: combat-resources, combat-resolve-all
- API: POST combat/start, POST combat/:id/cancel

## Этап 7 — Монетизация и лидерборд ✅

- Эфирные кредиты (User.premiumCredits), mock пополнение
- Магазин: HE / Fermions пакеты + расширения ёмкости
- Запрет AM/DE/DM
- calculateProsperityScore + lazy recompute
- GET /leaderboard (игроки + bot filler)
- UI: PremiumPanel, LeaderboardPanel

## Этап 8 — Поздняя игра

- Уровни 60+ (Dark Energy)
- 90+ local physics modifiers
- Межгалактика, fermion world-building

## Этап 9 ✅ — Полировка

- Анимации, glow, starfield
- Звук (опционально)
- Мобильная вёрстка
- Админ, баланс-пасс, perf
