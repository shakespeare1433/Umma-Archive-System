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
import { useAuth } from '../../context/AuthContext';
import { listOfficerUploads } from '../../services/bookletService';
import { Booklet } from '../../types';
import { borderRadius, colors as tokens, spacing } from '../../theme';

type UploadFilter = 'all' | 'uploaded' | 'processing' | 'failed';
type UploadStatus = 'uploaded' | 'processing' | 'failed';

const FILTERS: { key: UploadFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'uploaded', label: 'Uploaded' },
  { key: 'processing', label: 'Processing' },
  { key: 'failed', label: 'Failed' },
];

function statusOf(item: Booklet): UploadStatus {
  if (item.digitised || item.pdfPath) return 'uploaded';
  return 'processing';
}

function isToday(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatWhen(iso: string, today: boolean) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  if (today) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function bookletTitle(item: Booklet) {
  const name = item.unitName.replace(new RegExp(`^${item.unitCode}\\s*[:·-]?\\s*`, 'i'), '');
  return `${item.unitCode} · ${name}`.trim();
}

export const OfficerUploadsScreen: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Booklet[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UploadFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const list = await listOfficerUploads();
      const mine = user?.id ? list.filter((item) => !item.uploadedBy || item.uploadedBy === user.id) : list;
      setRows(mine);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Uploads could not be loaded.');
      setRows([]);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const uploaded = rows.filter((item) => statusOf(item) === 'uploaded').length;
    const processing = rows.filter((item) => statusOf(item) === 'processing').length;
    const failed = rows.filter((item) => statusOf(item) === 'failed').length;
    return { all: rows.length, uploaded, processing, failed };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((item) => {
      const status = statusOf(item);
      if (filter !== 'all' && status !== filter) return false;
      if (!q) return true;
      return (
        item.unitCode.toLowerCase().includes(q) ||
        item.unitName.toLowerCase().includes(q) ||
        item.registrationNo.toLowerCase().includes(q)
      );
    });
  }, [rows, query, filter]);

  const today = visible.filter((item) => isToday(item.createdAt));
  const earlier = visible.filter((item) => !isToday(item.createdAt));

  return (
    <View style={styles.stage}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <Text style={styles.title}>Uploads</Text>
        <Text style={styles.subtitle}>Booklets you have scanned and archived</Text>

        <View style={styles.search}>
          <Feather name="search" size={16} color={tokens.placeholder} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by unit, code or reg. no."
            placeholderTextColor={tokens.placeholder}
          />
        </View>

        <View style={styles.filters}>
          {FILTERS.map((item) => {
            const on = filter === item.key;
            const count = counts[item.key];
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setFilter(item.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                  {item.key === 'all' ? `All · ${count}` : item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {visible.length === 0 ? (
          <Text style={styles.empty}>
            {rows.length === 0
              ? 'No uploads yet.'
              : 'No matching uploads.'}
          </Text>
        ) : null}

        {today.length > 0 ? (
          <View style={styles.group}>
            <Text style={styles.groupLabel}>TODAY</Text>
            {today.map((item) => (
              <UploadCard key={item.id} item={item} today onRetry={() => void load()} />
            ))}
          </View>
        ) : null}

        {earlier.length > 0 ? (
          <View style={styles.group}>
            <Text style={styles.groupLabel}>EARLIER</Text>
            {earlier.map((item) => (
              <UploadCard key={item.id} item={item} today={false} onRetry={() => void load()} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

function UploadCard({
  item,
  today,
  onRetry,
}: {
  item: Booklet;
  today: boolean;
  onRetry: () => void;
}) {
  const status = statusOf(item);
  const when = formatWhen(item.createdAt, today);
  const reg = item.registrationNo || 'No reg. no.';
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.fileIcon}>
          <Feather name="file-text" size={18} color={tokens.secondary} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {bookletTitle(item)}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {reg}
            {when ? ` · ${when}` : ''}
          </Text>
        </View>
        <StatusChip status={status} />
      </View>
      {status === 'processing' ? (
        <View style={styles.progress}>
          <View style={styles.progressFill} />
        </View>
      ) : null}
      {status === 'failed' ? (
        <TouchableOpacity style={styles.retry} onPress={onRetry} activeOpacity={0.85}>
          <Feather name="refresh-ccw" size={14} color={tokens.error} />
          <Text style={styles.retryText}>Retry upload</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function StatusChip({ status }: { status: UploadStatus }) {
  const tone =
    status === 'uploaded'
      ? { bg: tokens.statusVerifiedBg, fg: tokens.statusVerifiedText, label: 'Uploaded' }
      : status === 'failed'
        ? { bg: tokens.errorContainer, fg: tokens.error, label: 'Failed' }
        : { bg: tokens.statusNoticeBlueBg, fg: tokens.statusNoticeBlue, label: 'Processing' };
  return (
    <View style={[styles.status, { backgroundColor: tone.bg }]}>
      <Text style={[styles.statusText, { color: tone.fg }]}>{tone.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: tokens.background },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 28 },
  title: { fontSize: 26, fontWeight: '800', color: tokens.onSurface },
  subtitle: { marginTop: 4, marginBottom: 14, fontSize: 13, color: tokens.onSurfaceVariant },
  search: {
    height: 46,
    borderRadius: borderRadius.pill,
    backgroundColor: tokens.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: tokens.onSurface, paddingVertical: 0 },
  filters: { flexDirection: 'row', gap: 8, marginTop: 14 },
  chip: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: tokens.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
  },
  chipOn: {
    backgroundColor: tokens.primary,
    borderColor: tokens.primary,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: tokens.onSurfaceVariant },
  chipTextOn: { color: tokens.onPrimary },
  error: { marginTop: 12, color: tokens.error, fontSize: 12, fontWeight: '600' },
  empty: { marginTop: 18, color: tokens.onSurfaceVariant, fontSize: 13, lineHeight: 18 },
  group: { marginTop: 18 },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: tokens.outline,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    shadowColor: '#1B2744',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: tokens.onSurface },
  cardMeta: { marginTop: 3, fontSize: 12, color: tokens.onSurfaceVariant },
  status: { borderRadius: borderRadius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  progress: {
    marginTop: 12,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.surfaceContainer,
    overflow: 'hidden',
  },
  progressFill: {
    width: '72%',
    height: 4,
    backgroundColor: tokens.primary,
  },
  retry: {
    marginTop: 12,
    height: 42,
    borderRadius: borderRadius.md,
    backgroundColor: tokens.errorContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  retryText: { color: tokens.error, fontWeight: '700', fontSize: 13 },
});
