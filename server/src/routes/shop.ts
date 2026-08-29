import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { listShopItems, purchaseShopItem } from '../services/shopService.js';
import { AppError } from '../utils/errors.js';

const purchaseSchema = z.object({
  itemId: z.string().min(1).max(64),
  /** alias */
  itemKey: z.string().min(1).max(64).optional(),
});

export async function shopRoutes(app: FastifyInstance) {
  app.get('/api/shop/items', { preHandler: [app.authenticate] }, async () => {
    return { items: listShopItems() };
  });

  app.post('/api/shop/purchase', { preHandler: [app.authenticate] }, async (request) => {
    const parsed = purchaseSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Укажите itemId', 400);
    }
    const key = parsed.data.itemKey ?? parsed.data.itemId;
    return purchaseShopItem(request.user.sub, key);
  });
}
