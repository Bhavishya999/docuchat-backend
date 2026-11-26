import { GoogleGenerativeAI } from '@google/generative-ai';

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenerativeAI(apiKey);
}

export async function getEmbedding(text: string): Promise<number[]> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function generateAnswer(question: string, context: string): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a helpful assistant that answers questions strictly based on the provided document context.
If the answer is not in the context, say "I couldn't find information about that in the uploaded documents."

Context:
${context}

Question: ${question}

Answer:`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
