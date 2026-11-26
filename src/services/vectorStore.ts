import type { Chunk, Document } from '../types/index.js';

// BM25 parameters
const K1 = 1.5;
const B = 0.75;

const store: Chunk[] = [];
const documents: Map<string, Document> = new Map();

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function termFrequencies(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

function bm25Score(query: string, chunk: Chunk, avgLen: number, totalDocs: number, df: Map<string, number>): number {
  const qTokens = tokenize(query);
  const cTokens = tokenize(chunk.content);
  const tf = termFrequencies(cTokens);
  const docLen = cTokens.length;
  let score = 0;

  for (const term of qTokens) {
    const f = tf.get(term) ?? 0;
    if (f === 0) continue;
    const dft = df.get(term) ?? 0;
    const idf = Math.log((totalDocs - dft + 0.5) / (dft + 0.5) + 1);
    const tfNorm = (f * (K1 + 1)) / (f + K1 * (1 - B + B * (docLen / avgLen)));
    score += idf * tfNorm;
  }
  return score;
}

export function addChunks(chunks: Chunk[]): void {
  store.push(...chunks);
}

export function addDocument(doc: Document): void {
  documents.set(doc.id, doc);
}

export function listDocuments(): Document[] {
  return Array.from(documents.values());
}

export function similaritySearch(query: string, topK = 5): Chunk[] {
  if (store.length === 0) return [];

  // Build document frequency map across all chunks
  const df = new Map<string, number>();
  for (const chunk of store) {
    const unique = new Set(tokenize(chunk.content));
    for (const term of unique) df.set(term, (df.get(term) ?? 0) + 1);
  }

  const totalDocs = store.length;
  const avgLen = store.reduce((s, c) => s + tokenize(c.content).length, 0) / totalDocs;

  return store
    .map(chunk => ({ chunk, score: bm25Score(query, chunk, avgLen, totalDocs, df) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(r => r.chunk);
}

export function removeDocument(documentId: string): boolean {
  const docExists = documents.has(documentId);
  if (!docExists) return false;
  documents.delete(documentId);
  for (let i = store.length - 1; i >= 0; i--) {
    if (store[i].documentId === documentId) store.splice(i, 1);
  }
  return true;
}

export function getDocumentChunkCount(documentId: string): number {
  return store.filter(c => c.documentId === documentId).length;
}

export function clearStore(): void {
  store.length = 0;
  documents.clear();
}
