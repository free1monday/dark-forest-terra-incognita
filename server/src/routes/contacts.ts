import type { FastifyInstance } from 'fastify';
import { getContactForUser, listContactsForUser } from '../services/contactService.js';

export async function contactRoutes(app: FastifyInstance) {
  app.get(
    '/api/civilizations/current/contacts',
    { preHandler: [app.authenticate] },
    async (request) => {
      const q = request.query as { status?: string };
      const contacts = await listContactsForUser(request.user.sub, q.status);
      return { contacts };
    }
  );

  app.get(
    '/api/civilizations/current/contacts/:contactId',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { contactId } = request.params as { contactId: string };
      const contact = await getContactForUser(request.user.sub, contactId);
      return { contact };
    }
  );
}
