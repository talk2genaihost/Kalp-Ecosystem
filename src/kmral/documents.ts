export type KMRALDocumentFormat = 'PDF' | 'HTML' | 'JSON' | 'TEXT';

export interface KMRALDocumentReference {
  readonly id: string;
  readonly format: KMRALDocumentFormat;
  readonly uri: string;
  readonly title?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface KMRALDocumentPort {
  createReference(input: Omit<KMRALDocumentReference, 'id'>): KMRALDocumentReference;
  export(reference: KMRALDocumentReference): Promise<unknown>;
}
