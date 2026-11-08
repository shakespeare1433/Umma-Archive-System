import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { lecturerPalette, useTheme } from '../../context/ThemeContext';
import { BOOKLET_COPY, bookletHasPdf, formatPhysicalLocation } from '../../constants/booklets';
import { Booklet } from '../../types';
import { borderRadius, colors as tokens, control, spacing, typography } from '../../theme';

interface Props {
  booklet: Booklet;
  onPress: () => void;
  onDownload: () => void;
  downloading?: boolean;
}

export const BookletResultCard: React.FC<Props> = ({
  booklet,
  onPress,
  onDownload,
  downloading,
}) => {
  const { theme } = useTheme();
  const palette = lecturerPalette(theme);
  const styles = useMemo(() => createStyles(palette), [theme]);
  const ready = bookletHasPdf(booklet);
  const title = `${booklet.unitCode} · ${booklet.unitName}`;
  const sessionLine = [booklet.programme, booklet.academicSession].filter(Boolean).join(' · ');
  const locationLine = formatPhysicalLocation(booklet);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.iconTile}>
        <MaterialCommunityIcons name="file-pdf-box" size={28} color={tokens.onPrimary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {booklet.studentName || BOOKLET_COPY.missingValue}
          {booklet.registrationNo ? ` · ${booklet.registrationNo}` : ''}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {sessionLine}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {typeof booklet.scriptCount === 'number' && booklet.scriptCount > 0
            ? `${booklet.scriptCount} script${booklet.scriptCount === 1 ? '' : 's'}`
            : 'Scripts not recorded'}
          {booklet.startPage && booklet.endPage
            ? ` · ${BOOKLET_COPY.pagesOf(booklet.startPage, booklet.endPage)}`
            : ''}
        </Text>
        <Text style={styles.location} numberOfLines={2}>
          {locationLine}
        </Text>
        <View style={[styles.chip, ready ? styles.readyChip : styles.pendingChip]}>
          <Text style={[styles.chipText, ready ? styles.readyChipText : styles.pendingChipText]}>
            {ready ? BOOKLET_COPY.pdfReady : BOOKLET_COPY.notDigitised}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.downloadBtn}
        onPress={onDownload}
        disabled={!ready || downloading}
        accessibilityRole="button"
        accessibilityLabel={BOOKLET_COPY.download}
        accessibilityState={{ disabled: !ready || Boolean(downloading) }}
      >
        {downloading ? (
          <ActivityIndicator size="small" color={tokens.secondary} />
        ) : (
          <Feather name="download" size={20} color={ready ? tokens.secondary : palette.muted} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

function createStyles(palette: ReturnType<typeof lecturerPalette>) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: palette.line,
      padding: spacing.md,
      minHeight: control.minTap,
      shadowColor: tokens.onSurface,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: palette.dark ? 0 : 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    iconTile: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.md,
      backgroundColor: '#1E3A8A',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    body: {
      flex: 1,
      paddingRight: spacing.sm,
    },
    title: {
      fontSize: control.body,
      fontWeight: '700',
      color: palette.ink,
      fontFamily: typography.fontFamilySans,
    },
    meta: {
      marginTop: spacing.xs,
      fontSize: control.subtitle,
      color: palette.muted,
      fontFamily: typography.fontFamilySans,
    },
    location: {
      marginTop: spacing.sm,
      fontSize: 12,
      fontWeight: '700',
      color: tokens.primary,
      fontFamily: typography.fontFamilySans,
    },
    chip: {
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.pill,
    },
    readyChip: {
      backgroundColor: tokens.statusVerifiedBg,
    },
    pendingChip: {
      backgroundColor: tokens.statusPendingBg,
    },
    chipText: {
      fontSize: 11,
      fontWeight: '700',
    },
    readyChipText: {
      color: tokens.statusVerifiedText,
    },
    pendingChipText: {
      color: tokens.statusPendingText,
    },
    downloadBtn: {
      width: control.minTap,
      height: control.minTap,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
