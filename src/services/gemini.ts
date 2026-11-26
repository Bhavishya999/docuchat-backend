import { GoogleGenerativeAI } from '@google/generative-ai';

const EMBEDDING_MODEL = 'text-embedding-004';
const GENERATION_MODEL = 'gemini-1.5-flash';
const MAX_EMBED_CHARS = 2048;

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set');
  return new GoogleGenerativeAI(apiKey);
}

function truncateForEmbedding(text: string): string {
  return text.length > MAX_EMBED_CHARS ? text.slice(0, MAX_EMBED_CHARS) : text;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(truncateForEmbedding(text));
  if (!result.embedding?.values?.length) {
    throw new Error('Gemini returned an empty embedding');
  }
  return result.embedding.values;
}

export async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const results = await Promise.allSettled(texts.map(getEmbedding));
  return results.map((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[embeddings] chunk ${i} failed:`, r.reason);
      throw new Error(`Embedding failed for chunk ${i}: ${r.reason?.message}`);
    }
    return r.value;
  });
}

export async function generateAnswer(question: string, context: string): Promise<string> {
  if (!context.trim()) {
    return "I couldn't find relevant information in the uploaded documents to answer your question.";
  }

  const client = getClient();
  const model = client.getGenerativeModel({
    model: GENERATION_MODEL,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  });

  const prompt = `You are a precise document assistant. Answer the user's question using ONLY the context provided below.
- If the answer is not in the context, say exactly: "I couldn't find information about that in the uploaded documents."
- Be concise and factual. Do not make up information.
- Quote relevant parts when helpful.

Context:
${context}

Question: ${question}

Answer:`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}
