import type { Chunk, Document } from '../types/index.js';

const store: Chunk[] = [];

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function addChunks(chunks: Chunk[]): void {
  store.push(...chunks);
}

export function similaritySearch(queryEmbedding: number[], topK = 5): Chunk[] {
  if (store.length === 0) return [];
  return store
    .map(chunk => ({ chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ chunk }) => chunk);
}

export function listDocuments(): Document[] {
  const seen = new Set<string>();
  return store
    .filter(chunk => {
      if (seen.has(chunk.documentId)) return false;
      seen.add(chunk.documentId);
      return true;
    })
    .map(({ documentId: id, documentName: name }) => ({ id, name }));
}

export function removeDocument(documentId: string): boolean {
  const before = store.length;
  const toRemove = store.filter(c => c.documentId === documentId);
  toRemove.forEach(c => store.splice(store.indexOf(c), 1));
  return store.length < before;
}

export function getChunkCount(): number {
  return store.length;
}
