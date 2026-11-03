import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { AppNotification } from '../types';
import { borderRadius, colors as tokens, control, spacing, typography } from '../theme';

export type NoticeTone = 'progress' | 'completed' | 'pending' | 'updated';
export type NoticeFilter = 'all' | 'pending' | 'progress' | 'completed';
export type NoticeIcon = React.ComponentProps<typeof Feather>['name'];

const NOTICE_ICON_SIZE = 20;

const TONES: Record<
  NoticeTone,
  { bar: string; ink: string; chipBg: string; chipText: string; iconBg: string; icon: string }
> = {
  progress: {
    bar: tokens.statusNoticeBlue,
    ink: tokens.statusNoticeBlue,
    chipBg: tokens.statusNoticeBlue,
    chipText: tokens.onPrimary,
    iconBg: '#1E3A8A',
    icon: tokens.onPrimary,
  },
  completed: {
    bar: tokens.statusNoticeGreen,
    ink: tokens.statusNoticeGreen,
    chipBg: tokens.statusNoticeGreen,
    chipText: tokens.onPrimary,
    iconBg: '#047857',
    icon: tokens.onPrimary,
  },
  pending: {
    bar: tokens.statusNoticeOrange,
    ink: tokens.statusNoticeOrange,
    chipBg: tokens.statusNoticeOrange,
    chipText: tokens.onPrimary,
    iconBg: '#C2410C',
    icon: tokens.onPrimary,
  },
  updated: {
    bar: tokens.primaryContainer,
    ink: tokens.primaryContainer,
    chipBg: tokens.statusShelfBg,
    chipText: tokens.primaryContainer,
    iconBg: '#6B21A8',
    icon: tokens.onPrimary,
  },
};

const FILTERS: { key: NoticeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function noticeWhenGroup(iso?: string) {
  if (!iso) return 'Earlier';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Earlier';
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This week';
  if (diffDays < 14) return 'Last week';
  return 'Earlier';
}

export function formatNoticeWhen(iso?: string, detailed = false) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const clock = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const dateStr = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const group = noticeWhenGroup(iso);
  if (group === 'Today') return detailed ? `Today · ${dateStr}` : `Today · ${clock}`;
  if (group === 'Yesterday') return `Yesterday · ${clock}`;
  if (group === 'This week') return `${group} · ${dateStr}`;
  if (group === 'Last week') return `Last week · ${dateStr}`;
  return dateStr;
}

export function noticeKindFromText(title: string, body: string): 'sent' | 'pending' | 'updated' | 'completed' {
  const text = `${title} ${body}`.toLowerCase();
  if (/fulfilled|completed|complete|dispatched|checked out/.test(text)) return 'completed';
  if (/request sent|was sent|\bis now sent\b/.test(text)) return 'sent';
  if (/location found|physically located|\bis now located\b/.test(text)) return 'updated';
  if (/pending|received|waiting/.test(text)) return 'pending';
  return 'updated';
}

export function toneForNotice(title: string, body: string): NoticeTone {
  const kind = noticeKindFromText(title, body);
  if (kind === 'completed') return 'completed';
  if (kind === 'pending') return 'pending';
  if (kind === 'sent') return 'progress';
  return 'updated';
}

export function labelForNotice(title: string, body: string) {
  const kind = noticeKindFromText(title, body);
  if (kind === 'completed') return 'Completed';
  if (kind === 'pending') return 'Pending';
  if (kind === 'sent') return 'Sent';
  if (/location found|located/.test(`${title} ${body}`.toLowerCase())) return 'Located';
  return 'Updated';
}

export function iconForNotice(title: string, body: string): NoticeIcon {
  const kind = noticeKindFromText(title, body);
  if (kind === 'completed') return 'check-circle';
  if (kind === 'pending') return 'clock';
  if (kind === 'sent') return 'send';
  if (/location found|located/.test(`${title} ${body}`.toLowerCase())) return 'map-pin';
  return 'refresh-cw';
}

