import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { officerPalette, useTheme } from '../../context/ThemeContext';
import { borderRadius, colors as tokens, spacing } from '../../theme';
import { CustodyRequest, useCustody } from './custody';

type FilterKey = 'Pending' | 'Resolved' | 'All';

function officerStatus(request: CustodyRequest): 'Pending' | 'Located' | 'Completed' {
  const raw = (request.officerStatus || '').toLowerCase();
  if (raw === 'completed' || raw === 'fulfilled') return 'Completed';
  if (raw === 'located' || raw.includes('ready')) return 'Located';
  if (request.status === 'Verified') return 'Completed';
  if (request.status === 'In Progress') return 'Located';
  return 'Pending';
}

function isResolved(request: CustodyRequest) {
  const status = officerStatus(request);
  return status === 'Located' || status === 'Completed';
}

function statusTone(status: 'Pending' | 'Located' | 'Completed') {
  if (status === 'Completed') {
    return { bg: '#14532D', text: '#BBF7D0', label: 'Completed' };
  }
  if (status === 'Located') {
    return { bg: '#1E3A8A', text: '#BFDBFE', label: 'Located' };
  }
  return { bg: '#7F1D1D', text: '#FECACA', label: 'Pending' };
}

function formatReceived(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Received recently';
  return `Received ${date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export const OfficerRequestsScreen: React.FC<{
  onOpenRequest: (id: string) => void;
}> = ({ onOpenRequest }) => {
  const { requests } = useCustody();
  const { theme } = useTheme();
  const palette = officerPalette(theme);
  const [filter, setFilter] = useState<FilterKey>('Pending');

  const pendingCount = useMemo(
    () => requests.filter((item) => !isResolved(item)).length,
    [requests]
  );

  const visible = useMemo(() => {
    const sorted = [...requests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (filter === 'Pending') return sorted.filter((item) => !isResolved(item));
    if (filter === 'Resolved') return sorted.filter((item) => isResolved(item));
    return sorted;
  }, [requests, filter]);

  return (
    <View style={[styles.stage, { backgroundColor: palette.page }]}>
      <View style={styles.filters}>
        {(
          [
            { key: 'Pending' as const, label: `Pending (${pendingCount})` },
            { key: 'Resolved' as const, label: 'Resolved' },
            { key: 'All' as const, label: 'All' },
          ] as const
        ).map((item) => {
          const on = filter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.chip,
                { backgroundColor: palette.soft },
                on && styles.chipOn,
              ]}
              onPress={() => setFilter(item.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, { color: palette.ink }, on && styles.chipTextOn]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {visible.length === 0 ? (
          <Text style={[styles.empty, { color: palette.muted }]}>
            {filter === 'Pending'
              ? 'No pending requests. New lecturer requests will appear here.'
              : filter === 'Resolved'
                ? 'No resolved requests yet.'
                : 'No retrieval requests yet.'}
          </Text>
        ) : (
          visible.map((request) => (
            <RequestListCard
              key={request.id}
              request={request}
              onPress={() => onOpenRequest(request.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

function RequestListCard({
  request,
  onPress,
}: {
  request: CustodyRequest;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const palette = officerPalette(theme);
  const status = officerStatus(request);
  const tone = statusTone(status);
  const title =
    request.requestKind === 'MISSING_PDF_INVESTIGATION'
      ? 'Missing PDF Investigation'
      : 'Physical Booklet Request';

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <View style={styles.cardTop}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="file-document-outline" size={22} color={tokens.onPrimary} />
        </View>
        <View style={styles.cardTopCopy}>
          <Text style={[styles.cardTitle, { color: palette.ink }]}>{title}</Text>
          <Text style={[styles.person, { color: palette.muted }]} numberOfLines={1}>
            {request.lecturer}
            {request.registrationNo ? `  ·  ${request.registrationNo}` : ''}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: tone.bg }]}>
          <Text style={[styles.badgeText, { color: tone.text }]}>{tone.label}</Text>
        </View>
      </View>

      <View style={styles.metaBlock}>
        <MetaRow icon="school-outline" text={request.school || 'School not recorded'} muted={palette.muted} />
        <MetaRow icon="clipboard-list-outline" text={request.programme || 'Programme not recorded'} muted={palette.muted} />
        <MetaRow icon="calendar-month-outline" text={request.session || 'Session not recorded'} muted={palette.muted} />
        <MetaRow
          icon="book-open-page-variant-outline"
          text={`${request.unitCode} – ${request.unitTitle}`}
          muted={palette.muted}
        />
      </View>

      {request.lecturerNote ? (
        <View style={[styles.reasonBox, { backgroundColor: palette.soft }]}>
          <Text style={[styles.reasonText, { color: palette.ink }]}>“{request.lecturerNote}”</Text>
        </View>
      ) : null}

      <View style={[styles.cardFooter, { borderTopColor: palette.line }]}>
        <Text style={[styles.when, { color: palette.muted }]}>{formatReceived(request.createdAt)}</Text>
        <TouchableOpacity style={styles.viewBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.viewBtnText}>View Details</Text>
          <Feather name="chevron-right" size={16} color={tokens.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MetaRow({
  icon,
  text,
  muted,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  text: string;
  muted: string;
}) {
  return (
    <View style={styles.metaRow}>
      <MaterialCommunityIcons name={icon} size={16} color={tokens.primary} />
      <Text style={[styles.metaText, { color: muted }]} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#DCE3EF' },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: borderRadius.pill,
    backgroundColor: '#CBD5E8',
  },
  chipOn: { backgroundColor: tokens.primary },
  chipText: { fontSize: 12, fontWeight: '800', color: '#334155' },
  chipTextOn: { color: tokens.onPrimary },
  list: { paddingHorizontal: spacing.md, paddingBottom: 24, gap: 12 },
  empty: {
    marginTop: 28,
    textAlign: 'center',
    color: tokens.onSurfaceVariant,
    lineHeight: 20,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#F1F5FB',
    borderRadius: borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#B8C7DE',
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: tokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTopCopy: { flex: 1, paddingTop: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: tokens.onSurface },
  person: { marginTop: 3, fontSize: 12, fontWeight: '600', color: tokens.onSurfaceVariant },
  badge: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 11, fontWeight: '800' },
  metaBlock: { marginTop: 12, gap: 7 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metaText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#1E293B', lineHeight: 17 },
  reasonBox: {
    marginTop: 12,
    backgroundColor: '#DBEAFE',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: tokens.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reasonText: { fontSize: 12, fontWeight: '600', color: '#1E3A8A', fontStyle: 'italic', lineHeight: 17 },
  cardFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  when: { flex: 1, fontSize: 11, fontWeight: '600', color: tokens.onSurfaceVariant },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: tokens.primary,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewBtnText: { color: tokens.onPrimary, fontSize: 12, fontWeight: '800' },
});
