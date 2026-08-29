# Деплой: Vercel + PostgreSQL

Игра — SPA (Vite/React) + Fastify API. На Vercel:

- **Static**: `client/dist`
- **Serverless**: `api/index.ts` → Fastify (`server/src`)
- **БД**: PostgreSQL (Vercel Postgres, Neon, Supabase, Railway, …)

Локальная разработка **не ломается**: `npm run dev` + Postgres в Docker (или любой `DATABASE_URL`).

---

## 1. Environment Variables на Vercel

Project → **Settings → Environment Variables** (Production + Preview):

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `DATABASE_URL` | **да** | `postgres://…?sslmode=require` (из Vercel Postgres / Neon) |
| `JWT_SECRET` | **да** | длинная случайная строка (≥32 символов) |
| `NODE_ENV` | рекомендуется | `production` (Vercel часто ставит сам) |
| `CLIENT_ORIGIN` | опционально | `https://your-app.vercel.app` (CORS; same-origin можно не ставить) |
| `ADMIN_SECRET` | для админ-API в prod | любой секрет; клиент шлёт `X-Admin-Secret` |
| `RATE_LIMIT_MAX` | опционально | `200` |
| `VITE_API_URL` | обычно **пусто** | same-origin `/api`; задайте только если API на другом домене |

> Не коммитьте `.env`. В репозитории только `*.env.example`.

### Vercel Postgres

1. Storage → Create → Postgres (или подключите Neon).
2. Скопируйте `DATABASE_URL` / `POSTGRES_URL` в env проекта как **`DATABASE_URL`**.
3. Prisma читает именно `DATABASE_URL`.

---

## 2. Подключение репозитория

1. [vercel.com](https://vercel.com) → New Project → `free1monday/dark-forest-terra-incognita`
2. Framework preset: **Other** (используется `vercel.json`)
3. Root directory: `.` (корень монорепо)
4. Build Command / Output: уже в `vercel.json`  
   - build: `npm run vercel-build`  
   - output: `client/dist`
5. Добавьте env vars → Deploy

`vercel-build` делает:

1. `prisma generate`
2. `prisma migrate deploy` (применяет baseline Postgres; ошибка **не роняет** билд — только WARN в логе)
3. `npm run build` клиента

Если migrate не прошла на билде (нет сети к БД), выполните один раз вручную:

```bash
cd server
DATABASE_URL="postgres://…" npx prisma migrate deploy
```

---

## 3. Локальная разработка (Postgres)

```bash
# 1) Postgres
docker compose up -d db

# 2) server/.env
cp server/.env.example server/.env
# DATABASE_URL=postgresql://df:df@127.0.0.1:5432/darkforest?schema=public

# 3) миграции + клиент Prisma
cd server
npx prisma migrate deploy   # или: npx prisma migrate dev
npx prisma generate
npm run dev                 # :4000

# 4) клиент
cd ../client
cp .env.example .env        # VITE_API_URL пустой
npm run dev                 # :5173, proxy /api → 4000
```

Старый SQLite `file:./dev.db` **больше не поддерживается** schema (provider = postgresql).  
История sqlite-миграций: `server/prisma/migrations_sqlite_archive/`.

---

## 4. Архитектура на Vercel

```
Browser  →  https://app.vercel.app/
              ├─ /*           → client/dist (SPA)
              └─ /api/*       → api/index.ts → Fastify (getApp singleton)
                                    └─ Prisma (global singleton) → Postgres
```

- Rewrites: см. `vercel.json`
- Prisma Client: `server/src/utils/prisma.ts` (кэш на `globalThis`)
- Fastify: `getApp()` кэширует instance между warm invoke
- API bundle: `scripts/bundle-api.mjs` → `api/index.js` (esbuild, alias `@shared`)
- `@h4ad/serverless-adapter` is a dependency for compatibility experiments; production entry uses Fastify `server.emit('request')` (official serverless guide)

---

## 5. Ограничения serverless (важно)

- **Cold start** + catch-up тики: держите `maxDuration` достаточным (сейчас 30s в `vercel.json`).
- **Нет долгоживущих процессов**: фоновые таймеры только на клиенте (poll state).
- **Connection pool**: на serverless лучше pooled URL (Neon pooler, PgBouncer, Vercel Postgres pooled).  
  При `too many connections` добавьте `?pgbouncer=true` / `-pooler` host по доке провайдера.
- **SQLite на Vercel нельзя** (read-only FS / нет persistent disk) — поэтому Postgres.

---

## 6. Админ после деплоя

1. Зарегистрируйте пользователя.
2. В SQL/Prisma Studio: `UPDATE "User" SET "isAdmin" = true WHERE email = '…';`
3. Production admin API требует `ADMIN_SECRET` + header `X-Admin-Secret`.
4. Debug-роуты **отключены** при `NODE_ENV=production`.

---

## 7. Проверка после деплоя

```text
GET https://your-app.vercel.app/api/health
→ { "ok": true, "stage": 9, ... }
```

Откройте сайт, зарегистрируйтесь, создайте цивилизацию.

---

## 8. Полезные команды

```bash
npm run build                 # client + server typecheck
npm run vercel-build          # как на Vercel (нужен DATABASE_URL для migrate)
cd server && npx prisma studio
cd server && npx tsx smoke-stage9.mts
```
