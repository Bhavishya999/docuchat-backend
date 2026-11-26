import { Hono } from 'hono';
import { retrieveContext } from '../services/ragPipeline.js';
import { generateAnswer } from '../services/gemini.js';
import { getChunkCount } from '../services/vectorStore.js';
import type { ChatResponse, ErrorResponse } from '../types/index.js';

const chat = new Hono();

const MIN_QUESTION_LENGTH = 3;
const MAX_QUESTION_LENGTH = 1000;

chat.post('/', async (c) => {
  let body: { question?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json<ErrorResponse>({ error: 'Request body must be valid JSON with a "question" field' }, 400);
  }

  const question = typeof body.question === 'string' ? body.question.trim() : null;

  if (!question) {
    return c.json<ErrorResponse>({ error: '"question" field is required and must be a non-empty string' }, 400);
  }
  if (question.length < MIN_QUESTION_LENGTH) {
    return c.json<ErrorResponse>({ error: `Question must be at least ${MIN_QUESTION_LENGTH} characters` }, 400);
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return c.json<ErrorResponse>({ error: `Question must be under ${MAX_QUESTION_LENGTH} characters` }, 400);
  }
  if (getChunkCount() === 0) {
    return c.json<ErrorResponse>({ error: 'No documents have been indexed yet. Upload a document first.' }, 400);
  }

  let context: string;
  let sources: ChatResponse['sources'];
  try {
    ({ context, sources } = await retrieveContext(question));
  } catch (err) {
    console.error('[chat] retrieval error', err);
    return c.json<ErrorResponse>({ error: 'Failed to retrieve relevant context from documents' }, 502);
  }

  let answer: string;
  try {
    answer = await generateAnswer(question, context);
  } catch (err) {
    console.error('[chat] generation error', err);
    return c.json<ErrorResponse>({ error: 'Failed to generate an answer. Check your GEMINI_API_KEY.' }, 502);
  }

  return c.json<ChatResponse>({ answer, sources });
});

export default chat;
