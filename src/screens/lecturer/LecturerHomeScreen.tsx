import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { useAuth } from '../../context/AuthContext';
import { lecturerPalette, useTheme } from '../../context/ThemeContext';
import { useVault } from '../../context/VaultContext';
import { listRecentDownloads } from '../../services/bookletService';
import { ActiveRetrievalRequest } from '../../types';
import { borderRadius, colors as tokens, spacing, typography } from '../../theme';

const LIBRARY_HERO = require('../../../assets/images/library-hero.png');

const HOME_COPY = {
  morning: 'Good morning,',
  afternoon: 'Good afternoon,',
  evening: 'Good evening,',
  role: 'Lecturer',
  heroTitle: 'Find Examination Booklets',
  heroDescription:
    'Search and retrieve student examination booklets for remarking or missing marks investigation.',
  searchCta: 'Search Booklets',
} as const;

const AVATAR_SIZE = 56;
const TAP_MIN = 44;
const NAME_SIZE = 21;
const HERO_TITLE_SIZE = 20;
const HERO_BODY_SIZE = 13;
const HERO_RADIUS = 20;
const PIE_SIZE = 128;
const PIE_SEGMENTS = 80;
const PIE_HOLE = 78;
const PIE_WEDGE = 12;

const STATUS_COLORS = {
  pending: '#F59E0B',
  located: '#60A5FA',
  completed: '#047857',
  viewed: '#7C3AED',
} as const;

type PdfViewRow = {
  id: string;
  unitCode: string;
  registrationNo: string;
  createdAt: string;
};

interface Props {
  onOpenSearch?: () => void;
  onOpenHistory?: () => void;
}

function greetingForHour(hour: number) {
  if (hour < 12) return HOME_COPY.morning;
  if (hour < 17) return HOME_COPY.afternoon;
  return HOME_COPY.evening;
}

