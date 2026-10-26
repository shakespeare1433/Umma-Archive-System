import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { useVault } from '../../context/VaultContext';
import { ArchivedExaminationRecord } from '../../types';

export const OfficerVaultScreen: React.FC = () => {
  const { records, updateRecord } = useVault();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.courseCode.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        r.admissionNumber.toLowerCase().includes(q) ||
        r.shelf.toLowerCase().includes(q)
    );
  }, [records, query]);

  const cycleStatus = (record: ArchivedExaminationRecord) => {
    const order: ArchivedExaminationRecord['vaultStatus'][] = [
      'Verified in Vault',
      'Requested',
      'Staged in Vault',
      'Dispatched',
      'Checked Out',
    ];
    const i = order.indexOf(record.vaultStatus);
    const next = order[(i + 1) % order.length];
    Alert.alert('Update vault status', `Set ${record.courseCode} to ${next}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update',
        onPress: () => updateRecord({ ...record, vaultStatus: next }),
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <LecturerTopHeader subtitle="Exam Officer Portal" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Shelf inventory</Text>
        <TextInput
          style={styles.search}
          placeholder="Search code, student, shelf..."
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={setQuery}
        />
        {filtered.map((rec) => (
          <TouchableOpacity key={rec.id} style={styles.card} onPress={() => cycleStatus(rec)}>
            <View style={styles.row}>
              <Text style={styles.code}>{rec.courseCode}</Text>
              <Text style={styles.status}>{rec.vaultStatus}</Text>
            </View>
            <Text style={styles.name}>{rec.courseName}</Text>
            <Text style={styles.meta}>
              {rec.studentName} • {rec.admissionNumber}
            </Text>
            <Text style={styles.shelf}>
              {rec.shelf} → {rec.rack} → {rec.box} → {rec.pos}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7FC' },
  content: { padding: 16, paddingBottom: 32 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E2B58',
    fontFamily: 'serif',
    marginBottom: 12,
  },
  search: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    color: '#1E293B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  code: { fontWeight: '700', color: '#35477B' },
  status: { fontSize: 11, fontWeight: '600', color: '#166534' },
  name: { fontWeight: '700', color: '#111827', marginBottom: 4 },
  meta: { fontSize: 12, color: '#64748B' },
  shelf: { fontSize: 12, color: '#1E293B', marginTop: 6, fontWeight: '600' },
});
