import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { useAuth } from '../../context/AuthContext';
import { adminPalette, useTheme } from '../../context/ThemeContext';
import { useVault } from '../../context/VaultContext';
import { listOfficerUploads, listRecentDownloads } from '../../services/bookletService';
import { borderRadius, colors as tokens, spacing } from '../../theme';

type ActivityKind = 'upload' | 'download' | 'login' | 'staff' | 'request';
type ActivityFilter = 'all' | 'login' | 'upload' | 'download' | 'request';
type RangeKey = '7d' | '30d' | 'all';

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  createdAt: string;
}

const FILTERS: { key: ActivityFilter; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { key: 'all', label: 'All Activity', icon: 'activity' },
  { key: 'upload', label: 'Uploads', icon: 'upload' },
  { key: 'download', label: 'Downloads', icon: 'download' },
  { key: 'request', label: 'Requests', icon: 'map-pin' },
  { key: 'login', label: 'Logins', icon: 'log-in' },
];

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'all', label: 'All time' },
];

const KIND_STYLE: Record<ActivityKind, { bg: string; icon: string; glyph: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }> = {
  upload: { bg: '#047857', icon: tokens.onPrimary, glyph: 'file-upload-outline' },
  download: { bg: '#0369A1', icon: tokens.onPrimary, glyph: 'file-download-outline' },
  login: { bg: '#1E3A8A', icon: tokens.onPrimary, glyph: 'login' },
  staff: { bg: '#6B21A8', icon: tokens.onPrimary, glyph: 'account-plus-outline' },
  request: { bg: '#C2410C', icon: tokens.onPrimary, glyph: 'clipboard-text-outline' },
};

function nameFor(users: { id: string; name: string }[], id: string | null | undefined, fallback: string) {
  if (!id) return fallback;
  return users.find((user) => user.id === id)?.name || fallback;
}

