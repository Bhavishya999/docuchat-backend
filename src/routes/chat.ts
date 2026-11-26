import { Hono } from 'hono';
import { retrieveContext } from '../services/ragPipeline.js';
import { generateAnswer } from '../services/gemini.js';
import { getChunkCount } from '../services/vectorStore.js';
import type { ChatResponse, ErrorResponse } from '../types/index.js';

const chat = new Hono();

chat.post('/', async (c) => {
  try {
    const body = await c.req.json<{ question?: string }>();
    const question = body.question?.trim();

    if (!question) {
      return c.json<ErrorResponse>({ error: 'Question is required' }, 400);
    }

    if (question.length > 1000) {
      return c.json<ErrorResponse>({ error: 'Question must be under 1000 characters' }, 400);
    }

    if (getChunkCount() === 0) {
      return c.json<ErrorResponse>({ error: 'No documents uploaded yet. Please upload a document first.' }, 400);
    }

    const { context, sources } = await retrieveContext(question);
    const answer = await generateAnswer(question, context);

    return c.json<ChatResponse>({ answer, sources });
  } catch (err) {
    console.error('[chat]', err);
    return c.json<ErrorResponse>({ error: 'Failed to generate answer' }, 500);
  }
});

export default chat;
