import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { noticeWhenGroup } from '../../components/NotificationCard';
import { useAuth } from '../../context/AuthContext';
import { countDigitisedBooklets } from '../../services/bookletService';
import { officerPalette, useTheme } from '../../context/ThemeContext';
import { borderRadius, colors as tokens, control, spacing } from '../../theme';
import { useCustody } from './custody';

const LIBRARY_HERO = require('../../../assets/images/library-hero.png');
const AVATAR_SIZE = 56;

function overlay(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface Props {
  onSearch: (query: string) => void;
  onLogBatch: () => void;
  onArchive: () => void;
  onUpdateLocation: () => void;
  onOpenRequests: () => void;
  onOpenRequest: (id: string) => void;
  onVerify: (id: string) => void;
  onRetrieve: (id: string) => void;
  onOpenBooklet: (id: string) => void;
}

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function activityWhen(iso?: string) {
  if (!iso) return { day: '', time: '' };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { day: '', time: '' };
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const group = noticeWhenGroup(iso);
  if (group === 'Today' || group === 'Yesterday') return { day: group, time };
  return {
    day: date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }),
    time,
  };
}

export const OfficerHomeScreen: React.FC<Props> = ({
  onLogBatch,
  onArchive,
  onOpenRequests,
  onOpenRequest,
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const palette = officerPalette(theme);
  const { requests, booklets, stats, flash, clearFlash } = useCustody();
  const [uploaded, setUploaded] = useState(0);
  const greeting = greetingForHour(new Date().getHours());
  const displayName = user?.name?.trim() || 'Examination Officer';

  useEffect(() => {
    let cancelled = false;
    countDigitisedBooklets()
      .then((count) => {
        if (!cancelled) setUploaded(count);
      })
      .catch(() => {
        if (!cancelled) setUploaded(0);
      });
    return () => {
      cancelled = true;
    };
  }, [booklets.length]);

  const activity = useMemo(() => {
    return requests
      .map((item) => ({
        id: `request-${item.id}`,
        title: item.status === 'Verified' ? 'Request Resolved' : 'New Request',
        subtitle: `${item.unitCode} – ${item.unitTitle}`,
        at: item.createdAt,
        kind: (item.status === 'Verified' ? 'resolved' : 'request') as 'resolved' | 'request',
        onPress: () => onOpenRequest(item.id),
      }))
      .filter((item) => item.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 6);
  }, [requests, onOpenRequest]);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: palette.page }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ImageBackground
        source={LIBRARY_HERO}
        style={styles.hero}
        imageStyle={styles.heroImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[overlay(tokens.primary, 0.82), overlay(tokens.primary, 0.28)]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.heroOverlay}
        >
          <View style={styles.heroCopy}>
            <Text style={styles.heroHello}>{greeting}</Text>
            <Text style={styles.heroName} numberOfLines={2}>
              {displayName}
            </Text>
            <Text style={styles.heroSub}>Examination Officer</Text>
          </View>
          <View
            style={styles.avatarCircle}
            accessibilityRole="image"
            accessibilityLabel={user?.avatarUrl ? `${displayName} profile photo` : `${displayName} profile avatar`}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarPhoto} />
            ) : (
              <Feather name="user" size={24} color={tokens.onPrimary} />
            )}
          </View>
        </LinearGradient>
      </ImageBackground>

      {flash ? (
        <TouchableOpacity style={styles.flash} onPress={clearFlash} activeOpacity={0.85}>
          <Feather name="check-circle" size={16} color={tokens.statusVerifiedText} />
          <Text style={styles.flashText}>{flash}</Text>
        </TouchableOpacity>
      ) : null}

      <StatsPieCard
        slices={[
          {
            key: 'archived',
            label: 'Archived Booklets',
            value: booklets.length,
            color: tokens.statusNoticeBlue,
            onPress: onArchive,
          },
          {
            key: 'pending',
            label: 'Pending Requests',
            value: stats.pending,
            color: tokens.statusNoticeOrange,
            onPress: onOpenRequests,
          },
          {
            key: 'uploaded',
            label: 'Booklets Uploaded',
            value: uploaded,
            color: tokens.statusNoticeGreen,
            onPress: onArchive,
          },
        ]}
      />

      <View
        style={[
          styles.banner,
          {
            backgroundColor: palette.dark ? '#0C4A6E' : tokens.roleOfficerBg,
            borderColor: palette.line,
          },
        ]}
      >
        <View style={styles.bannerCopy}>
          <Text style={[styles.bannerTitle, { color: palette.ink }]}>Secure • Organized • Accessible</Text>
          <Text style={[styles.bannerBody, { color: palette.muted }]}>
            Digitizing exam booklets for easy retrieval and better academic support.
          </Text>
        </View>
        <View style={styles.bannerArt}>
          <MaterialCommunityIcons name="laptop" size={36} color={tokens.statusNoticeBlue} />
          <View style={styles.pdfBadge}>
            <MaterialCommunityIcons name="file-pdf-box" size={18} color={tokens.error} />
          </View>
        </View>
      </View>

      <View style={[styles.activityCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
        <View style={styles.activityHead}>
          <View style={styles.activityTitleRow}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={tokens.statusNoticeBlue} />
            <Text style={[styles.activityTitle, { color: palette.ink }]}>Recent Activity</Text>
          </View>
        </View>

        {activity.length === 0 ? (
          <Text style={[styles.empty, { color: palette.muted }]}>No recent activity yet. New requests will appear here.</Text>
        ) : (
          activity.map((item, index) => {
            const when = activityWhen(item.at);
            const visual = ACTIVITY_VISUAL[item.kind];
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.activityRow,
                  { borderBottomColor: palette.line },
                  index === activity.length - 1 && styles.activityRowLast,
                ]}
                onPress={item.onPress}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <View style={[styles.activityIcon, { backgroundColor: visual.bg }]}>
                  <MaterialCommunityIcons name={visual.icon} size={18} color={visual.fg} />
                </View>
                <View style={styles.activityCopy}>
                  <Text style={[styles.activityItemTitle, { color: palette.ink }]}>{item.title}</Text>
                  <Text style={[styles.activityItemSub, { color: palette.muted }]} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                <View style={styles.activityWhen}>
                  <Text style={[styles.activityDay, { color: palette.muted }]}>{when.day}</Text>
                  <Text style={[styles.activityTime, { color: palette.muted }]}>{when.time}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const ACTIVITY_VISUAL = {
  request: {
    icon: 'file-document-outline' as const,
    bg: tokens.statusNoticeBlueBg,
    fg: tokens.statusNoticeBlue,
  },
  resolved: {
    icon: 'check-circle-outline' as const,
    bg: tokens.statusShelfBg,
    fg: tokens.statusShelfText,
  },
};

type PieSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
  onPress?: () => void;
};

const PIE_SIZE = 132;
const PIE_SEGMENTS = 80;
const PIE_HOLE = 78;
const PIE_WEDGE = 12;

function StatsPieCard({ slices }: { slices: PieSlice[] }) {
  const { theme } = useTheme();
  const palette = officerPalette(theme);
  const total = slices.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  return (
    <View style={[styles.pieCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <DonutPie slices={slices} total={total} />
      <View style={styles.pieLegend}>
        {slices.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.legendRow}
            onPress={item.onPress}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={`${item.value} ${item.label}`}
          >
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendLabel, { color: palette.ink }]} numberOfLines={2}>
              {item.label}
            </Text>
            <Text style={[styles.legendValue, { color: palette.ink }]}>{item.value}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function DonutPie({ slices, total }: { slices: PieSlice[]; total: number }) {
  const { theme } = useTheme();
  const palette = officerPalette(theme);
  const radius = PIE_SIZE / 2;
  const wedges = pieWedges(slices, total);
  return (
    <View style={styles.pieWrap} accessibilityRole="image" accessibilityLabel={`Archive overview, ${total} total`}>
      <View style={[styles.pieDisc, { backgroundColor: palette.soft }]}>
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
      <View style={[styles.pieHole, { backgroundColor: palette.card }]}>
        <Text style={[styles.pieTotal, { color: palette.ink }]}>{total}</Text>
        <Text style={[styles.pieTotalLabel, { color: palette.muted }]}>Total</Text>
      </View>
    </View>
  );
}

function pieWedges(slices: PieSlice[], total: number) {
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

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 28 },
  hero: {
    borderRadius: borderRadius.panel,
    overflow: 'hidden',
    minHeight: 148,
  },
  heroImage: {
    borderRadius: borderRadius.panel,
    top: -56,
    height: 320,
  },
  heroOverlay: {
    flex: 1,
    minHeight: 148,
    paddingHorizontal: spacing.md,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCopy: { flex: 1, paddingRight: spacing.sm },
  heroHello: { color: 'rgba(255,255,255,0.86)', fontSize: control.subtitle, fontWeight: '600' },
  heroName: { marginTop: 4, color: tokens.onPrimary, fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  heroSub: { marginTop: 6, color: 'rgba(255,255,255,0.84)', fontSize: 13 },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarPhoto: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  flash: {
    marginTop: 12,
    backgroundColor: tokens.statusVerifiedBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flashText: { flex: 1, color: tokens.statusVerifiedText, fontSize: 13, fontWeight: '600' },
  pieCard: {
    marginTop: 14,
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
  },
  pieWrap: {
    width: PIE_SIZE,
    height: PIE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  pieTotal: {
    fontSize: 22,
    fontWeight: '800',
    color: tokens.onSurface,
    letterSpacing: -0.4,
  },
  pieTotalLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '700',
    color: tokens.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pieLegend: { flex: 1, gap: 10 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: tokens.onSurface, lineHeight: 16 },
  legendValue: { fontSize: 16, fontWeight: '800', color: tokens.onSurface, minWidth: 22, textAlign: 'right' },
  banner: {
    marginTop: 14,
    backgroundColor: tokens.roleOfficerBg,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.surfaceContainerHigh,
  },
  bannerCopy: { flex: 1, paddingRight: spacing.sm },
  bannerTitle: { fontSize: 13, fontWeight: '800', color: tokens.onSurface },
  bannerBody: { marginTop: 4, fontSize: 12, lineHeight: 17, color: tokens.onSurfaceVariant },
  bannerArt: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  pdfBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: tokens.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCard: {
    marginTop: 14,
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: tokens.outlineVariant,
  },
  activityHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  activityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityTitle: { fontSize: 15, fontWeight: '800', color: tokens.onSurface },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: control.minTap },
  viewAllText: { color: tokens.statusNoticeBlue, fontSize: 12, fontWeight: '700' },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.outlineVariant,
    gap: 10,
  },
  activityRowLast: { borderBottomWidth: 0 },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCopy: { flex: 1 },
  activityItemTitle: { fontSize: 13, fontWeight: '700', color: tokens.onSurface },
  activityItemSub: { marginTop: 2, fontSize: 12, color: tokens.onSurfaceVariant },
  activityWhen: { alignItems: 'flex-end', minWidth: 72 },
  activityDay: { fontSize: 11, fontWeight: '700', color: tokens.onSurfaceVariant },
  activityTime: { marginTop: 2, fontSize: 11, color: tokens.outline },
  empty: { color: tokens.onSurfaceVariant, fontSize: 13, lineHeight: 18, paddingVertical: 12 },
});
