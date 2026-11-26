import { addChunks, addDocument, similaritySearch } from './vectorStore.js';
import type { Chunk, ChatSource } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 80;
const MIN_CHUNK_LENGTH = 30;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length >= MIN_CHUNK_LENGTH) chunks.push(chunk);
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

export async function indexDocument(
  documentId: string,
  documentName: string,
  text: string,
): Promise<number> {
  const rawChunks = chunkText(text);

  const chunks: Chunk[] = rawChunks.map((content) => ({
    id: uuidv4(),
    documentId,
    documentName,
    content,
  }));

  addDocument({ id: documentId, name: documentName });
  addChunks(chunks);
  return chunks.length;
}

export function retrieveContext(
  question: string,
  topK = 5,
): { contextText: string; sources: ChatSource[] } {
  const results = similaritySearch(question, topK);

  if (results.length === 0) {
    return {
      contextText: 'No relevant content found in the uploaded documents.',
      sources: [],
    };
  }

  const contextText = results
    .map((chunk, i) => `[${i + 1}] From "${chunk.documentName}":\n${chunk.content}`)
    .join('\n\n');

  const seen = new Set<string>();
  const sources: ChatSource[] = [];
  for (const chunk of results) {
    if (!seen.has(chunk.documentId)) {
      seen.add(chunk.documentId);
      sources.push({
        documentName: chunk.documentName,
        excerpt: chunk.content.slice(0, 200) + (chunk.content.length > 200 ? '…' : ''),
      });
    }
  }

  return { contextText, sources };
}
