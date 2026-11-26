# DocuChat Backend

A production-ready RAG (Retrieval-Augmented Generation) backend that lets users upload documents and ask questions about them using Gemini AI.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Framework | [Hono.js](https://hono.dev) — lightweight, edge-ready web framework |
| Language | TypeScript (strict mode) |
| LLM | Gemini 1.5 Flash (Google AI) |
| Embeddings | Gemini text-embedding-004 |
| Vector Store | In-memory cosine similarity search |
| File Parsing | pdf-parse (PDF), plain text |
| Deployment | [Render](https://render.com) (free tier) |

## Features

- Upload PDF and plain-text documents (up to 10MB)
- Automatic text chunking with overlap for context preservation
- Gemini AI embeddings for semantic search
- RAG pipeline: embed query → retrieve top-k chunks → generate grounded answer
- List and delete uploaded documents
- CORS-enabled for SPA frontend
- Structured error handling across all endpoints

## Project Structure

```
src/
├── index.ts              # Hono app entry point
├── routes/
│   ├── upload.ts         # POST /upload — ingest document
│   ├── chat.ts           # POST /chat — ask a question
│   └── documents.ts      # GET/DELETE /documents — manage docs
├── services/
│   ├── gemini.ts         # Gemini LLM + embedding calls
│   ├── vectorStore.ts    # In-memory vector store + cosine similarity
│   └── ragPipeline.ts    # Chunk, embed, retrieve, answer
└── types/
    └── index.ts          # Shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 20+
- A [Gemini API key](https://aistudio.google.com/app/apikey) (free tier)

### Installation

```bash
git clone https://github.com/Bhavishya999/docuchat-backend.git
cd docuchat-backend
npm install
```

### Environment Variables

Copy `.env.example` and fill in your key:

```bash
cp .env.example .env
```

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### `POST /upload`
Upload a PDF or text file to index it.

**Request:** `multipart/form-data` with field `file`

**Response:**
```json
{ "documentId": "uuid", "documentName": "file.pdf", "chunks": 12 }
```

---

### `POST /chat`
Ask a question about uploaded documents.

**Request:**
```json
{ "question": "What is the main topic of the document?" }
```

**Response:**
```json
{
  "answer": "The document covers...",
  "sources": [{ "documentName": "file.pdf", "excerpt": "..." }]
}
```

---

### `GET /documents`
List all indexed documents.

**Response:**
```json
{ "documents": [{ "id": "uuid", "name": "file.pdf" }] }
```

---

### `DELETE /documents/:id`
Remove a document and its chunks from the vector store.

## Deployment (Render)

1. Push to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Set **Build Command:** `npm install && npm run build`
4. Set **Start Command:** `npm start`
5. Add `GEMINI_API_KEY` as an environment variable

## License

MIT
