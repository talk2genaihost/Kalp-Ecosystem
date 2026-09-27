export type DocumentFormat = 'pdf' | 'csv' | 'json';

export type DocumentRequest = {
  id: string;
  title: string;
  format: DocumentFormat;
  data: unknown;
};

export type DocumentExporter = {
  export(request: DocumentRequest): Promise<{ uri: string; format: DocumentFormat }>;
};

export function validateDocumentRequest(request: DocumentRequest): DocumentRequest {
  if (!request.id.trim()) throw new Error('document id is required');
  if (!request.title.trim()) throw new Error('document title is required');
  return { ...request };
}
