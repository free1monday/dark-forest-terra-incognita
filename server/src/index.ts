import { buildApp } from './app.js';
import { prisma } from './utils/prisma.js';

async function main() {
  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? '0.0.0.0';

  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Shutting down (${signal})…`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port, host });
    app.log.info(`Dark Forest server listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

void main();
