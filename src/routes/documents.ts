import { Hono } from 'hono';
import { listDocuments, removeDocument } from '../services/vectorStore.js';
import type { ErrorResponse } from '../types/index.js';

const documents = new Hono();

documents.get('/', (c) => {
  return c.json({ documents: listDocuments() });
});

documents.delete('/:id', (c) => {
  const id = c.req.param('id');
  const removed = removeDocument(id);

  if (!removed) {
    return c.json<ErrorResponse>({ error: 'Document not found' }, 404);
  }

  return c.json({ message: 'Document removed successfully' });
});

export default documents;
