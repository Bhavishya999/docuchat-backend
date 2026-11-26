import { Hono } from 'hono';
import { listDocuments, removeDocument } from '../services/vectorStore.js';
import type { ErrorResponse } from '../types/index.js';

const documents = new Hono();

documents.get('/', (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? 1));
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? 10)));

  const all = listDocuments();
  const total = all.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const data = all.slice(start, start + limit);

  return c.json({
    documents: data,
    pagination: { page: safePage, limit, total, totalPages },
  });
});

documents.delete('/:id', (c) => {
  const id = c.req.param('id');
  if (!id?.trim()) {
    return c.json<ErrorResponse>({ error: 'Document ID is required' }, 400);
  }

  const removed = removeDocument(id);
  if (!removed) {
    return c.json<ErrorResponse>({ error: 'Document not found' }, 404);
  }

  return c.json({ message: 'Document removed successfully' });
});

export default documents;
