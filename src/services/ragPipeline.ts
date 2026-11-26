import { v4 as uuidv4 } from 'uuid';
import { getEmbedding, getBatchEmbeddings } from './gemini.js';
import { addChunks, similaritySearch } from './vectorStore.js';
import type { Chunk, ChatSource } from '../types/index.js';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 80;
const MIN_CHUNK_LENGTH = 30;
const DEFAULT_TOP_K = 5;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length >= MIN_CHUNK_LENGTH) {
      chunks.push(chunk);
    }
    if (end >= text.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

export async function indexDocument(
  documentId: string,
  documentName: string,
  text: string
): Promise<number> {
  const rawChunks = chunkText(text);
  if (rawChunks.length === 0) throw new Error('No indexable chunks found in document');

  const embeddings = await getBatchEmbeddings(rawChunks);

  const chunks: Chunk[] = rawChunks.map((text, i) => ({
    id: uuidv4(),
    documentId,
    documentName,
    text,
    embedding: embeddings[i],
  }));

  addChunks(chunks);
  return chunks.length;
}

export async function retrieveContext(
  question: string,
  topK: number = DEFAULT_TOP_K
): Promise<{ context: string; sources: ChatSource[] }> {
  const queryEmbedding = await getEmbedding(question);
  const results = similaritySearch(queryEmbedding, topK);

  if (results.length === 0) {
    return { context: '', sources: [] };
  }

  // deduplicate by document to avoid repeating same source
  const seen = new Set<string>();
  const sources: ChatSource[] = [];
  for (const chunk of results) {
    if (!seen.has(chunk.documentId)) {
      seen.add(chunk.documentId);
      sources.push({
        documentName: chunk.documentName,
        excerpt: chunk.text.slice(0, 180).trimEnd() + (chunk.text.length > 180 ? '…' : ''),
      });
    }
  }

  const context = results.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n');
  return { context, sources };
}
