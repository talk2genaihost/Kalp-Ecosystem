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
import { hasSession, signIn, signOut } from './inspectflow/kmrlSync';
import { STEM_EXPERIMENTS, STEM_CATALOG_SOURCE } from './inspectflow/stemCatalog';

type Screen = 'home' | 'catalog' | 'profile';

const SUBJECTS = ['All', 'Physics', 'Chemistry', 'Mathematics'] as const;
type Subject = (typeof SUBJECTS)[number];

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState<Subject>('All');

  useEffect(() => {
    void (async () => {
      setAuthenticated(await hasSession());
      setLoading(false);
    })();
  }, []);

  const login = async () => {
    try {
      await signIn(email.trim(), password);
      setAuthenticated(true);
      setPassword('');
    } catch (error) {
      Alert.alert('Sign-in failed', error instanceof Error ? error.message : 'Unable to sign in');
    }
  };

  const logout = async () => {
    await signOut();
    setAuthenticated(false);
  };

  const filteredExperiments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STEM_EXPERIMENTS.filter((item) => {
      const matchesSubject = subject === 'All' || item.Domain === subject;
      const matchesQuery =
        !q ||
        item.Experiment_ID.toLowerCase().includes(q) ||
        item.Experiment_Name.toLowerCase().includes(q) ||
        item.Model_ID.toLowerCase().includes(q);
      return matchesSubject && matchesQuery;
    });
  }, [query, subject]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <Text style={styles.brand}>⚗ KMRL</Text>
          <Text style={styles.loading}>Loading Sandbox…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!authenticated) {
    return <LoginScreen email={email} password={password} setEmail={setEmail} setPassword={setPassword} onLogin={() => void login()} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      {screen === 'home' && <Home onCatalog={() => setScreen('catalog')} onProfile={() => setScreen('profile')} />}
      {screen === 'catalog' && (
        <Catalog
          query={query}
          setQuery={setQuery}
          subject={subject}
          setSubject={setSubject}
          experiments={filteredExperiments}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'profile' && <Profile onBack={() => setScreen('home')} onSignOut={() => void logout()} />}
      <BottomNav screen={screen} onHome={() => setScreen('home')} onCatalog={() => setScreen('catalog')} onProfile={() => setScreen('profile')} />
    </SafeAreaView>
  );
}

function LoginScreen({
  email,
  password,
  setEmail,
  setPassword,
  onLogin,
}: {
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  onLogin: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.loginContainer}>
        <Text style={styles.loginBrand}>⚗ KMRL</Text>
        <Text style={styles.loginTitle}>KMRL Sandbox</Text>
        <Text style={styles.loginSubtitle}>Explore · Experiment · Measure · Learn</Text>
        <View style={styles.loginCard}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.helper}>Sign in to save experiments and sync your work with KMRL Sandbox.</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" style={styles.input} />
          <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={styles.input} />
          <TouchableOpacity style={styles.primary} onPress={onLogin}>
            <Text style={styles.primaryText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Home({ onCatalog, onProfile }: { onCatalog: () => void; onProfile: () => void }) {
  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>⚗ KMRL</Text>
            <Text style={styles.heroTitle}>KMRL SANDBOX</Text>
            <Text style={styles.subtitle}>Explore · Experiment · Measure · Learn</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={onProfile}><Text>👤</Text></TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroArt}><Text style={styles.heroEmoji}>🔬</Text></View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroCardTitle}>Learn by doing</Text>
            <Text style={styles.heroCardText}>Run interactive STEM experiments, record observations and keep your results.</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.startCard} onPress={onCatalog}>
          <View style={styles.startIcon}><Text style={styles.startIconText}>▶</Text></View>
          <View style={styles.startBody}>
            <Text style={styles.startTitle}>Start New Experiment</Text>
            <Text style={styles.startText}>Choose from the STEM catalog</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.grid}>
          <ActionCard icon="📚" title="STEM Catalog" subtitle="45 experiments" onPress={onCatalog} />
          <ActionCard icon="🧪" title="Continue" subtitle="No active experiment" disabled />
          <ActionCard icon="📊" title="My Results" subtitle="No results yet" disabled />
          <ActionCard icon="🕘" title="Recent" subtitle="No experiments yet" disabled />
        </View>

        <View style={styles.syncCard}>
          <View style={styles.syncDot} />
          <View style={styles.syncBody}>
            <Text style={styles.syncTitle}>Sync Status</Text>
            <Text style={styles.syncText}>Online · Ready to sync</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </View>

        <Text style={styles.sectionTitle}>Choose a subject</Text>
        <View style={styles.subjectPreview}>
          <SubjectCard label="Physics" emoji="⚛" detail="Motion · Energy · Forces" />
          <SubjectCard label="Chemistry" emoji="⚗" detail="Matter · Reactions · Solutions" />
          <SubjectCard label="Mathematics" emoji="π" detail="Algebra · Geometry · Statistics" />
        </View>
      </ScrollView>
    </>
  );
}

