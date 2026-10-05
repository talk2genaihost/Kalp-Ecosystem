import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>KALP InspectFlow</Text>
        <Text style={styles.subtitle}>KMRAL Mobile Sandbox v0.1</Text>
        <Text style={styles.status}>Android shell: READY</Text>
        <Text style={styles.next}>Inspection workflow integration is next.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { marginTop: 8, fontSize: 16 },
  status: { marginTop: 24, fontSize: 16 },
  next: { marginTop: 12, textAlign: 'center' }
});
