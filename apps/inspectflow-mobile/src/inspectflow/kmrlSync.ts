import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://klbdrswxujewqaazpbcn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_GN1Gn4rVuKBqgRIP-L-3lg_ESZwuSQe';

const ACCESS_TOKEN_KEY = 'inspectflow:supabase-access-token';
const EXPERIMENT_PREFIX = 'inspectflow:';

export type SyncResponse =
  | { ok: true; status: number; snapshot: unknown }
  | { ok: false; status: number; error: string; conflict?: unknown };

export async function signIn(email: string, password: string): Promise<void> {
  const response = await fetch(
    SUPABASE_URL + '/auth/v1/token?grant_type=password',
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    },
  );

  const body = (await response.json()) as { access_token?: string; error_description?: string; msg?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description ?? body.msg ?? 'Supabase sign-in failed');
  }

  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, body.access_token);
}

export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
}

export async function hasSession(): Promise<boolean> {
  return Boolean(await AsyncStorage.getItem(ACCESS_TOKEN_KEY));
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) throw new Error('Supabase session required');
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
  };
}

export async function syncInspection(
  inspection: {
    id: string;
    title: string;
    status: string;
    observations: string[];
    evidenceMediaIds: string[];
    createdAt: string;
    updatedAt: string;
  },
): Promise<SyncResponse> {
  const experimentId = EXPERIMENT_PREFIX + inspection.id;
  const headers = await authHeaders();

  const read = await fetch(
    SUPABASE_URL + '/functions/v1/kmrl-sync/v1/experiments/' + encodeURIComponent(experimentId),
    { headers },
  );

  let baseRevision = 0;
  if (read.ok) {
    const remote = (await read.json()) as { snapshot?: { revision?: number } };
    baseRevision = Number(remote.snapshot?.revision ?? 0);
  } else if (read.status !== 404) {
    return {
      ok: false,
      status: read.status,
      error: await read.text(),
    };
  }

  const mutationId = experimentId + ':' + inspection.updatedAt;
  const nextSnapshot = {
    inspection,
    revision: baseRevision + 1,
  };

  const response = await fetch(
    SUPABASE_URL +
      '/functions/v1/kmrl-sync/v1/experiments/' +
      encodeURIComponent(experimentId) +
      '/mutations',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        mutation: {
          mutationId,
          baseRevision,
          command: {
            type: 'upsert_inspection',
            inspectionId: inspection.id,
          },
        },
        nextSnapshot,
      }),
    },
  );

  const body = (await response.json()) as {
    snapshot?: unknown;
    error?: string;
    conflict?: unknown;
  };

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: body.error ?? 'Backend sync failed',
      conflict: body.conflict,
    };
  }

  return {
    ok: true,
    status: response.status,
    snapshot: body.snapshot,
  };
}
