import type { Chunk, Document } from '../types/index.js';

const store: Chunk[] = [];

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function magnitude(v: number[]): number {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  const denom = magnitude(a) * magnitude(b);
  return denom === 0 ? 0 : dotProduct(a, b) / denom;
}

export function addChunks(chunks: Chunk[]): void {
  if (!chunks.length) return;
  store.push(...chunks);
}

export function similaritySearch(queryEmbedding: number[], topK = 5): Chunk[] {
  if (store.length === 0) return [];

  const topK_ = Math.min(topK, store.length);
  const scored = store.map(chunk => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  // partial sort — only fully sort the top results
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK_).filter(r => r.score > 0.3).map(r => r.chunk);
}

export function listDocuments(): Document[] {
  const seen = new Map<string, string>();
  for (const { documentId, documentName } of store) {
    if (!seen.has(documentId)) seen.set(documentId, documentName);
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

export function removeDocument(documentId: string): boolean {
  let removed = false;
  for (let i = store.length - 1; i >= 0; i--) {
    if (store[i].documentId === documentId) {
      store.splice(i, 1);
      removed = true;
    }
  }
  return removed;
}

export function getChunkCount(): number {
  return store.length;
}

export function getDocumentChunkCount(documentId: string): number {
  return store.filter(c => c.documentId === documentId).length;
}

export function clearStore(): void {
  store.length = 0;
}
