export type KMRALMediaKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';

export interface KMRALMediaReference {
  readonly id: string;
  readonly kind: KMRALMediaKind;
  readonly mimeType: string;
  readonly uri: string;
  readonly sizeBytes?: number;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface KMRALMediaPort {
  createReference(input: Omit<KMRALMediaReference, 'id'>): KMRALMediaReference;
  resolve(reference: KMRALMediaReference): Promise<unknown>;
}
