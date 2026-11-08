import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { lecturerPalette, useTheme } from '../../context/ThemeContext';
import { BOOKLET_COPY, bookletHasPdf, formatPhysicalLocation } from '../../constants/booklets';
import { Booklet } from '../../types';
import { createBookletSignedUrl, friendlyBookletError, logBookletAction } from '../../services/bookletService';
import { borderRadius, colors as tokens, control, spacing, typography } from '../../theme';

interface Props {
  booklet: Booklet;
  fullscreen?: boolean;
  visible?: boolean;
  onClose?: () => void;
  onError?: (message: string) => void;
}

export const BookletPdfViewer: React.FC<Props> = ({
  booklet,
  fullscreen = false,
  visible = true,
  onClose,
  onError,
}) => {
  const { theme } = useTheme();
  const palette = lecturerPalette(theme);
  const styles = useMemo(() => createStyles(palette), [theme]);
  const start = booklet.startPage && booklet.startPage > 0 ? booklet.startPage : 1;
  const end = booklet.endPage && booklet.endPage >= start ? booklet.endPage : Math.max(booklet.pageCount ?? start, start);
  const total = Math.max(end, 1);
  const [page, setPage] = useState(start);
  const [opening, setOpening] = useState(false);
  const locationLine = formatPhysicalLocation(booklet);
  const statusLabel = bookletHasPdf(booklet) ? BOOKLET_COPY.pdfReady : BOOKLET_COPY.notDigitised;

  useEffect(() => {
    setPage(start);
  }, [start, booklet.id, booklet.registrationNo]);

  const openPdf = async () => {
    if (!booklet.pdfPath) {
      onError?.(BOOKLET_COPY.missingFile);
      return;
    }
    setOpening(true);
    try {
      const url = await createBookletSignedUrl(booklet.pdfPath);
      const pageUrl = start > 1 ? `${url}#page=${start}` : url;
      await logBookletAction(booklet.id, 'view');
      await WebBrowser.openBrowserAsync(pageUrl, { enableBarCollapsing: true });
    } catch (error) {
      onError?.(friendlyBookletError(error));
    } finally {
      setOpening(false);
    }
  };

  const frame = (
    <View style={[styles.frame, fullscreen && styles.frameFull]}>
      <View style={styles.preview}>
        <MaterialCommunityIcons name="file-pdf-box" size={fullscreen ? 72 : 48} color={tokens.onPrimary} />
        <Text style={styles.placeholder}>{BOOKLET_COPY.previewPlaceholder}</Text>
        <Text style={styles.pageLabel}>{BOOKLET_COPY.pagesOf(start, end)}</Text>
        <Text style={styles.pageLabel}>{BOOKLET_COPY.pageOf(page, total)}</Text>
        <Text style={styles.statusLabel}>{statusLabel}</Text>
        <Text style={styles.locationLabel} numberOfLines={2}>
          {locationLine}
        </Text>
      </View>
      <View style={styles.pager}>
        <TouchableOpacity
          style={styles.pagerBtn}
          onPress={() => setPage((current) => Math.max(start, current - 1))}
          disabled={page <= start}
          accessibilityRole="button"
          accessibilityLabel="Previous page"
        >
          <Feather name="chevron-left" size={22} color={page <= start ? palette.muted : tokens.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.pageLabel}>{BOOKLET_COPY.pageOf(page, total)}</Text>
        <TouchableOpacity
          style={styles.pagerBtn}
          onPress={() => setPage((current) => Math.min(total, current + 1))}
          disabled={page >= total}
          accessibilityRole="button"
          accessibilityLabel="Next page"
        >
          <Feather name="chevron-right" size={22} color={page >= total ? palette.muted : tokens.onPrimary} />
        </TouchableOpacity>
      </View>
      {fullscreen ? (
        <TouchableOpacity
          style={styles.openBtn}
          onPress={() => {
            void openPdf();
          }}
          disabled={opening}
          accessibilityRole="button"
          accessibilityLabel={BOOKLET_COPY.openPdf}
        >
          {opening ? (
            <ActivityIndicator color={tokens.primary} />
          ) : (
            <Text style={styles.openBtnText}>{BOOKLET_COPY.openPdf}</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (!fullscreen) return visible ? frame : null;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.fullScreen} edges={['top', 'bottom']}>
        <View style={styles.fullHeader}>
          <View style={styles.pagerBtn} />
          <Text style={styles.fullTitle}>{BOOKLET_COPY.detailsTitle}</Text>
          <TouchableOpacity
            style={styles.pagerBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={BOOKLET_COPY.close}
          >
            <Feather name="x" size={22} color={tokens.onPrimary} />
          </TouchableOpacity>
        </View>
        {frame}
      </SafeAreaView>
    </Modal>
  );
};

function createStyles(palette: ReturnType<typeof lecturerPalette>) {
  return StyleSheet.create({
    frame: {
      backgroundColor: tokens.primary,
      borderRadius: borderRadius.panel,
      overflow: 'hidden',
      padding: spacing.md,
    },
    frameFull: {
      flex: 1,
      borderRadius: 0,
      justifyContent: 'center',
    },
    preview: {
      minHeight: 180,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    placeholder: {
      color: tokens.onPrimary,
      fontSize: control.body,
      fontFamily: typography.fontFamilySans,
    },
    pager: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
    },
    pagerBtn: {
      width: control.minTap,
      height: control.minTap,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageLabel: {
      color: tokens.onPrimary,
      fontSize: control.body,
      fontWeight: '700',
      fontFamily: typography.fontFamilySans,
    },
    statusLabel: {
      marginTop: spacing.xs,
      color: tokens.onPrimary,
      fontSize: 12,
      fontWeight: '700',
      opacity: 0.9,
    },
    locationLabel: {
      color: tokens.onPrimary,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      opacity: 0.95,
    },
    openBtn: {
      marginTop: spacing.md,
      minHeight: control.inputHeight,
      borderRadius: borderRadius.button,
      backgroundColor: tokens.surfaceContainerLowest,
      alignItems: 'center',
      justifyContent: 'center',
    },
    openBtnText: {
      color: tokens.primary,
      fontWeight: '700',
      fontSize: control.body,
    },
    fullScreen: {
      flex: 1,
      backgroundColor: tokens.primary,
    },
    fullHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
    },
    fullTitle: {
      color: tokens.onPrimary,
      fontSize: 18,
      fontWeight: '700',
    },
  });
}
