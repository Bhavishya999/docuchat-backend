import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import 'dotenv/config';
import upload from './routes/upload.js';
import chat from './routes/chat.js';
import documents from './routes/documents.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({ origin: process.env.FRONTEND_URL || '*' }));

app.get('/health', (c) => c.json({ status: 'ok' }));
app.route('/upload', upload);
app.route('/chat', chat);
app.route('/documents', documents);

app.notFound((c) => c.json({ error: 'Route not found' }, 404));
app.onError((err, c) => {
  console.error('[server]', err);
  return c.json({ error: 'Internal server error' }, 500);
});

const port = Number(process.env.PORT) || 5000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`DocuChat backend running on http://localhost:${port}`);
});
