export type InspectionStatus = 'draft' | 'in_progress' | 'completed';

export type Inspection = {
  id: string;
  title: string;
  status: InspectionStatus;
  observations: string[];
  evidenceMediaIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type InspectionChecklistItem = {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  observation?: string;
};

export function createInspection(input: Pick<Inspection, 'id' | 'title'>): Inspection {
  if (!input.id.trim()) throw new Error('inspection id is required');
  if (!input.title.trim()) throw new Error('inspection title is required');
  const now = new Date().toISOString();
  return {
    ...input,
    status: 'draft',
    observations: [],
    evidenceMediaIds: [],
    createdAt: now,
    updatedAt: now,
  };
}
