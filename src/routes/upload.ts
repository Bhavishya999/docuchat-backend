import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import { indexDocument } from '../services/ragPipeline.js';
import type { UploadResponse, ErrorResponse } from '../types/index.js';

const upload = new Hono();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'text/plain']);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt']);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-\s]/g, '_').trim().slice(0, 200);
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx !== -1 ? filename.slice(idx).toLowerCase() : '';
}

function validateFile(file: File): string | null {
  if (file.size === 0) return 'File is empty';
  if (file.size > MAX_FILE_SIZE) return `File exceeds 10MB limit (got ${(file.size / 1024 / 1024).toFixed(1)}MB)`;

  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return `Unsupported file type "${ext}". Only .pdf and .txt are allowed`;
  }
  if (!ALLOWED_MIME_TYPES.has(file.type) && file.type !== '') {
    return `Unexpected MIME type "${file.type}"`;
  }

  return null;
}

upload.post('/', async (c) => {
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json<ErrorResponse>({ error: 'Invalid multipart form data' }, 400);
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return c.json<ErrorResponse>({ error: 'No file uploaded — include a "file" field in your form data' }, 400);
  }

  const validationError = validateFile(file);
  if (validationError) {
    return c.json<ErrorResponse>({ error: validationError }, 422);
  }

  const safeFileName = sanitizeFileName(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  let rawText = '';
  try {
    if (getExtension(file.name) === '.pdf') {
      const parsed = await pdfParse(buffer);
      rawText = parsed.text;
    } else {
      rawText = buffer.toString('utf-8');
    }
  } catch (err) {
    console.error('[upload] parse error', err);
    return c.json<ErrorResponse>({ error: 'Failed to extract text from file. The file may be corrupted or password-protected.' }, 422);
  }

  const text = normalizeText(rawText);
  if (text.length < 50) {
    return c.json<ErrorResponse>({ error: 'File contains too little text to be useful (minimum 50 characters after extraction)' }, 422);
  }

  const documentId = uuidv4();
  let chunkCount: number;
  try {
    chunkCount = await indexDocument(documentId, safeFileName, text);
  } catch (err) {
    console.error('[upload] index error', err);
    return c.json<ErrorResponse>({ error: 'Failed to generate embeddings. Check your GEMINI_API_KEY.' }, 502);
  }

  return c.json<UploadResponse>({ documentId, documentName: safeFileName, chunks: chunkCount }, 201);
});

export default upload;
