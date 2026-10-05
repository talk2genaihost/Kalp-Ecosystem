import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { InspectionStore, type Inspection } from './inspectflow/inspectionStore';
import { hasSession, signIn, signOut, syncInspection } from './inspectflow/kmrlSync';

type Screen = 'lab' | 'inspectflow';

export default function App() {
  const store = useMemo(() => new InspectionStore(), []);
  const [screen, setScreen] = useState<Screen>('lab');
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [title, setTitle] = useState('Site Inspection 001');
  const [observation, setObservation] = useState('');
  const [pending, setPending] = useState(0);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const refresh = async () => {
    const saved = await store.get('inspection-001');
    setInspection(saved);
    setPending(await store.pendingCount());
    setAuthenticated(await hasSession());
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const login = async () => {
    try {
      await signIn(email.trim(), password);
      setAuthenticated(true);
      setPassword('');
      Alert.alert('KMRL Backend', 'Supabase authentication successful.');
    } catch (error) {
      Alert.alert('Sign-in failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const logout = async () => {
    await signOut();
    setAuthenticated(false);
  };

  const startInspection = async () => {
    const now = new Date().toISOString();
    const next: Inspection = {
      id: 'inspection-001',
      title: title.trim() || 'Untitled inspection',
      status: 'in_progress',
      observations: inspection?.observations ?? [],
      evidenceMediaIds: inspection?.evidenceMediaIds ?? [],
      createdAt: inspection?.createdAt ?? now,
      updatedAt: now,
    };
    await store.save(next);
    setInspection(next);
    setPending(await store.pendingCount());
  };

  const addObservation = async () => {
    if (!inspection || !observation.trim()) return;
    const next: Inspection = {
      ...inspection,
      observations: [...inspection.observations, observation.trim()],
      updatedAt: new Date().toISOString(),
    };
    await store.save(next);
    setInspection(next);
    setObservation('');
    setPending(await store.pendingCount());
  };

  const syncPending = async () => {
    if (!authenticated) {
      Alert.alert('Backend Sync', 'Sign in to the KMRL Sandbox first.');
      return;
    }

    const item = await store.nextPending();
    if (!item) {
      Alert.alert('Backend Sync', 'Nothing is pending.');
      return;
    }

    setSyncing(true);
    try {
      const result = await syncInspection(item.payload);
      if (!result.ok) {
        Alert.alert(
          result.status === 409 ? 'Backend Conflict' : 'Backend Sync Failed',
          result.error,
        );
        return;
      }

      await store.acknowledge(item.id);
      setPending(await store.pendingCount());
      Alert.alert('Backend Sync', 'Inspection synced to KMRL Sandbox.');
    } catch (error) {
      Alert.alert(
        'Backend Sync',
        error instanceof Error ? error.message : 'Network sync failed',
      );
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>Loading KMRAL Lab...</Text>
      </SafeAreaView>
    );
  }

  if (!authenticated) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.labTitle}>KMRL LAB</Text>
          <Text style={styles.subtitle}>KALP Mobile Test & Integration Lab</Text>
          <View style={styles.labCard}>
            <Text style={styles.labCardTitle}>KMRL Sandbox Sign-in</Text>
            <Text style={styles.helper}>
              Authenticate before sending InspectFlow data to the Supabase backend.
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Test user email"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              style={styles.input}
            />
            <TouchableOpacity style={styles.primary} onPress={() => void login()}>
              <Text style={styles.primaryText}>Sign in to KMRL Sandbox</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footer}>
            KMRL backend: kmrl-sync • authenticated Edge Function
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'inspectflow') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity onPress={() => setScreen('lab')} style={styles.backButton}>
            <Text style={styles.backText}>‹ KMRL LAB</Text>
          </TouchableOpacity>

          <Text style={styles.title}>KALP InspectFlow</Text>
          <Text style={styles.subtitle}>KMRAL Mobile Sandbox v0.4</Text>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Android shell: READY</Text>
            <Text>Persistent storage: READY</Text>
            <Text>Offline queue: {pending} pending</Text>
            <Text>Supabase session: AUTHENTICATED</Text>
          </View>

          <Text style={styles.section}>Inspection Test</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Inspection title"
            style={styles.input}
          />

          <TouchableOpacity style={styles.primary} onPress={() => void startInspection()}>
            <Text style={styles.primaryText}>
              {inspection ? 'Save Inspection' : 'Start Inspection'}
            </Text>
          </TouchableOpacity>

          {inspection && (
            <>
              <View style={styles.inspectionCard}>
                <Text style={styles.inspectionTitle}>{inspection.title}</Text>
                <Text>Status: {inspection.status}</Text>
                <Text>Observations: {inspection.observations.length}</Text>
              </View>

              <TextInput
                value={observation}
                onChangeText={setObservation}
                placeholder="Add observation"
                multiline
                style={[styles.input, styles.multiline]}
              />

              <TouchableOpacity style={styles.secondary} onPress={() => void addObservation()}>
                <Text style={styles.secondaryText}>Add Observation</Text>
              </TouchableOpacity>

              {inspection.observations.map((item, index) => (
                <Text key={index + '-' + item} style={styles.observation}>
                  {index + 1}. {item}
                </Text>
              ))}

              <TouchableOpacity
                style={styles.primary}
                onPress={() => void syncPending()}
                disabled={syncing}
              >
                <Text style={styles.primaryText}>
                  {syncing ? 'Syncing…' : 'Sync Pending to Backend'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.secondary} onPress={() => void logout()}>
            <Text style={styles.secondaryText}>Sign out</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            KMRAL vertical slice: UI → persistence → offline queue → authenticated kmrl-sync.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.labTitle}>KMRL LAB</Text>
        <Text style={styles.subtitle}>KALP Mobile Test & Integration Lab</Text>

        <View style={styles.labCard}>
          <Text style={styles.labCardTitle}>Runtime Status</Text>
          <StatusRow label="Android Runtime" value="READY" tone="pass" />
          <StatusRow label="KMRAL Core" value="READY" tone="pass" />
          <StatusRow label="Persistent Storage" value="PASS" tone="pass" />
          <StatusRow label="Offline Queue" value={pending === 0 ? 'PASS' : pending + ' PENDING'} tone={pending === 0 ? 'pass' : 'warn'} />
          <StatusRow label="InspectFlow" value="RUNNING" tone="pass" />
          <StatusRow label="Supabase Session" value="AUTHENTICATED" tone="pass" />
          <StatusRow label="Backend Sync" value={pending === 0 ? 'READY' : 'PENDING'} tone={pending === 0 ? 'pass' : 'warn'} />
        </View>

        <Text style={styles.section}>Lab Modules</Text>

        <TouchableOpacity style={styles.moduleCard} onPress={() => setScreen('inspectflow')}>
          <View style={styles.moduleIcon}><Text style={styles.iconText}>IF</Text></View>
          <View style={styles.moduleBody}>
            <Text style={styles.moduleTitle}>InspectFlow</Text>
            <Text style={styles.moduleText}>Inspection → persistence → offline queue → backend</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.moduleCard}>
          <View style={styles.moduleIcon}><Text style={styles.iconText}>TR</Text></View>
          <View style={styles.moduleBody}>
            <Text style={styles.moduleTitle}>Test Runs</Text>
            <Text style={styles.moduleText}>Device validation checkpoints and results</Text>
          </View>
        </View>

        <View style={styles.moduleCard}>
          <View style={styles.moduleIcon}><Text style={styles.iconText}>SD</Text></View>
          <View style={styles.moduleBody}>
            <Text style={styles.moduleTitle}>Sandbox Data</Text>
            <Text style={styles.moduleText}>Local inspection and KMRL remote snapshot state</Text>
          </View>
        </View>

        <View style={styles.moduleCard}>
          <View style={styles.moduleIcon}><Text style={styles.iconText}>IT</Text></View>
          <View style={styles.moduleBody}>
            <Text style={styles.moduleTitle}>Integration Tests</Text>
            <Text style={styles.moduleText}>Mobile persistence + authenticated backend sync</Text>
          </View>
        </View>

        <View style={styles.moduleCard}>
          <View style={styles.moduleIcon}><Text style={styles.iconText}>APK</Text></View>
          <View style={styles.moduleBody}>
            <Text style={styles.moduleTitle}>Build / APK</Text>
            <Text style={styles.moduleText}>KMRAL InspectFlow v0.4 • Android preview build</Text>
          </View>
        </View>

        <View style={styles.nextCard}>
          <Text style={styles.nextTitle}>BACKEND INTEGRATION</Text>
          <Text style={styles.nextText}>
            Supabase KMRL Sandbox → authenticated kmrl-sync → revisioned inspection snapshot.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'pass' | 'warn';
}) {
  return (
    <View style={styles.statusRow}>
      <View style={[styles.dot, tone === 'pass' ? styles.dotPass : styles.dotWarn]} />
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={tone === 'pass' ? styles.statusPass : styles.statusWarn}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f7' },
  container: { padding: 24, paddingBottom: 48 },
  loading: { marginTop: 48, textAlign: 'center', fontSize: 18 },
  labTitle: { fontSize: 34, fontWeight: '800' },
  title: { fontSize: 30, fontWeight: '700' },
  subtitle: { marginTop: 6, fontSize: 16, color: '#555' },
  helper: { marginBottom: 14, color: '#555', lineHeight: 20 },
  backButton: { marginBottom: 20 },
  backText: { fontSize: 17, fontWeight: '700' },
  labCard: { marginTop: 22, padding: 18, borderRadius: 14, backgroundColor: '#fff' },
  labCardTitle: { fontSize: 19, fontWeight: '700', marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  dotPass: { backgroundColor: '#2e9b55' },
  dotWarn: { backgroundColor: '#d69b1c' },
  statusLabel: { flex: 1, fontSize: 15 },
  statusPass: { fontWeight: '700', color: '#247a42' },
  statusWarn: { fontWeight: '700', color: '#9a6a08' },
  section: { marginTop: 28, marginBottom: 12, fontSize: 22, fontWeight: '700' },
  moduleCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 14, marginBottom: 12 },
  moduleIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  iconText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  moduleBody: { flex: 1, marginLeft: 14 },
  moduleTitle: { fontSize: 17, fontWeight: '700' },
  moduleText: { marginTop: 3, color: '#666', fontSize: 13 },
  chevron: { fontSize: 30, color: '#777', marginLeft: 8 },
  nextCard: { marginTop: 16, padding: 18, borderRadius: 14, backgroundColor: '#fff4d6' },
  nextTitle: { fontSize: 13, fontWeight: '800', color: '#8a650d' },
  nextText: { marginTop: 6, fontSize: 14, lineHeight: 20 },
  statusCard: { marginTop: 20, padding: 16, borderRadius: 12, backgroundColor: '#fff', gap: 6 },
  statusTitle: { fontSize: 17, fontWeight: '700' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 12 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  primary: { backgroundColor: '#111', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#bbb', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  secondaryText: { fontWeight: '700' },
  inspectionCard: { marginTop: 16, padding: 16, backgroundColor: '#fff', borderRadius: 12, gap: 5 },
  inspectionTitle: { fontSize: 18, fontWeight: '700' },
  observation: { marginTop: 8, padding: 10, backgroundColor: '#fff', borderRadius: 8 },
  footer: { marginTop: 28, textAlign: 'center', fontSize: 13 },
});
