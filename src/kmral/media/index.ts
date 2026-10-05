export type MediaKind = 'image' | 'video' | 'document' | 'audio';

export type MediaAsset = {
  id: string;
  kind: MediaKind;
  uri: string;
  mimeType: string;
  sizeBytes?: number;
  createdAt: string;
  metadata?: Record<string, string>;
};

export type MediaPickerContract = {
  pick(kind: MediaKind): Promise<MediaAsset | null>;
};

export function validateMediaAsset(asset: MediaAsset): MediaAsset {
  if (!asset.id.trim()) throw new Error('media id is required');
  if (!asset.uri.trim()) throw new Error('media uri is required');
  if (!asset.mimeType.trim()) throw new Error('media mimeType is required');
  return { ...asset, metadata: asset.metadata ? { ...asset.metadata } : undefined };
}
