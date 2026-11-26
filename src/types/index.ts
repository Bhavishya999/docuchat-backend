export interface Chunk {
  id: string;
  documentId: string;
  documentName: string;
  text: string;
  embedding: number[];
}

export interface Document {
  id: string;
  name: string;
}

export interface ChatSource {
  documentName: string;
  excerpt: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

export interface UploadResponse {
  documentId: string;
  documentName: string;
  chunks: number;
}

export interface ErrorResponse {
  error: string;
}
