import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

type InspectionStatus = 'draft' | 'in_progress' | 'completed';

type Inspection = {
  id: string;
  title: string;
  location: string;
  status: InspectionStatus;
  checklist: number;
};

const initialInspections: Inspection[] = [
  { id: 'INS-001', title: 'Site Safety Inspection', location: 'Demo Site A', status: 'in_progress', checklist: 8 },
  { id: 'INS-002', title: 'Equipment Inspection', location: 'Demo Site B', status: 'draft', checklist: 0 },
];

export default function App() {
  const [inspections, setInspections] = useState(initialInspections);
  const active = useMemo(() => inspections.filter((item) => item.status !== 'completed').length, [inspections]);

  function advance(id: string) {
    setInspections((items) => items.map((item) => item.id === id
      ? { ...item, status: item.status === 'draft' ? 'in_progress' : 'completed' }
      : item));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>KALP • INSPECTION DOMAIN</Text>
        <Text style={styles.title}>InspectFlow</Text>
        <Text style={styles.subtitle}>Reusable mobile inspection runtime</Text>

        <View style={styles.summary}>
          <Text style={styles.summaryNumber}>{active}</Text>
          <Text style={styles.summaryLabel}>Active inspections</Text>
        </View>

        {inspections.map((inspection) => (
          <View key={inspection.id} style={styles.card}>
            <Text style={styles.cardTitle}>{inspection.title}</Text>
            <Text style={styles.meta}>{inspection.location} • {inspection.id}</Text>
            <Text style={styles.status}>Status: {inspection.status.replace('_', ' ')}</Text>
            <Pressable style={styles.button} onPress={() => advance(inspection.id)}>
              <Text style={styles.buttonText}>
                {inspection.status === 'draft' ? 'Start inspection' : inspection.status === 'in_progress' ? 'Complete inspection' : 'Completed'}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7f9' },
  container: { padding: 20, gap: 14 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 34, fontWeight: '800' },
  subtitle: { fontSize: 16, color: '#555' },
  summary: { padding: 18, borderRadius: 16, backgroundColor: '#fff' },
  summaryNumber: { fontSize: 32, fontWeight: '800' },
  summaryLabel: { color: '#555' },
  card: { padding: 18, borderRadius: 16, backgroundColor: '#fff', gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  meta: { color: '#666' },
  status: { textTransform: 'capitalize' },
  button: { marginTop: 6, padding: 13, borderRadius: 10, backgroundColor: '#111' },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' }
});