function overlay(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function requestBucket(request: ActiveRetrievalRequest): 'pending' | 'located' | 'completed' {
  const raw = (request.officerStatus || '').toLowerCase();
  if (raw.includes('complet') || raw.includes('fulfilil') || request.currentStep >= 5) return 'completed';
  if (raw.includes('locat') || raw.includes('ready') || request.currentStep >= 3) return 'located';
  return 'pending';
}

function formatAgo(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
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

export const LecturerHomeScreen: React.FC<Props> = ({ onOpenSearch, onOpenHistory }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const palette = lecturerPalette(theme);
  const { requests, historyItems } = useVault();
  const styles = useMemo(() => createHomeStyles(palette), [palette]);
  const greeting = greetingForHour(new Date().getHours());
  const displayName = user?.name?.trim() || HOME_COPY.role;
  const [pdfViews, setPdfViews] = useState<PdfViewRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadPdfViews = useCallback(async () => {
    if (!user?.id) {
      setPdfViews([]);
      return;
    }
    try {
      const rows = await listRecentDownloads(80);
      setPdfViews(
        rows
          .filter((row) => row.lecturerId === user.id && row.action === 'view')
          .map((row) => ({
            id: row.id,
            unitCode: row.unitCode,
            registrationNo: row.registrationNo,
            createdAt: row.createdAt,
          }))
      );
    } catch {
      setPdfViews([]);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadPdfViews();
  }, [loadPdfViews]);

  const myRequests = useMemo(
    () => requests.filter((item) => !user?.id || item.requesterId === user.id),
    [requests, user?.id]
  );

  const slices = useMemo(() => {
    let pending = 0;
    let located = 0;
    let completed = 0;
    myRequests.forEach((request) => {
      const bucket = requestBucket(request);
      if (bucket === 'completed') completed += 1;
      else if (bucket === 'located') located += 1;
      else pending += 1;
    });
    return [
      { key: 'pending', label: 'Pending', value: pending, color: STATUS_COLORS.pending },
      { key: 'located', label: 'Located', value: located, color: STATUS_COLORS.located },
      { key: 'completed', label: 'Completed', value: completed, color: STATUS_COLORS.completed },
      { key: 'viewed', label: 'PDFs viewed', value: pdfViews.length, color: STATUS_COLORS.viewed },
    ];
  }, [myRequests, pdfViews.length]);

  const chartTotal = slices.reduce((sum, item) => sum + item.value, 0);

  const activity = useMemo(() => {
    const rows: {
      id: string;
      kind: 'request' | 'search' | 'located' | 'viewed';
      title: string;
      subtitle: string;
      at: string;
    }[] = [];

    myRequests.forEach((request) => {
      const bucket = requestBucket(request);
      rows.push({
        id: `req-${request.id}`,
        kind: bucket === 'located' ? 'located' : 'request',
        title:
          bucket === 'completed'
            ? `Completed · ${request.courseCode}`
            : bucket === 'located'
              ? `Located · ${request.courseCode}`
              : `Requested · ${request.courseCode}`,
        subtitle: request.courseTitle || request.officerStatus || 'Retrieval request',
        at: request.updatedAt || request.createdAt,
      });
    });

    pdfViews.forEach((row) => {
      rows.push({
        id: `pdf-${row.id}`,
        kind: 'viewed',
        title: `PDF viewed · ${row.unitCode || 'Booklet'}`,
        subtitle: row.registrationNo ? `Reg ${row.registrationNo}` : 'Examination booklet opened',
        at: row.createdAt,
      });
    });

    historyItems
      .filter((item) => item.userId === user?.id)
      .forEach((item) => {
        rows.push({
          id: `hist-${item.id}`,
          kind: 'search',
          title: `Searched · ${item.code}`,
          subtitle: item.title,
          at: item.searchedAt,
        });
      });

    return rows
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 6);
  }, [historyItems, myRequests, pdfViews, user?.id]);

  const activityIcon = {
    request: { name: 'file-text' as const, bg: '#C2410C' },
    located: { name: 'map-pin' as const, bg: '#1D4ED8' },
    search: { name: 'search' as const, bg: '#0F766E' },
    viewed: { name: 'eye' as const, bg: '#7C3AED' },
  };

  return (
    <View style={styles.screenContainer}>
      <LecturerTopHeader subtitle="Lecturer Portal" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadPdfViews();
              setRefreshing(false);
            }}
            tintColor={tokens.primary}
          />
        }
      >
        <GreetingCard
          greeting={greeting}
          name={displayName}
          role={HOME_COPY.role}
          photoUri={user?.avatarUrl}
          styles={styles}
        />

        <FindBookletsHero onPress={() => onOpenSearch?.()} styles={styles} />

        <View style={styles.roleCard}>
          <View style={styles.roleHead}>
            <Text style={styles.sectionTitle}>Your activity</Text>
            <Text style={styles.roleTotalMeta}>{chartTotal} total</Text>
          </View>
          <View style={styles.roleBody}>
            <DonutPie
              slices={slices}
              total={chartTotal}
              hole={palette.card}
              ink={palette.ink}
              muted={palette.muted}
              centerLabel="Total"
            />
            <View style={styles.legend}>
              {slices.map((item) => {
                const percent = chartTotal > 0 ? Math.round((item.value / chartTotal) * 100) : 0;
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
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          {onOpenHistory ? (
            <TouchableOpacity
              onPress={onOpenHistory}
              accessibilityRole="button"
              accessibilityLabel="View all history"
            >
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.activityCard}>
          {activity.length === 0 ? (
            <Text style={styles.empty}>No recent activity yet. Search or request a booklet to begin.</Text>
          ) : (
            activity.map((item, index) => {
              const visual = activityIcon[item.kind];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.activityRow, index === activity.length - 1 && styles.activityRowLast]}
                  onPress={onOpenHistory}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                >
                  <View style={[styles.activityIcon, { backgroundColor: visual.bg }]}>
                    <Feather name={visual.name} size={16} color={tokens.onPrimary} />
                  </View>
                  <View style={styles.activityCopy}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.activityMeta} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <Text style={styles.activityWhen}>{formatAgo(item.at)}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

function GreetingCard({
  greeting,
  name,
  role,
  photoUri,
  styles,
}: {
  greeting: string;
  name: string;
  role: string;
  photoUri?: string;
  styles: ReturnType<typeof createHomeStyles>;
}) {
  return (
    <View style={styles.greetingCard}>
      <View style={styles.greetingCopy}>
        <Text style={styles.greetingHello}>{greeting}</Text>
        <Text style={styles.greetingName} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.greetingRole}>{role}</Text>
      </View>
      <View
        style={styles.avatarCircle}
        accessibilityRole="image"
        accessibilityLabel={photoUri ? `${name} profile photo` : `${name} profile avatar`}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatarPhoto} />
        ) : (
          <Feather name="user" size={24} color={tokens.onPrimary} />
        )}
      </View>
    </View>
  );
}

function FindBookletsHero({
  onPress,
  styles,
}: {
  onPress: () => void;
  styles: ReturnType<typeof createHomeStyles>;
}) {
  return (
    <ImageBackground
      source={LIBRARY_HERO}
      style={styles.heroCard}
      imageStyle={styles.heroImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={[overlay(tokens.primary, 0.82), overlay(tokens.primary, 0.28)]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.heroOverlay}
      >
        <Text style={styles.heroTitle}>{HOME_COPY.heroTitle}</Text>
        <Text style={styles.heroDescription}>{HOME_COPY.heroDescription}</Text>
        <TouchableOpacity
          style={styles.searchCta}
          onPress={onPress}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={HOME_COPY.searchCta}
        >
          <Feather name="search" size={18} color={tokens.primary} />
          <Text style={styles.searchCtaLabel}>{HOME_COPY.searchCta}</Text>
          <Feather name="arrow-right" size={16} color={tokens.primary} />
        </TouchableOpacity>
      </LinearGradient>
    </ImageBackground>
  );
}

function DonutPie({
  slices,
  total,
  hole,
  ink,
  muted,
  centerLabel,
}: {
  slices: { value: number; color: string }[];
  total: number;
  hole: string;
  ink: string;
  muted: string;
  centerLabel: string;
}) {
  const radius = PIE_SIZE / 2;
  const wedges = pieWedges(slices, total);
  return (
    <View style={donutStyles.pieWrap} accessibilityRole="image" accessibilityLabel={`${total} ${centerLabel}`}>
      <View style={[donutStyles.pieDisc, { backgroundColor: hole }]}>
        {wedges.map((wedge, index) => (
          <View
            key={index}
            pointerEvents="none"
            style={[
              donutStyles.pieWedge,
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
      <View style={[donutStyles.pieHole, { backgroundColor: hole }]}>
        <Text style={[donutStyles.pieTotal, { color: ink }]}>{total}</Text>
        <Text style={[donutStyles.pieTotalLabel, { color: muted }]}>{centerLabel}</Text>
      </View>
    </View>
  );
}

const donutStyles = StyleSheet.create({
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
    fontSize: 9,
    fontWeight: '700',
    color: tokens.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});

function createHomeStyles(palette: ReturnType<typeof lecturerPalette>) {
  const { page, card, ink, muted, line } = palette;

  return StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: page,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    greetingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.primary,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      overflow: 'hidden',
    },
    greetingCopy: {
      flex: 1,
      paddingRight: spacing.sm,
    },
    greetingHello: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.86)',
      fontFamily: typography.fontFamilySans,
    },
    greetingName: {
      marginTop: spacing.xs,
      fontSize: NAME_SIZE,
      lineHeight: 26,
      fontWeight: '700',
      color: tokens.onPrimary,
      fontFamily: typography.fontFamilySans,
    },
    greetingRole: {
      marginTop: spacing.xs,
      fontSize: 13,
      color: 'rgba(255,255,255,0.84)',
      fontFamily: typography.fontFamilySans,
    },
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
    heroCard: {
      borderRadius: HERO_RADIUS,
      overflow: 'hidden',
      minHeight: 188,
    },
    heroImage: {
      borderRadius: HERO_RADIUS,
      top: -56,
      height: 320,
    },
    heroOverlay: {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
    },
    heroTitle: {
      fontSize: HERO_TITLE_SIZE,
      lineHeight: 26,
      fontWeight: '700',
      color: tokens.onPrimary,
      fontFamily: typography.fontFamilySans,
    },
    heroDescription: {
      marginTop: spacing.sm,
      fontSize: HERO_BODY_SIZE,
      lineHeight: 18,
      color: tokens.onPrimary,
      fontFamily: typography.fontFamilySans,
      maxWidth: '92%',
    },
    searchCta: {
      marginTop: spacing.md,
      minHeight: TAP_MIN,
      borderRadius: borderRadius.pill,
      backgroundColor: tokens.surfaceContainerLowest,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    searchCtaLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: tokens.primary,
      fontFamily: typography.fontFamilySans,
    },
    roleCard: {
      backgroundColor: card,
      borderRadius: 22,
      padding: 16,
      borderWidth: 1,
      borderColor: line,
    },
    roleHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: ink },
    roleTotalMeta: { fontSize: 12, fontWeight: '600', color: muted },
    roleBody: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    legend: { flex: 1, gap: 12 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: ink },
    legendCount: { fontSize: 15, fontWeight: '800', color: ink, minWidth: 18, textAlign: 'right' },
    legendPct: { fontSize: 12, fontWeight: '600', color: muted, minWidth: 34, textAlign: 'right' },
    activityHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    viewAll: { color: tokens.secondary, fontWeight: '700', fontSize: 13 },
    activityCard: {
      backgroundColor: card,
      borderRadius: 22,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: line,
      marginTop: -4,
    },
    empty: { color: muted, textAlign: 'center', paddingVertical: 18, lineHeight: 20 },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: line,
    },
    activityRowLast: { borderBottomWidth: 0 },
    activityIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityCopy: { flex: 1, minWidth: 0 },
    activityTitle: { fontWeight: '700', color: ink, fontSize: 14 },
    activityMeta: { color: muted, fontSize: 12, marginTop: 2 },
    activityWhen: { color: muted, fontSize: 11, fontWeight: '600' },
  });
}
