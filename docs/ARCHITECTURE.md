# Архитектура — Тёмный Лес: Терра Инкогнита

## 1. Обзор

Монорепозиторий с тремя пакетами:

```
/client   — React SPA (Vite)
/server   — API + игровой тик (Этап 2+)
/shared   — типы, баланс, RNG, чистые формулы
```

**Этап 1:** клиентский прототип (UI/UX база).  
**Этап 2 (текущий):** `server` — источник истины (Fastify + Prisma + SQLite); клиент хранит только JWT и UI-selection; lazy catch-up production/expeditions.

## 2. Принципы

1. **Server-authoritative economy** (с Этапа 2): клиент не доверяется в производстве/списании.
2. **Seeded determinism:** все «случайности» = `hash(seed + action + nonce)`.
3. **Shared formulas:** баланс в `/shared`, одинаковый на клиенте (превью) и сервере (факт).
4. **Offline progress:** `lastTickAt` → догон тиков при входе (кап по времени).
5. **UI RU / code EN.**

## 3. Frontend (Этап 1)

```
client/
  src/
    main.tsx
    App.tsx
    styles/
      global.css
      theme.css
    store/
      gameStore.ts      # Zustand
    components/
      CreateCivilization.tsx
      MainScreen.tsx
      ResourceBar.tsx
      SystemPanel.tsx
      BuildingsPanel.tsx
      ConstantsPanel.tsx
      DetailPanel.tsx
      Journal.tsx
      ExpeditionButton.tsx
      DebugPanel.tsx
      Slogan.tsx
    hooks/
      useGameTick.ts
    lib/
      storage.ts
      format.ts
```

### State (Zustand)

- `civilization` — мета + константы + мир
- `resources` — 5 ресурсов + capacity
- `buildings` — уровни построек
- `journal` — технические отчёты
- `ui` — selectedObject, expeditionInFlight, debug
- actions: create, upgrade, levelUp, startExpedition, tick, reset, debugAdd

### Persistence

Ключ: `darkforest_terra_incognita_v1`  
Сериализация JSON всего save-state после значимых действий и на тике (throttle).

## 4. Backend (Этап 2, план)

- Node.js + TypeScript + Fastify
- Prisma + SQLite → позже PostgreSQL
- Auth: email + password (bcrypt), JWT/session
- Endpoints: auth, civilization CRUD, action (upgrade/research/expedition), state sync, tick catch-up
- Валидация каждого action против shared formulas
- Anti-cheat: server tick only, rate limits, action nonce

## 5. Shared

```
shared/src/
  types.ts
  balance.ts
  rng.ts
  worldgen.ts
  formulas.ts
  constants.ts
  index.ts
```

Клиент импортирует через relative path / alias `@shared/*` (Vite alias).

## 6. Модель данных (целевая)

См. сущности в мастер-промпте:

User, Civilization, ResourceState, Building, Research, Expedition, Contact, DiplomacyThread, DiplomacyMessage, Pact, CombatReport, Artifact, PremiumPurchase, LeaderboardEntry.

В Этапе 1 хранится упрощённый клиентский слепок:

```ts
interface SaveState {
  version: 1;
  civilization: CivilizationState;
  resources: ResourceState;
  buildings: BuildingState[];
  journal: JournalEntry[];
  expeditionNonce: number;
  levelNonce: number;
  createdAt: string;
  lastTickAt: number;
}
```

## 7. Игровой цикл (Этап 1)

```
setInterval 1s:
  dt = now - lastTickAt (clamp)
  for each second:
    produce resources from buildings * level modifiers * constants
  lastTickAt = now
  persist (throttled)
```

Экспедиции: `finishesAt` timestamp; на тике или по кнопке — resolve через seeded RNG.

## 8. Безопасность (roadmap)

- Этап 1: нет (local only).
- Этап 2: auth, server validation, no trust client resources.
- Этап 7: mock payments only, no real gateway.

## 9. Визуальный слой

- CSS custom properties (theme tokens)
- Glass panels, glow borders
- Optional canvas starfield (лёгкий)
- Моноширинный шрифт для журнала

## 10. Расширение

Каждый этап добавляет модули без ломки save version (миграции `version` в SaveState / Prisma migrations на сервере).


## Этап 9 — полировка и админ

### Клиент
- Toast stack, onboarding modal, AnimatedNumber, enhanced Starfield (parallax/meteors, pause when hidden).
- Responsive: resource bar horizontal scroll &lt;768px; grids collapse; touch button min-height.
- Admin modal for `user.isAdmin`.

### Сервер
- `User.isAdmin`; routes `/api/admin/*` (+ production `X-Admin-Secret`).
- In-memory GameState cache ~1.5s; `invalidateStateCache()` on mutations.
- Indexes: `Civilization.prosperityScore`, `level`, `isDestroyed`.
- Health `stage: 9`.

### Деплой
- `Dockerfile`, `docker-compose.yml`, `deploy/nginx.conf`.