function Catalog({
  query,
  setQuery,
  subject,
  setSubject,
  experiments,
  onBack,
}: {
  query: string;
  setQuery: (value: string) => void;
  subject: Subject;
  setSubject: (value: Subject) => void;
  experiments: typeof STEM_EXPERIMENTS;
  onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ Home</Text></TouchableOpacity>
        <Text style={styles.catalogCount}>{experiments.length} shown</Text>
      </View>
      <Text style={styles.pageTitle}>STEM Catalog</Text>
      <Text style={styles.subtitle}>45 governed seed experiments</Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search experiments…"
        style={styles.search}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {SUBJECTS.map((item) => (
          <TouchableOpacity key={item} onPress={() => setSubject(item)} style={[styles.chip, subject === item && styles.chipActive]}>
            <Text style={[styles.chipText, subject === item && styles.chipTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sourceCard}>
        <Text style={styles.sourceTitle}>CATALOG SOURCE · READY</Text>
        <Text style={styles.sourceText}>{STEM_CATALOG_SOURCE.approvedWorkbook}</Text>
        <Text style={styles.sourceText}>Physics 15 · Chemistry 15 · Mathematics 15</Text>
      </View>

      <Text style={styles.sectionTitle}>Experiments</Text>
      {experiments.map((item) => (
        <TouchableOpacity key={item.Experiment_ID} style={styles.experimentCard} onPress={() => Alert.alert('Experiment Workspace', item.Experiment_Name + '\n\nWorkspace is the next KMRL build stage.')}>
          <View style={[styles.experimentIcon, item.Domain === 'Physics' ? styles.physics : item.Domain === 'Chemistry' ? styles.chemistry : styles.math]}>
            <Text style={styles.experimentEmoji}>{item.Domain === 'Physics' ? '⚛' : item.Domain === 'Chemistry' ? '⚗' : 'π'}</Text>
          </View>
          <View style={styles.experimentBody}>
            <Text style={styles.experimentId}>{item.Experiment_ID}</Text>
            <Text style={styles.experimentName}>{item.Experiment_Name}</Text>
            <Text style={styles.experimentMeta}>{item.Domain} · {item.Model_ID}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function Profile({ onBack, onSignOut }: { onBack: () => void; onSignOut: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ Home</Text></TouchableOpacity>
      <Text style={styles.pageTitle}>Profile</Text>
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}><Text style={{ fontSize: 28 }}>👤</Text></View>
        <View><Text style={styles.profileName}>KMRL Student</Text><Text style={styles.profileMeta}>KMRL Sandbox account</Text></View>
      </View>
      <View style={styles.settingCard}>
        <Text style={styles.settingRow}>☁  Sync & Offline Storage</Text>
        <Text style={styles.settingRow}>🔔  Notifications</Text>
        <Text style={styles.settingRow}>⚙  Settings</Text>
        <Text style={styles.settingRow}>ℹ  About KMRL Sandbox</Text>
      </View>
      <TouchableOpacity style={styles.secondary} onPress={onSignOut}><Text style={styles.secondaryText}>Sign out</Text></TouchableOpacity>
    </ScrollView>
  );
}

function ActionCard({ icon, title, subtitle, onPress, disabled }: { icon: string; title: string; subtitle: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.actionCard, disabled && styles.actionDisabled]}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function SubjectCard({ label, emoji, detail }: { label: string; emoji: string; detail: string }) {
  return (
    <View style={styles.subjectCard}>
      <Text style={styles.subjectEmoji}>{emoji}</Text>
      <Text style={styles.subjectLabel}>{label}</Text>
      <Text style={styles.subjectDetail}>{detail}</Text>
    </View>
  );
}

function BottomNav({ screen, onHome, onCatalog, onProfile }: { screen: Screen; onHome: () => void; onCatalog: () => void; onProfile: () => void }) {
  return (
    <View style={styles.nav}>
      <NavItem label="Home" icon="⌂" active={screen === 'home'} onPress={onHome} />
      <NavItem label="Catalog" icon="▣" active={screen === 'catalog'} onPress={onCatalog} />
      <NavItem label="Experiments" icon="⚗" active={false} onPress={() => Alert.alert('Experiments', 'Experiment Workspace is the next build stage.')} />
      <NavItem label="Results" icon="▥" active={false} onPress={() => Alert.alert('Results', 'Results history is the next build stage.')} />
      <NavItem label="Profile" icon="●" active={screen === 'profile'} onPress={onProfile} />
    </View>
  );
}

function NavItem({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.navItem}>
      <Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text>
      <Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 18, paddingBottom: 96 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 16, fontWeight: '800', color: '#0c5a91' },
  loading: { marginTop: 12, fontSize: 16, color: '#4a6170' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  heroTitle: { marginTop: 8, fontSize: 30, fontWeight: '900', color: '#0b2740' },
  subtitle: { marginTop: 4, fontSize: 14, color: '#5f7380' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d7e4ec' },
  heroCard: { flexDirection: 'row', backgroundColor: '#dff1ff', borderRadius: 20, padding: 16, alignItems: 'center', marginBottom: 14 },
  heroArt: { width: 82, height: 82, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 44 },
  heroCopy: { flex: 1, marginLeft: 14 },
  heroCardTitle: { fontSize: 20, fontWeight: '800', color: '#0b3553' },
  heroCardText: { marginTop: 6, fontSize: 13, lineHeight: 18, color: '#355a70' },
  startCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0b83f6', borderRadius: 18, padding: 16, marginBottom: 14 },
  startIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  startIconText: { color: '#0b83f6', fontSize: 20 },
  startBody: { flex: 1, marginLeft: 12 },
  startTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  startText: { color: '#dff1ff', marginTop: 3, fontSize: 12 },
  arrow: { fontSize: 28, color: '#78909c' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionCard: { width: '48.5%', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e0eaf0' },
  actionDisabled: { opacity: 0.62 },
  actionIcon: { fontSize: 26 },
  actionTitle: { marginTop: 8, fontSize: 16, fontWeight: '800', color: '#17384f' },
  actionSubtitle: { marginTop: 4, fontSize: 12, color: '#738692' },
  syncCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#dce8ee', marginTop: 2 },
  syncDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#20a464' },
  syncBody: { flex: 1, marginLeft: 12 },
  syncTitle: { fontSize: 16, fontWeight: '800', color: '#17384f' },
  syncText: { marginTop: 3, color: '#64808f', fontSize: 12 },
  sectionTitle: { marginTop: 22, marginBottom: 10, fontSize: 20, fontWeight: '800', color: '#17384f' },
  subjectPreview: { gap: 10 },
  subjectCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e0eaf0' },
  subjectEmoji: { fontSize: 28 },
  subjectLabel: { marginTop: 6, fontSize: 17, fontWeight: '800', color: '#17384f' },
  subjectDetail: { marginTop: 3, fontSize: 12, color: '#708692' },
  back: { color: '#0b83f6', fontSize: 16, fontWeight: '700' },
  pageTitle: { marginTop: 12, fontSize: 30, fontWeight: '900', color: '#0b2740' },
  catalogCount: { color: '#6b808c', fontSize: 12 },
  search: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#d8e5ec', marginTop: 18 },
  chips: { paddingVertical: 12, gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e5ec' },
  chipActive: { backgroundColor: '#0b83f6', borderColor: '#0b83f6' },
  chipText: { color: '#45616f', fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  sourceCard: { backgroundColor: '#e8f7ef', borderRadius: 14, padding: 14, marginTop: 2 },
  sourceTitle: { color: '#167545', fontSize: 12, fontWeight: '900' },
  sourceText: { marginTop: 4, color: '#355e49', fontSize: 12 },
  experimentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e0eaf0' },
  experimentIcon: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  physics: { backgroundColor: '#dff1ff' },
  chemistry: { backgroundColor: '#e8f7ef' },
  math: { backgroundColor: '#fff0e6' },
  experimentEmoji: { fontSize: 28 },
  experimentBody: { flex: 1, marginLeft: 12 },
  experimentId: { color: '#6d7f89', fontSize: 11, fontWeight: '800' },
  experimentName: { marginTop: 2, fontSize: 15, fontWeight: '800', color: '#17384f' },
  experimentMeta: { marginTop: 4, fontSize: 11, color: '#708692' },
  loginContainer: { padding: 22, paddingTop: 80 },
  loginBrand: { fontSize: 18, fontWeight: '900', color: '#0b83f6' },
  loginTitle: { marginTop: 12, fontSize: 34, fontWeight: '900', color: '#0b2740' },
  loginSubtitle: { marginTop: 5, color: '#607985' },
  loginCard: { marginTop: 30, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#dce8ee' },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#17384f' },
  helper: { marginTop: 7, marginBottom: 16, color: '#657b87', lineHeight: 19 },
  input: { backgroundColor: '#f8fbfd', borderWidth: 1, borderColor: '#d8e5ec', borderRadius: 12, padding: 14, marginBottom: 12 },
  primary: { backgroundColor: '#0b83f6', borderRadius: 13, padding: 15, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  profileCard: { marginTop: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  profileAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#dff1ff', alignItems: 'center', justifyContent: 'center' },
  profileName: { marginLeft: 14, fontSize: 18, fontWeight: '800', color: '#17384f' },
  profileMeta: { marginLeft: 14, marginTop: 3, color: '#71848e', fontSize: 12 },
  settingCard: { marginTop: 14, backgroundColor: '#fff', borderRadius: 16, padding: 4 },
  settingRow: { padding: 16, fontSize: 15, color: '#29495b', borderBottomWidth: 1, borderBottomColor: '#edf2f5' },
  secondary: { marginTop: 18, borderWidth: 1, borderColor: '#b8cbd5', borderRadius: 13, padding: 14, alignItems: 'center', backgroundColor: '#fff' },
  secondaryText: { color: '#29495b', fontWeight: '800' },
  nav: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 72, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#dce8ee', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  navItem: { alignItems: 'center', width: '20%' },
  navIcon: { fontSize: 19, color: '#78909c' },
  navLabel: { marginTop: 3, fontSize: 10, color: '#78909c' },
  navActive: { color: '#0b83f6', fontWeight: '900' },
});