export function officerNoticeLabel(title: string, body: string) {
  const text = `${title} ${body}`.toLowerCase();
  if (/new lecturer request|new request|requested/.test(text)) return 'Request';
  if (/fulfilled|completed|dispatched|checked out/.test(text)) return 'Done';
  if (/pending|waiting|received/.test(text)) return 'Pending';
  if (/status|updated|staged|vault/.test(text)) return 'Update';
  return 'Notice';
}

export function officerNoticeTone(title: string, body: string): NoticeTone {
  const label = officerNoticeLabel(title, body);
  if (label === 'Done') return 'completed';
  if (label === 'Pending') return 'pending';
  if (label === 'Update') return 'updated';
  return 'progress';
}

export function officerNoticeIcon(title: string, body: string): NoticeIcon {
  const label = officerNoticeLabel(title, body);
  if (label === 'Done') return 'check-circle';
  if (label === 'Pending') return 'clock';
  if (label === 'Request') return 'inbox';
  if (label === 'Update') return 'refresh-cw';
  return 'bell';
}

export function matchesNoticeFilter(tone: NoticeTone, filter: NoticeFilter) {
  if (filter === 'all') return true;
  if (filter === 'progress') return tone === 'progress' || tone === 'updated';
  return tone === filter;
}

export function groupNotesByWhen<T extends { createdAt: string }>(notes: T[]) {
  const order = ['Today', 'Yesterday', 'This week', 'Last week', 'Earlier'];
  const buckets = new Map<string, T[]>();
  notes.forEach((note) => {
    const key = noticeWhenGroup(note.createdAt);
    const list = buckets.get(key) ?? [];
    list.push(note);
    buckets.set(key, list);
  });
  return order
    .map((label) => ({ label, items: buckets.get(label) ?? [] }))
    .filter((group) => group.items.length > 0);
}

interface Props {
  title: string;
  body: string;
  createdAt?: string;
  statusLabel: string;
  tone: NoticeTone;
  icon?: NoticeIcon;
  unread?: boolean;
  large?: boolean;
  onPress?: () => void;
}

