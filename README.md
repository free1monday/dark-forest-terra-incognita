# Тёмный Лес: Терра Инкогнита

**Слоган:** *Вселенная детерминирована, вероятностна и не случайна.*

Браузерная idle MMO-стратегия с космической социологией, асинхронным мультиплеером, дипломатией со скоростью света и late-game физикой.

## Статус

| Этап | Описание | Статус |
|------|----------|--------|
| 0–1 | Документация / UI-прототип | ✅ |
| 2 | Сервер, auth, authoritative state | ✅ |
| 3 | Экспедиции, артефакты, аномалии | ✅ |
| 4 | Контакты (Contact) | ✅ |
| 5 | Дипломатия (карточки, SoL) | ✅ |
| 6 | Бой (async) | ✅ |
| 7 | Магазин + лидерборд | ✅ |
| 8 | Late-game: ТЭ, законы, межгалактика | ✅ |
| 9 | Полировка, UX, админ, деплой | ✅ |

**Проект готов к запуску (MVP).**

## Стек

- **Client:** Vite 8, React 19, TypeScript, Zustand, CSS Modules
- **Server:** Fastify 5, Prisma 5, **PostgreSQL**, JWT, Zod
- **Shared:** типы, RNG (seeded), формулы, баланс, GameState DTO
- **Deploy:** Vercel (SPA + serverless `/api`) — см. [docs/DEPLOY.md](docs/DEPLOY.md)

## Структура

```
/
├── client/          # UI
├── server/          # API + Prisma
├── shared/          # общий код
├── docs/            # GDD, architecture, balance
├── deploy/          # nginx для compose
├── docker-compose.yml
└── Dockerfile
```

## Установка и запуск (dev)

```bash
# зависимости (из корня)
npm install
# или: npm install --prefix client && npm install --prefix server

# Postgres (Docker)
docker compose up -d db

cp server/.env.example server/.env
cp client/.env.example client/.env

cd server
npx prisma migrate deploy   # или migrate dev
npm run dev          # :4000

# другой терминал
cd client
npm run dev          # :5173, proxy /api → 4000
```

Откройте http://localhost:5173 — регистрация → цивилизация → игра.

### Скрипты

```bash
npm run build              # client production build + server typecheck
npm run typecheck:server
cd server && npx tsx smoke-stage7.mts
cd server && npx tsx smoke-stage8.mts
```

## API (обзор)

| Область | Префикс |
|---------|---------|
| Auth | `/api/auth/*` |
| Civilization state/actions | `/api/civilizations/current/*` |
| Contacts / diplomacy / combat | `.../contacts`, `.../threads`, `.../combat` |
| Shop / leaderboard | `/api/shop/*`, `/api/leaderboard` |
| Late-game | `.../physics-laws`, `.../travel-galaxy` |
| Admin (isAdmin) | `/api/admin/*` |
| Debug (non-production) | `/api/debug/*` |
| Health | `GET /api/health` → `{ stage: 9 }` |

Полный список — в [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Админ-панель

1. Dev: `POST /api/debug/grant-admin` (JWT) → `isAdmin: true`.
2. В UI кнопка **Админ** (только для админов).
3. API: `GET /api/admin/stats|users|civilizations`, `GET/POST .../civilizations/:id[/modify]`.
4. Production: нужен `ADMIN_SECRET` и заголовок `X-Admin-Secret`.

### Монетизация (заглушка)

Кредиты покупают **только** высокие энергии, фермионы и расширения ёмкости.  
**Не продаются:** антиматерия, тёмная энергия, тёмная материя, уровни.

## Docker

```bash
# собрать клиент для nginx volume (или multi-stage)
cd client && npm run build && cd ..

export JWT_SECRET=...
docker compose up --build
# web :8080 → nginx → static + /api proxy → api :4000
```

См. `server/.env.production.example`, `client/.env.production.example`.

## Документация

- [docs/GDD.md](docs/GDD.md) — дизайн и механики
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — сервер/клиент/БД
- [docs/BALANCE.md](docs/BALANCE.md) — кривые и рекомендации
- [docs/ROADMAP.md](docs/ROADMAP.md) — этапы

## Принципы

- Server is source of truth; offline catch-up.
- Seeded RNG; integer resources.
- RU UI / EN code.
- Async combat & diplomacy (no attacker online required for defense resolution).
