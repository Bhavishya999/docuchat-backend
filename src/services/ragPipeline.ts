import { v4 as uuidv4 } from 'uuid';
import { getEmbedding } from './gemini.js';
import { addChunks, similaritySearch } from './vectorStore.js';
import type { Chunk, ChatSource } from '../types/index.js';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter(c => c.length > 20);
}

export async function indexDocument(
  documentId: string,
  documentName: string,
  text: string
): Promise<number> {
  const rawChunks = chunkText(text);

  const chunks: Chunk[] = await Promise.all(
    rawChunks.map(async (chunkText) => ({
      id: uuidv4(),
      documentId,
      documentName,
      text: chunkText,
      embedding: await getEmbedding(chunkText),
    }))
  );

  addChunks(chunks);
  return chunks.length;
}

export async function retrieveContext(
  question: string,
  topK = 5
): Promise<{ context: string; sources: ChatSource[] }> {
  const queryEmbedding = await getEmbedding(question);
  const results = similaritySearch(queryEmbedding, topK);

  const context = results.map(c => c.text).join('\n\n---\n\n');
  const sources: ChatSource[] = results.map(c => ({
    documentName: c.documentName,
    excerpt: c.text.slice(0, 150) + (c.text.length > 150 ? '...' : ''),
  }));

  return { context, sources };
}
