import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import { countDigitisedBooklets, listOfficerUploads, listRecentDownloads } from '../../services/bookletService';
import { AppUser, UserRole } from '../../types';
import { borderRadius, colors as tokens, spacing } from '../../theme';

type ActivityKind = 'upload' | 'download' | 'staff';

interface HomeActivity {
  id: string;
  kind: ActivityKind;
  headline: string;
  byline: string;
  createdAt: string;
}

const ROLE_COLORS: Record<UserRole, string> = {
  Lecturer: '#60A5FA',
  'Examination Officer': '#5B21B6',
  Admin: tokens.primary,
};

const ACTIVITY_ICON: Record<ActivityKind, { name: React.ComponentProps<typeof Feather>['name']; bg: string }> = {
  upload: { name: 'upload', bg: '#047857' },
  download: { name: 'download', bg: '#0369A1' },
  staff: { name: 'user-plus', bg: '#6B21A8' },
};

const PIE_SIZE = 128;
const PIE_SEGMENTS = 80;
const PIE_HOLE = 78;
const PIE_WEDGE = 12;

function nameFor(users: AppUser[], id: string | null | undefined, fallback: string) {
  if (!id) return fallback;
  return users.find((user) => user.id === id)?.name || fallback;
}

function isSameDay(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatAgo(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours === 1) return '1h ago';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function pieWedges(slices: { value: number; color: string }[], total: number) {
  if (total <= 0) {
    return Array.from({ length: PIE_SEGMENTS }, () => ({ color: tokens.surfaceContainer }));
  }
  const positive = slices.filter((item) => item.value > 0);
  const wedges: { color: string }[] = [];
  positive.forEach((item, index) => {
    const count =
      index === positive.length - 1
        ? PIE_SEGMENTS - wedges.length
        : Math.max(1, Math.round((item.value / total) * PIE_SEGMENTS));
    for (let i = 0; i < count && wedges.length < PIE_SEGMENTS; i += 1) {
      wedges.push({ color: item.color });
    }
  });
  while (wedges.length < PIE_SEGMENTS) {
    wedges.push({ color: positive[positive.length - 1]?.color || tokens.surfaceContainer });
  }
  return wedges.slice(0, PIE_SEGMENTS);
}

export const AdminOverviewScreen: React.FC<{ onOpenActivity?: () => void }> = ({ onOpenActivity }) => {
  const { users } = useAuth();
  const { requests, settings } = useVault();
  const [archivedPdfs, setArchivedPdfs] = useState(0);
  const [downloadsToday, setDownloadsToday] = useState(0);
  const [activity, setActivity] = useState<HomeActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [pdfCount, uploads, downloads] = await Promise.all([
      countDigitisedBooklets().catch(() => 0),
      listOfficerUploads().catch(() => []),
      listRecentDownloads().catch(() => []),
    ]);
    setArchivedPdfs(pdfCount);
    setDownloadsToday(downloads.filter((row) => row.action === 'download' && isSameDay(row.createdAt)).length);

    const next: HomeActivity[] = [];
    uploads.forEach((booklet) => {
      const officer = nameFor(users, booklet.uploadedBy, 'Examination Officer');
      next.push({
        id: `upload-${booklet.id}`,
        kind: 'upload',
        headline: `${officer} uploaded ${booklet.unitCode}`,
        byline: `Examination Officer · ${formatAgo(booklet.createdAt)}`,
        createdAt: booklet.createdAt,
      });
    });
    downloads.forEach((row) => {
      const lecturer = nameFor(users, row.lecturerId, 'Lecturer');
      next.push({
        id: `download-${row.id}`,
        kind: 'download',
        headline: `${lecturer} ${row.action === 'view' ? 'opened' : 'downloaded'} ${row.unitCode || 'a booklet'}`,
        byline: `Lecturer · ${formatAgo(row.createdAt)}`,
        createdAt: row.createdAt,
      });
    });
    users.forEach((user) => {
      next.push({
        id: `staff-${user.id}`,
        kind: 'staff',
        headline: 'New user account created',
        byline: `${user.role} · ${formatAgo(user.createdAt)}`,
        createdAt: user.createdAt,
      });
    });
    next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setActivity(next.slice(0, 5));
  }, [users]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeUsers = users.filter((user) => user.status === 'Active').length;
  const suspended = users.length - activeUsers;
  const locateRequests = requests.filter((request) => request.currentStep < 5).length;
  const lecturers = users.filter((user) => user.role === 'Lecturer').length;
  const officers = users.filter((user) => user.role === 'Examination Officer').length;
  const admins = users.filter((user) => user.role === 'Admin').length;
  const roleTotal = users.length;

  const slices = useMemo(
    () => [
      { key: 'Lecturer' as const, label: 'Lecturers', value: lecturers, color: ROLE_COLORS.Lecturer },
      { key: 'Examination Officer' as const, label: 'Examination officers', value: officers, color: ROLE_COLORS['Examination Officer'] },
      { key: 'Admin' as const, label: 'Admins', value: admins, color: ROLE_COLORS.Admin },
    ],
    [lecturers, officers, admins]
  );

  const tiles = [
    {
      key: 'users',
      icon: 'user' as const,
      iconBg: '#1E3A8A',
      value: String(activeUsers),
      label: 'Active users',
      hint: suspended === 0 ? 'All accounts active' : `${suspended} suspended`,
      hintTone: suspended === 0 ? 'good' : 'muted',
    },
    {
      key: 'pdfs',
      icon: 'archive' as const,
      iconBg: '#6B21A8',
      value: String(archivedPdfs),
      label: 'Archived PDFs',
      hint: 'In the vault',
      hintTone: 'muted',
    },
    {
      key: 'locate',
      icon: 'map-pin' as const,
      iconBg: '#C2410C',
      value: String(locateRequests),
      label: 'Locate requests',
      hint: locateRequests === 0 ? 'All clear' : 'Awaiting officers',
      hintTone: locateRequests === 0 ? 'good' : 'muted',
    },
    {
      key: 'downloads',
      icon: 'download' as const,
      iconBg: '#047857',
      value: String(downloadsToday),
      label: 'Downloads today',
      hint: 'Lecturers',
      hintTone: 'muted',
    },
  ];

  const yearLabel = settings.academicYear?.trim()
    ? `${settings.academicYear} Academic Year · Admin control panel`
    : 'Admin control panel';

  return (
    <View style={styles.screen}>
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
        <Text style={styles.title}>System overview</Text>
        <Text style={styles.sub}>{yearLabel}</Text>

        <View style={styles.grid}>
          {tiles.map((tile) => (
            <View key={tile.key} style={styles.tile}>
              <View style={[styles.tileIcon, { backgroundColor: tile.iconBg }]}>
                <Feather name={tile.icon} size={18} color={tokens.onPrimary} />
              </View>
              <Text style={styles.tileValue}>{tile.value}</Text>
              <Text style={styles.tileLabel}>{tile.label}</Text>
              <Text style={[styles.tileHint, tile.hintTone === 'good' && styles.tileHintGood]}>{tile.hint}</Text>
            </View>
          ))}
        </View>

        <View style={styles.roleCard}>
          <View style={styles.roleHead}>
            <Text style={styles.sectionTitle}>Users by role</Text>
            <Text style={styles.roleTotalMeta}>{roleTotal} total</Text>
          </View>
          <View style={styles.roleBody}>
            <DonutPie slices={slices} total={roleTotal} />
            <View style={styles.legend}>
              {slices.map((item) => {
                const percent = roleTotal > 0 ? Math.round((item.value / roleTotal) * 100) : 0;
                return (
                  <View key={item.key} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <Text style={styles.legendCount}>{item.value}</Text>
                    <Text style={styles.legendPct}>{percent}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.activityHead}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          {onOpenActivity ? (
            <TouchableOpacity onPress={onOpenActivity} accessibilityRole="button" accessibilityLabel="View all activity">
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {activity.length === 0 ? (
          <View style={styles.activityCard}>
            <Text style={styles.empty}>No recent activity.</Text>
          </View>
        ) : (
          <View style={styles.activityCard}>
            {activity.map((item, index) => (
              <View key={item.id} style={[styles.activityRow, index > 0 && styles.activityRowBorder]}>
                <View style={[styles.activityIcon, { backgroundColor: ACTIVITY_ICON[item.kind].bg }]}>
                  <Feather name={ACTIVITY_ICON[item.kind].name} size={16} color={tokens.onPrimary} />
                </View>
                <View style={styles.activityCopy}>
                  <Text style={styles.activityTitle} numberOfLines={2}>
                    {item.headline}
                  </Text>
                  <Text style={styles.activityMeta}>{item.byline}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

function DonutPie({ slices, total }: { slices: { value: number; color: string }[]; total: number }) {
  const radius = PIE_SIZE / 2;
  const wedges = pieWedges(slices, total);
  return (
    <View style={styles.pieWrap} accessibilityRole="image" accessibilityLabel={`${total} users by role`}>
      <View style={styles.pieDisc}>
        {wedges.map((wedge, index) => (
          <View
            key={index}
            pointerEvents="none"
            style={[
              styles.pieWedge,
              {
                left: radius - PIE_WEDGE / 2,
                backgroundColor: wedge.color,
                transform: [
                  { translateY: radius / 2 },
                  { rotate: `${(index / PIE_SEGMENTS) * 360}deg` },
                  { translateY: -radius / 2 },
                ],
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.pieHole}>
        <Text style={styles.pieTotal}>{total}</Text>
        <Text style={styles.pieTotalLabel}>Users</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.background },
  content: { padding: spacing.md, paddingBottom: 32 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: tokens.primary,
    fontFamily: 'serif',
  },
  sub: { fontSize: 13, color: tokens.onSurfaceVariant, marginBottom: spacing.md, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.md },
  tile: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    shadowColor: '#1B2744',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tileValue: { fontSize: 28, fontWeight: '800', color: tokens.onSurface, letterSpacing: -0.6 },
  tileLabel: { fontSize: 14, fontWeight: '700', color: tokens.onSurface, marginTop: 4 },
  tileHint: { fontSize: 12, color: tokens.onSurfaceVariant, marginTop: 4 },
  tileHintGood: { color: tokens.tertiaryGreen, fontWeight: '600' },
  roleCard: {
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    marginBottom: spacing.lg,
  },
  roleHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  roleTotalMeta: { fontSize: 12, fontWeight: '600', color: tokens.onSurfaceVariant },
  roleBody: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pieWrap: { width: PIE_SIZE, height: PIE_SIZE, alignItems: 'center', justifyContent: 'center' },
  pieDisc: {
    width: PIE_SIZE,
    height: PIE_SIZE,
    borderRadius: PIE_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: tokens.surfaceContainer,
  },
  pieWedge: {
    position: 'absolute',
    top: 0,
    width: PIE_WEDGE,
    height: PIE_SIZE / 2,
  },
  pieHole: {
    position: 'absolute',
    width: PIE_HOLE,
    height: PIE_HOLE,
    borderRadius: PIE_HOLE / 2,
    backgroundColor: tokens.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieTotal: { fontSize: 22, fontWeight: '800', color: tokens.onSurface, letterSpacing: -0.4 },
  pieTotalLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '700',
    color: tokens.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  legend: { flex: 1, gap: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: tokens.onSurface },
  legendCount: { fontSize: 15, fontWeight: '800', color: tokens.onSurface, minWidth: 18, textAlign: 'right' },
  legendPct: { fontSize: 12, fontWeight: '600', color: tokens.onSurfaceVariant, minWidth: 34, textAlign: 'right' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: tokens.onSurface },
  activityHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewAll: { color: tokens.secondary, fontWeight: '700', fontSize: 13 },
  activityCard: {
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
  },
  empty: { color: tokens.placeholder, textAlign: 'center', paddingVertical: 18 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  activityRowBorder: { borderTopWidth: 1, borderTopColor: tokens.inputBorder },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCopy: { flex: 1, minWidth: 0 },
  activityTitle: { fontWeight: '700', color: tokens.onSurface, fontSize: 14 },
  activityMeta: { color: tokens.onSurfaceVariant, fontSize: 12, marginTop: 2 },
});
