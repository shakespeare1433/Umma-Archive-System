import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { listOfficerUploads } from '../../services/bookletService';
import { Booklet } from '../../types';
import { borderRadius, colors as tokens, spacing } from '../../theme';

type UploadFilter = 'all' | 'uploaded' | 'processing' | 'failed';

const FILTERS: { key: UploadFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'uploaded', label: 'Uploaded' },
  { key: 'processing', label: 'Processing' },
  { key: 'failed', label: 'Failed' },
];

function statusOf(item: Booklet): Exclude<UploadFilter, 'all'> {
  if (item.digitised && item.pdfPath) return 'uploaded';
  if (item.pdfPath) return 'processing';
  return 'failed';
}

function isToday(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export const OfficerUploadsScreen: React.FC<{
  onScan?: () => void;
}> = ({ onScan }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UploadFilter>('all');
  const [rows, setRows] = useState<Booklet[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    setError('');
    try {
      setRows(await listOfficerUploads());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Uploads could not be loaded.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((item) => {
      const status = statusOf(item);
      if (filter !== 'all' && status !== filter) return false;
      if (!needle) return true;
      return (
        item.unitCode.toLowerCase().includes(needle) ||
        item.unitName.toLowerCase().includes(needle) ||
        item.registrationNo.toLowerCase().includes(needle) ||
        item.studentName.toLowerCase().includes(needle)
      );
    });
  }, [filter, query, rows]);

  const today = visible.filter((item) => isToday(item.createdAt));
  const earlier = visible.filter((item) => !isToday(item.createdAt));

  return (
    <View style={styles.stage}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search unit, code, or registration"
        placeholderTextColor={tokens.placeholder}
      />
      <View style={styles.chips}>
        {FILTERS.map((item) => {
          const on = filter === item.key;
          const count =
            item.key === 'all' ? rows.length : rows.filter((row) => statusOf(row) === item.key).length;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                {item.key === 'all' ? `All · ${count}` : item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {visible.length === 0 ? (
          <Text style={styles.empty}>No uploads yet. Archive a scanned PDF to add it here.</Text>
        ) : null}
        {today.length > 0 ? (
          <View style={styles.group}>
            <Text style={styles.groupLabel}>TODAY</Text>
            {today.map((item) => (
              <UploadCard key={item.id} item={item} />
            ))}
          </View>
        ) : null}
        {earlier.length > 0 ? (
          <View style={styles.group}>
            <Text style={styles.groupLabel}>EARLIER</Text>
            {earlier.map((item) => (
              <UploadCard key={item.id} item={item} />
            ))}
          </View>
        ) : null}
      </ScrollView>
      {onScan ? (
        <TouchableOpacity style={styles.scan} onPress={onScan} activeOpacity={0.85}>
          <Feather name="upload" size={16} color={tokens.onPrimary} />
          <Text style={styles.scanText}>Scan & upload booklet</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

function UploadCard({ item }: { item: Booklet }) {
  const status = statusOf(item);
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.code}>{item.unitCode}</Text>
        <Text style={[styles.badge, status === 'uploaded' ? styles.ok : status === 'processing' ? styles.wait : styles.fail]}>
          {status === 'uploaded' ? 'Uploaded' : status === 'processing' ? 'Processing' : 'Failed'}
        </Text>
      </View>
      <Text style={styles.title}>{item.unitName}</Text>
      <Text style={styles.meta}>
        {item.studentName} · {item.registrationNo}
      </Text>
      <Text style={styles.meta}>{item.academicSession}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: tokens.background },
  search: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    height: 46,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    paddingHorizontal: 12,
    color: tokens.onSurface,
  },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, paddingTop: 12 },
  chip: {
    flex: 1,
    height: 34,
    borderRadius: 17,
    backgroundColor: tokens.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: tokens.primary },
  chipText: { fontSize: 11, fontWeight: '700', color: tokens.onSurfaceVariant },
  chipTextOn: { color: tokens.onPrimary },
  page: { padding: spacing.md, paddingBottom: 90 },
  group: { marginBottom: 16 },
  groupLabel: { fontSize: 11, fontWeight: '800', color: tokens.onSurfaceVariant, marginBottom: 8 },
  empty: { color: tokens.onSurfaceVariant, lineHeight: 20 },
  error: { color: tokens.error, fontWeight: '600', marginBottom: 10 },
  card: {
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 12, fontWeight: '800', color: tokens.secondary },
  title: { marginTop: 4, fontSize: 15, fontWeight: '800', color: tokens.onSurface },
  meta: { marginTop: 4, fontSize: 12, color: tokens.onSurfaceVariant },
  badge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  ok: { backgroundColor: '#DCFCE7', color: '#166534' },
  wait: { backgroundColor: '#FEF3C7', color: '#92400E' },
  fail: { backgroundColor: '#FEE2E2', color: '#B91C1C' },
  scan: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 48,
    borderRadius: borderRadius.pill,
    backgroundColor: tokens.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanText: { color: tokens.onPrimary, fontWeight: '800' },
});
