import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import { indexDocument } from '../services/ragPipeline.js';
import type { UploadResponse, ErrorResponse } from '../types/index.js';

const upload = new Hono();

upload.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return c.json<ErrorResponse>({ error: 'No file uploaded' }, 400);
    }

    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return c.json<ErrorResponse>({ error: 'Only PDF and plain text files are supported' }, 415);
    }

    if (file.size > 10 * 1024 * 1024) {
      return c.json<ErrorResponse>({ error: 'File size exceeds 10MB limit' }, 413);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';

    if (file.type === 'application/pdf') {
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else {
      text = buffer.toString('utf-8');
    }

    if (!text.trim()) {
      return c.json<ErrorResponse>({ error: 'Could not extract text from the uploaded file' }, 422);
    }

    const documentId = uuidv4();
    const chunkCount = await indexDocument(documentId, file.name, text);

    return c.json<UploadResponse>({ documentId, documentName: file.name, chunks: chunkCount }, 201);
  } catch (err) {
    console.error('[upload]', err);
    return c.json<ErrorResponse>({ error: 'Failed to process document' }, 500);
  }
});

export default upload;
