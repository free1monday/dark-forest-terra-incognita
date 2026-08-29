# Multi-stage: build client, run API that also serves static (or compose separates them)
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json ./
COPY client/package.json client/
COPY server/package.json server/
COPY shared shared/
RUN npm install --prefix client && npm install --prefix server

FROM deps AS build-client
COPY client client/
COPY shared shared/
RUN npm run build --prefix client

FROM node:20-bookworm-slim AS server
WORKDIR /app/server
ENV NODE_ENV=production
COPY server/package.json ./
COPY --from=deps /app/server/node_modules ./node_modules
COPY server ./
COPY shared /app/shared
COPY --from=build-client /app/client/dist /app/client/dist
RUN ./node_modules/.bin/prisma generate
EXPOSE 4000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && npx tsx src/index.ts"]
