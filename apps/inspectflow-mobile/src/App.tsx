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

export default function App() {
  const store = useMemo(() => new InspectionStore(), []);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [title, setTitle] = useState('Site Inspection 001');
  const [observation, setObservation] = useState('');
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const saved = await store.get('inspection-001');
    setInspection(saved);
    setPending(await store.pendingCount());
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

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

  const simulateSync = async () => {
    const item = await store.nextPending();
    if (!item) {
      Alert.alert('Sync', 'Nothing is pending.');
      return;
    }
    await store.acknowledge(item.id);
    setPending(await store.pendingCount());
    Alert.alert('Sync', 'Local queue item acknowledged. Backend sync is the next integration boundary.');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>Loading InspectFlow...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>KALP InspectFlow</Text>
        <Text style={styles.subtitle}>KMRAL Mobile Sandbox v0.2</Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Android shell: READY</Text>
          <Text>Persistent storage: READY</Text>
          <Text>Offline queue: {pending} pending</Text>
        </View>

        <Text style={styles.section}>Inspection</Text>

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

            <TouchableOpacity style={styles.secondary} onPress={() => void simulateSync()}>
              <Text style={styles.secondaryText}>Process Offline Queue</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.footer}>
          KMRAL vertical slice: UI to persistence to offline queue. Backend sync follows.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f7' },
  container: { padding: 24, paddingBottom: 48 },
  loading: { marginTop: 48, textAlign: 'center', fontSize: 18 },
  title: { fontSize: 30, fontWeight: '700' },
  subtitle: { marginTop: 6, fontSize: 16 },
  statusCard: { marginTop: 20, padding: 16, borderRadius: 12, backgroundColor: '#fff', gap: 6 },
  statusTitle: { fontSize: 17, fontWeight: '700' },
  section: { marginTop: 28, marginBottom: 10, fontSize: 20, fontWeight: '700' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 12 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  primary: { backgroundColor: '#111', borderRadius: 10, padding: 15, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#bbb', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  secondaryText: { fontWeight: '700' },
  inspectionCard: { marginTop: 16, padding: 16, backgroundColor: '#fff', borderRadius: 12, gap: 5 },
  inspectionTitle: { fontSize: 18, fontWeight: '700' },
  observation: { marginTop: 8, padding: 10, backgroundColor: '#fff', borderRadius: 8 },
  footer: { marginTop: 28, textAlign: 'center', fontSize: 13 },
});