function rangeStart(range: RangeKey) {
  if (range === 'all') return 0;
  const days = range === '7d' ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function formatAgo(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export const AdminActivityScreen: React.FC<{
  initialFilter?: ActivityFilter;
  onInitialFilterConsumed?: () => void;
}> = ({ initialFilter, onInitialFilterConsumed }) => {
  const { theme } = useTheme();
  const palette = adminPalette(theme);
  const { users } = useAuth();
  const { requests } = useVault();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<ActivityFilter>(initialFilter ?? 'all');
  const [range, setRange] = useState<RangeKey>(initialFilter === 'download' ? '7d' : 'all');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialFilter) return;
    setFilter(initialFilter);
    setRange(initialFilter === 'download' ? '7d' : 'all');
    onInitialFilterConsumed?.();
  }, [initialFilter, onInitialFilterConsumed]);

  const load = useCallback(async () => {
    try {
      const [uploads, downloads] = await Promise.all([
        listOfficerUploads().catch(() => []),
        listRecentDownloads().catch(() => []),
      ]);
      const next: ActivityItem[] = [];
      uploads.forEach((booklet) => {
        next.push({
          id: `upload-${booklet.id}`,
          kind: 'upload',
          title: 'Booklet uploaded',
          detail: `${booklet.unitCode}${booklet.academicSession ? ` · ${booklet.academicSession}` : ''} by ${nameFor(users, booklet.uploadedBy, 'Examination Officer')}`,
          createdAt: booklet.createdAt,
        });
      });
      downloads.forEach((row) => {
        next.push({
          id: `download-${row.id}`,
          kind: 'download',
          title: row.action === 'view' ? 'Booklet opened' : 'Booklet downloaded',
          detail: `${row.unitCode || 'Booklet'}${row.registrationNo ? ` · ${row.registrationNo}` : ''} by ${nameFor(users, row.lecturerId, 'Lecturer')}`,
          createdAt: row.createdAt,
        });
      });
      users.forEach((user) => {
        next.push({
          id: `staff-${user.id}`,
          kind: 'staff',
          title: 'Staff account created',
          detail: `${user.name} (${user.role})`,
          createdAt: user.createdAt,
        });
      });
      requests.forEach((request) => {
        next.push({
          id: `request-${request.id}`,
          kind: 'request',
          title: 'Retrieval requested',
          detail: `${request.courseCode} by ${request.requesterName}`,
          createdAt: request.createdAt,
        });
      });
      next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(next);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Activity could not be loaded.');
    }
  }, [users, requests]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const since = rangeStart(range);
    return items.filter((item) => {
      if (new Date(item.createdAt).getTime() < since) return false;
      if (filter === 'all') return true;
      if (filter === 'upload') return item.kind === 'upload';
      if (filter === 'download') return item.kind === 'download';
      if (filter === 'request') return item.kind === 'request';
      return item.kind === 'login';
    });
  }, [items, filter, range]);

  const rangeLabel = RANGES.find((item) => item.key === range)?.label ?? 'Last 7 days';

  return (
    <View style={[styles.screen, { backgroundColor: palette.page }]}>
      <LecturerTopHeader subtitle="Admin Portal" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={tokens.primary}
          />
        }
      >
        <Text style={[styles.pageTitle, { color: palette.ink }]}>System Activity</Text>
        <Text style={[styles.pageSub, { color: palette.muted }]}>Monitor user actions and system events</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {FILTERS.map((item) => {
            const on = filter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.chip,
                  { backgroundColor: palette.card, borderColor: palette.line },
                  on && styles.chipOn,
                ]}
                onPress={() => setFilter(item.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Feather name={item.icon} size={14} color={on ? tokens.onPrimary : palette.muted} />
                <Text style={[styles.chipText, { color: palette.ink }, on && styles.chipTextOn]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={[styles.rangeBtn, { backgroundColor: palette.card, borderColor: palette.line }]}
          onPress={() => setRangeOpen(true)}
          accessibilityRole="button"
        >
          <Text style={[styles.rangeText, { color: palette.ink }]}>{rangeLabel}</Text>
          <Feather name="chevron-down" size={16} color={palette.muted} />
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {visible.length === 0 ? (
          <Text style={[styles.empty, { color: palette.muted }]}>
            {filter === 'login'
              ? 'Sign-in history is not stored yet.'
              : filter === 'download'
                ? 'No lecturer downloads in this period.'
                : filter === 'request'
                  ? 'No locate requests in this period.'
                  : filter === 'upload'
                    ? 'No archived PDF uploads in this period.'
                    : 'No activity in this period.'}
          </Text>
        ) : (
          visible.map((item) => {
            const tone = KIND_STYLE[item.kind];
            return (
              <View
                key={item.id}
                style={[styles.card, { backgroundColor: palette.card, borderColor: palette.line }]}
              >
                <View style={[styles.iconWell, { backgroundColor: tone.bg }]}>
                  <MaterialCommunityIcons name={tone.glyph} size={20} color={tone.icon} />
                </View>
                <View style={styles.cardCopy}>
                  <Text style={[styles.title, { color: palette.ink }]}>{item.title}</Text>
                  <Text style={[styles.detail, { color: palette.muted }]} numberOfLines={2}>
                    {item.detail}
                  </Text>
                </View>
                <Text style={[styles.when, { color: palette.muted }]}>{formatAgo(item.createdAt)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={rangeOpen} transparent animationType="fade" onRequestClose={() => setRangeOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setRangeOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: palette.card }]}>
            {RANGES.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.sheetRow}
                onPress={() => {
                  setRange(item.key);
                  setRangeOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.sheetLabel,
                    { color: palette.ink },
                    range === item.key && styles.sheetLabelOn,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.background },
  content: { padding: spacing.md, paddingBottom: 32 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: tokens.primary, fontFamily: 'serif' },
  pageSub: { fontSize: 13, color: tokens.onSurfaceVariant, marginBottom: spacing.md, marginTop: 4 },
  chipRow: { gap: 8, paddingBottom: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: tokens.outlineVariant,
    backgroundColor: tokens.surfaceContainerLowest,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: tokens.primary, borderColor: tokens.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: tokens.onSurfaceVariant },
  chipTextOn: { color: tokens.onPrimary },
  rangeBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: spacing.md,
  },
  rangeText: { color: tokens.onSurface, fontWeight: '600', fontSize: 13 },
  error: { color: tokens.error, marginBottom: 12 },
  empty: { color: tokens.placeholder, textAlign: 'center', marginTop: 32, lineHeight: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
  },
  iconWell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: { flex: 1, minWidth: 0 },
  title: { fontWeight: '700', color: tokens.onSurface, fontSize: 14 },
  detail: { color: tokens.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  when: { color: tokens.placeholder, fontSize: 11, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'center', padding: 32 },
  sheet: { backgroundColor: tokens.surfaceContainerLowest, borderRadius: 16, paddingVertical: 8 },
  sheetRow: { paddingHorizontal: 18, paddingVertical: 14 },
  sheetLabel: { fontSize: 15, color: tokens.onSurface },
  sheetLabelOn: { fontWeight: '700', color: tokens.primary },
});