export const NotificationCard: React.FC<Props> = ({
  title,
  body,
  createdAt,
  statusLabel,
  tone,
  icon = 'bell',
  unread,
  large,
  onPress,
}) => {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const colors = TONES[tone];
  const when = formatNoticeWhen(createdAt, large);

  const card = (
    <View
      style={[
        styles.card,
        dark && styles.cardDark,
        unread && styles.unread,
        large && styles.cardLarge,
      ]}
    >
      <View style={[styles.bar, { backgroundColor: colors.bar }]} />
      <View style={[styles.iconWell, { backgroundColor: colors.iconBg }, large && styles.iconWellLarge]}>
        <Feather name={icon} size={NOTICE_ICON_SIZE} color={colors.icon} />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[styles.title, { color: colors.ink }, large && styles.titleLarge]}
            numberOfLines={large ? 3 : 1}
          >
            {title}
          </Text>
          <View style={[styles.chip, { backgroundColor: colors.chipBg }]}>
            <Text style={[styles.chipText, { color: colors.chipText }]}>{statusLabel}</Text>
          </View>
        </View>
        {when ? (
          <View style={styles.timeRow}>
            <Feather name="calendar" size={16} color={colors.icon} />
            <Text style={[styles.time, { color: colors.ink }]}>{when}</Text>
          </View>
        ) : null}
        {body ? (
          <Text style={[styles.body, dark && styles.bodyDark]} numberOfLines={large ? undefined : 1}>
            {body}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return card;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {card}
    </TouchableOpacity>
  );
};

export const NoticeFilterBar: React.FC<{
  value: NoticeFilter;
  onChange: (next: NoticeFilter) => void;
}> = ({ value, onChange }) => (
  <View style={styles.filters} collapsable={false} pointerEvents="box-none">
    {FILTERS.map((item) => {
      const on = item.key === value;
      return (
        <View key={item.key} style={styles.filterSlot} collapsable={false}>
          <Pressable
            onPress={() => onChange(item.key)}
            style={[styles.filterChip, on && styles.filterChipOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={item.label}
          >
            <Text style={[styles.filterText, on && styles.filterTextOn]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        </View>
      );
    })}
  </View>
);

export const NotificationInbox: React.FC<{
  notes: AppNotification[];
  loading?: boolean;
  error?: string;
  empty: string;
  dark?: boolean;
  statusOf: (note: AppNotification) => { label: string; tone: NoticeTone; icon: NoticeIcon };
  onPressNote?: (note: AppNotification) => void;
}> = ({ notes, loading, error, empty, dark, statusOf, onPressNote }) => {
  const [filter, setFilter] = React.useState<NoticeFilter>('all');
  const filtered = notes.filter((note) => matchesNoticeFilter(statusOf(note).tone, filter));
  const groups = groupNotesByWhen(filtered);
  const filterEmpty =
    !loading && !error && notes.length > 0 && filtered.length === 0
      ? `No ${FILTERS.find((item) => item.key === filter)?.label.toLowerCase() ?? ''} notifications.`
      : empty;

  return (
    <View style={styles.inbox}>
      <NoticeFilterBar value={filter} onChange={setFilter} />
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {loading && notes.length === 0 ? (
          <Text style={[styles.empty, dark && styles.emptyDark]}>Loading notifications…</Text>
        ) : null}
        {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && filtered.length === 0 ? (
          <Text style={[styles.empty, dark && styles.emptyDark]}>{filterEmpty}</Text>
        ) : null}
        {groups.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={[styles.groupLabel, dark && styles.emptyDark]}>{group.label}</Text>
            {group.items.map((note) => {
              const status = statusOf(note);
              return (
                <NotificationCard
                  key={note.id}
                  title={note.title}
                  body={note.body}
                  createdAt={note.createdAt}
                  statusLabel={status.label}
                  tone={status.tone}
                  icon={status.icon}
                  unread={!note.readAt}
                  onPress={onPressNote ? () => onPressNote(note) : undefined}
                />
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    minHeight: 56,
    shadowColor: tokens.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardDark: {
    backgroundColor: tokens.primaryHover,
  },
  cardLarge: {
    minHeight: 72,
    alignItems: 'flex-start',
  },
  unread: {
    borderWidth: 1,
    borderColor: tokens.surfaceContainerHigh,
  },
  bar: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  iconWellLarge: {
    marginTop: 10,
  },
  content: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    paddingVertical: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamilySans,
  },
  titleLarge: {
    fontSize: control.body,
  },
  chip: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minHeight: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    color: tokens.onSurfaceVariant,
  },
  bodyDark: {
    color: tokens.outlineVariant,
  },
  inbox: {
    flex: 1,
  },
  filters: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#F4F6F9',
  },
  filterSlot: {
    flex: 1,
    height: 36,
    paddingHorizontal: 4,
  },
  filterChip: {
    height: 36,
    borderRadius: borderRadius.pill,
    backgroundColor: tokens.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipOn: {
    backgroundColor: tokens.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.outline,
    textAlign: 'center',
    includeFontPadding: false,
  },
  filterTextOn: {
    color: tokens.onPrimary,
  },
  listScroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 20,
    flexGrow: 1,
  },
  group: {
    marginBottom: 4,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: tokens.onSurfaceVariant,
    marginBottom: 6,
    marginTop: 6,
    letterSpacing: 0.2,
  },
  empty: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  emptyDark: {
    color: '#CBD5E1',
  },
  error: {
    color: tokens.statusPendingText,
    fontSize: 12,
    lineHeight: 16,
    paddingVertical: 10,
  },
});
