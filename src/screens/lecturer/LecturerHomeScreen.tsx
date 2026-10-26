import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Image,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { useAuth } from '../../context/AuthContext';
import { lecturerPalette, useTheme } from '../../context/ThemeContext';
import { useVault } from '../../context/VaultContext';
import { ArchivedExaminationRecord } from '../../types';
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
  recentTitle: 'Recent Exam Booklets',
  filter: 'Filter',
  archived: 'Archived',
  digitized: 'Digitized',
  recentEmpty: 'No recent exam booklets yet.',
} as const;

const AVATAR_SIZE = 56;
const TAP_MIN = 44;
const NAME_SIZE = 21;
const HERO_TITLE_SIZE = 20;
const HERO_BODY_SIZE = 13;
const HERO_RADIUS = 20;

interface Props {
  onOpenSearch?: () => void;
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

export const LecturerHomeScreen: React.FC<Props> = ({ onOpenSearch }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const palette = lecturerPalette(theme);
  const styles = useMemo(() => createHomeStyles(palette), [palette]);
  const { setSearchFilter, records, logSearch } = useVault();
  const [selectedBooklet, setSelectedBooklet] = useState<ArchivedExaminationRecord | null>(null);
  const recentBooklets = records
    .filter((item) => {
      if (!item.archivedAt) return false;
      return Date.parse(item.archivedAt) >= Date.parse('2026-10-21T21:00:00.000Z');
    })
    .slice(0, 6);
  const greeting = greetingForHour(new Date().getHours());
  const displayName = user?.name?.trim() || HOME_COPY.role;

  return (
    <View style={styles.screenContainer}>
      <LecturerTopHeader subtitle="Lecturer Portal" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <GreetingCard
          greeting={greeting}
          name={displayName}
          role={HOME_COPY.role}
          photoUri={user?.avatarUrl}
          styles={styles}
        />

        <FindBookletsHero onPress={() => onOpenSearch?.()} styles={styles} />

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleSerif}>{HOME_COPY.recentTitle}</Text>
          <TouchableOpacity
            style={styles.filterPillButton}
            onPress={() => onOpenSearch?.()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={HOME_COPY.filter}
          >
            <Text style={styles.filterPillText}>{HOME_COPY.filter}</Text>
            <MaterialCommunityIcons name="tune-variant" size={14} color={palette.muted} />
          </TouchableOpacity>
        </View>

        {recentBooklets.length === 0 ? (
          <Text style={styles.emptyLine}>{HOME_COPY.recentEmpty}</Text>
        ) : (
          recentBooklets.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.bookletItemCard}
              onPress={() => {
                logSearch(item.courseCode, item.courseName, item.faculty || item.session);
                setSelectedBooklet(item);
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${item.courseCode}: ${item.courseName}`}
            >
              <View
                style={[
                  styles.bookletIconBox,
                  item.status === 'Digitized Copy'
                    ? { backgroundColor: tokens.statusVerifiedBg }
                    : { backgroundColor: tokens.statusShelfBg },
                ]}
              >
                {item.status === 'Digitized Copy' ? (
                  <MaterialCommunityIcons name="shield-outline" size={20} color={tokens.tertiaryGreen} />
                ) : (
                  <MaterialCommunityIcons name="file-document-outline" size={20} color={tokens.secondary} />
                )}
              </View>

              <View style={styles.bookletDetails}>
                <Text style={styles.bookletTitle}>
                  {item.courseCode}: {item.courseName}
                </Text>
                <Text style={styles.bookletSub}>
                  {item.scriptCount} Scripts • {item.session}
                </Text>
              </View>

              <View style={styles.bookletRightGroup}>
                <View
                  style={[
                    styles.statusBadgePill,
                    item.status === 'Original Booklet' ? styles.archivedPill : styles.digitizedPill,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgePillText,
                      item.status === 'Original Booklet'
                        ? styles.archivedPillText
                        : styles.digitizedPillText,
                    ]}
                  >
                    {item.status === 'Original Booklet' ? HOME_COPY.archived : HOME_COPY.digitized}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={palette.muted} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={!!selectedBooklet}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBooklet(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedBooklet?.courseCode}: {selectedBooklet?.courseName}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedBooklet(null)}
                accessibilityRole="button"
                accessibilityLabel="Close booklet details"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.modalClose}
              >
                <Feather name="x" size={20} color={palette.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Session:</Text>
              <Text style={styles.modalValue}>{selectedBooklet?.session}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Scripts Count:</Text>
              <Text style={styles.modalValue}>{selectedBooklet?.scriptCount} Examination Scripts</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Vault Shelf:</Text>
              <Text style={styles.modalValue}>{selectedBooklet?.shelf}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Container:</Text>
              <Text style={styles.modalValue}>{selectedBooklet?.box}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Custody Status:</Text>
              <Text style={styles.modalValue}>{selectedBooklet?.vaultStatus}</Text>
            </View>

            <TouchableOpacity
              style={styles.modalSearchBtn}
              onPress={() => {
                if (selectedBooklet) {
                  setSearchFilter((prev) => ({
                    ...prev,
                    unitCode: selectedBooklet.courseCode,
                    unitName: selectedBooklet.courseName,
                    faculty: selectedBooklet.faculty,
                    session: selectedBooklet.session,
                  }));
                }
                setSelectedBooklet(null);
                onOpenSearch?.();
              }}
              accessibilityRole="button"
              accessibilityLabel="Search in Vault Archive"
            >
              <Text style={styles.modalSearchBtnText}>Search in Vault Archive</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

function createHomeStyles(palette: ReturnType<typeof lecturerPalette>) {
  const { page, card, ink, body, muted, line } = palette;
  const serif = Platform.OS === 'ios' ? 'Georgia' : typography.fontFamilySerif;

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
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitleSerif: {
      fontSize: 18,
      fontWeight: '700',
      color: ink,
      fontFamily: serif,
    },
    filterPillButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.soft,
      paddingHorizontal: 10,
      minHeight: TAP_MIN,
      borderRadius: 12,
      gap: 4,
    },
    filterPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: muted,
    },
    emptyLine: {
      color: muted,
      fontSize: 13,
      lineHeight: 18,
    },
    bookletItemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: card,
      borderRadius: 14,
      padding: 12,
      minHeight: TAP_MIN,
      borderWidth: 1,
      borderColor: line,
      shadowColor: tokens.onSurface,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
      elevation: 1,
    },
    bookletIconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    bookletDetails: {
      flex: 1,
    },
    bookletTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: body,
    },
    bookletSub: {
      fontSize: 12,
      color: muted,
      marginTop: 2,
    },
    bookletRightGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusBadgePill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    archivedPill: {
      backgroundColor: tokens.statusVerifiedBg,
    },
    digitizedPill: {
      backgroundColor: tokens.statusShelfBg,
    },
    statusBadgePillText: {
      fontSize: 11,
      fontWeight: '600',
    },
    archivedPillText: {
      color: tokens.statusVerifiedText,
    },
    digitizedPillText: {
      color: tokens.statusShelfText,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: overlay(tokens.onSurface, 0.5),
      justifyContent: 'center',
      padding: spacing.md,
    },
    modalCard: {
      backgroundColor: card,
      borderRadius: borderRadius.lg,
      padding: 20,
      shadowColor: tokens.onSurface,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalClose: {
      minWidth: TAP_MIN,
      minHeight: TAP_MIN,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: ink,
      fontFamily: serif,
      paddingRight: spacing.sm,
    },
    modalDivider: {
      height: 1,
      backgroundColor: line,
      marginVertical: 12,
    },
    modalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    modalLabel: {
      fontSize: 13,
      color: muted,
    },
    modalValue: {
      fontSize: 13,
      fontWeight: '600',
      color: body,
    },
    modalSearchBtn: {
      backgroundColor: tokens.primary,
      borderRadius: 10,
      minHeight: TAP_MIN,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
    },
    modalSearchBtnText: {
      fontSize: 13.5,
      fontWeight: '700',
      color: tokens.onPrimary,
    },
  });
}
