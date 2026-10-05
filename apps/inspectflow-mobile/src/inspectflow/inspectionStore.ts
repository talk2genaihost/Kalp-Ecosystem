import AsyncStorage from '@react-native-async-storage/async-storage';

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

export type OfflineQueueItem = {
  id: string;
  operation: 'create' | 'update' | 'delete';
  resource: 'inspection';
  payload: Inspection;
  createdAt: string;
  attempts: number;
};

const INSPECTION_PREFIX = 'inspectflow:inspection:';
const QUEUE_KEY = 'inspectflow:offline-queue';

export class InspectionStore {
  async get(id: string): Promise<Inspection | null> {
    const raw = await AsyncStorage.getItem(INSPECTION_PREFIX + id);
    return raw ? (JSON.parse(raw) as Inspection) : null;
  }

  async save(inspection: Inspection): Promise<Inspection> {
    await AsyncStorage.setItem(
      INSPECTION_PREFIX + inspection.id,
      JSON.stringify(inspection),
    );

    const queue = await this.readQueue();
    const existing = queue.findIndex((item) => item.payload.id === inspection.id);
    const item: OfflineQueueItem = {
      id: 'inspection-' + inspection.id,
      operation: existing >= 0 ? 'update' : 'create',
      resource: 'inspection',
      payload: inspection,
      createdAt: new Date().toISOString(),
      attempts: existing >= 0 ? queue[existing].attempts : 0,
    };

    if (existing >= 0) queue[existing] = item;
    else queue.push(item);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return inspection;
  }

  async pendingCount(): Promise<number> {
    return (await this.readQueue()).length;
  }

  async nextPending(): Promise<OfflineQueueItem | null> {
    const queue = await this.readQueue();
    return queue.length ? queue[0] : null;
  }

  async acknowledge(id: string): Promise<void> {
    const queue = await this.readQueue();
    const next = queue.filter((item) => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  }

  private async readQueue(): Promise<OfflineQueueItem[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineQueueItem[]) : [];
  }
}
