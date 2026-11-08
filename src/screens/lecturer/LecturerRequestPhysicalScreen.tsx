import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import { RootStackParamList } from '../../types';
import { BOOKLET_COPY } from '../../constants/booklets';
import { searchArchives } from '../../services/archiveService';
import { friendlyBookletError } from '../../services/bookletService';
import { useVault } from '../../context/VaultContext';
import { borderRadius, colors as tokens, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LecturerRequestPhysical'>;

export const LecturerRequestPhysicalScreen: React.FC<Props> = ({ navigation, route }) => {
  const details = route.params;
  const { requestBooklet, rememberArchives } = useVault();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      setError('Please enter a reason for this request.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const matches = await searchArchives({
        school: details.school,
        session: details.academicSession,
        unitCode: details.unitCode,
        unitName: details.unitName,
        studentName: details.studentName,
        admissionNumber: details.registrationNo,
      });
      rememberArchives(matches);
      const rec =
        matches.find((row) => row.id === details.archiveId) ??
        matches.find(
          (row) =>
            row.admissionNumber.trim().toLowerCase() ===
            (details.registrationNo || '').trim().toLowerCase()
        ) ??
        matches[0] ??
        null;
      if (!rec) {
        setError(BOOKLET_COPY.noArchive);
        return;
      }
      const failed = await requestBooklet(rec.id, 'PHYSICAL RETRIEVAL', rec, reason.trim());
      if (failed) {
        setError(failed);
        return;
      }
      setDone(true);
    } catch (caught) {
      setError(friendlyBookletError(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.stage}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1F4D" />
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        <View style={styles.topBanner}>
          <Text style={styles.topBannerText}>Lecturer Request Form</Text>
        </View>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Back"
          >
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Physical Booklet</Text>
          <View style={styles.headerBtn} />
        </View>
      </SafeAreaView>

      <KeyboardScrollView
        containerStyle={styles.flex}
        bottomOffset={24}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
          <View style={styles.infoBanner}>
            <View style={styles.infoIcon}>
              <Feather name="info" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.infoText}>
              You can request the original physical booklet even if the PDF is available.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Examination Details</Text>
            <DetailRow label="Student Name" value={details.studentName || 'Not recorded'} />
            <DetailRow label="Reg. Number" value={details.registrationNo || 'Not recorded'} />
            <DetailRow label="School" value={details.school || 'Not recorded'} />
            <DetailRow label="Programme" value={details.programme || 'Not recorded'} />
            <DetailRow label="Session" value={details.academicSession || 'Not recorded'} />
            <DetailRow label="Unit Code" value={details.unitCode || 'Not recorded'} />
            <DetailRow label="Unit Name" value={details.unitName || 'Not recorded'} />
          </View>

          {done ? (
            <View style={styles.successCard}>
              <Feather name="check-circle" size={28} color="#34D399" />
              <Text style={styles.successTitle}>Request submitted</Text>
              <Text style={styles.successBody}>
                The Examination Officer has been notified. You will get an update when the booklet is
                located.
              </Text>
              <TouchableOpacity style={styles.submitBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.submitText}>Back to Search</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.label}>
                Reason for Request <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.reasonInput}
                value={reason}
                onChangeText={(text) => {
                  setReason(text);
                  if (error) setError('');
                }}
                placeholder="e.g. Need to verify marks..."
                placeholderTextColor="#64748B"
                multiline
                textAlignVertical="top"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitDisabled]}
                disabled={submitting}
                onPress={() => void submit()}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
      </KeyboardScrollView>
    </View>
  );
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#D7DEEA' },
  flex: { flex: 1 },
  topSafe: { backgroundColor: '#0B1F4D' },
  topBanner: {
    backgroundColor: '#071536',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  topBannerText: { color: '#BFDBFE', fontWeight: '700', fontSize: 12 },
  header: {
    height: 52,
    backgroundColor: '#0B1F4D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  content: { padding: spacing.md, paddingBottom: 36, gap: 12 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#DBEAFE',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#93C5FD',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1, color: '#1E3A8A', fontWeight: '700', fontSize: 12, lineHeight: 17 },
  card: {
    backgroundColor: '#EEF2F8',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#B8C7DE',
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: tokens.primary,
    marginBottom: 12,
  },
  row: { marginBottom: 10 },
  rowLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 2 },
  rowValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  label: { fontSize: 13, fontWeight: '800', color: tokens.primary, marginBottom: 8 },
  required: { color: tokens.error },
  reasonInput: {
    minHeight: 110,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  error: { color: tokens.error, fontWeight: '700', fontSize: 12, marginBottom: 10 },
  submitBtn: {
    height: 48,
    borderRadius: borderRadius.button,
    backgroundColor: tokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  successCard: {
    backgroundColor: '#0B1F4D',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 10,
  },
  successTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  successBody: {
    color: '#BFDBFE',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
});
