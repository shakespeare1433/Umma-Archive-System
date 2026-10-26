import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LecturerStackHeader } from '../../components/booklets/LecturerStackHeader';
import { BookletPdfViewer } from '../../components/booklets/BookletPdfViewer';
import { lecturerPalette, useTheme } from '../../context/ThemeContext';
import { useVault } from '../../context/VaultContext';
import { BOOKLET_COPY } from '../../constants/booklets';
import { searchArchives } from '../../services/archiveService';
import {
  bookletFileName,
  downloadBookletPdf,
  friendlyBookletError,
  getBooklet,
  shareBookletFile,
} from '../../services/bookletService';
import { Booklet, RootStackParamList } from '../../types';
import { borderRadius, colors as tokens, control, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LecturerBookletDetails'>;

export const BookletDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const palette = lecturerPalette(theme);
  const styles = useMemo(() => createStyles(palette), [theme]);
  const { requestBooklet, rememberArchives } = useVault();
  const [booklet, setBooklet] = useState<Booklet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [progress, setProgress] = useState(0);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const row = await getBooklet(route.params.bookletId);
      if (!row) {
        setError(BOOKLET_COPY.missingFile);
        setBooklet(null);
        return;
      }
      setBooklet(row);
    } catch (caught) {
      setError(friendlyBookletError(caught));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [route.params.bookletId]);

  const ready = Boolean(booklet?.digitised && booklet.pdfPath);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3200);
  };

  const savePdf = async () => {
    if (!booklet || !ready) return;
    setDownloading(true);
    setProgress(0);
    try {
      const uri = await downloadBookletPdf(booklet, setProgress);
      await shareBookletFile(uri);
      showToast(BOOKLET_COPY.savedAs(bookletFileName(booklet)));
    } catch (caught) {
      const message = friendlyBookletError(caught);
      Alert.alert(BOOKLET_COPY.downloadPdf, message, [
        { text: BOOKLET_COPY.close, style: 'cancel' },
        { text: BOOKLET_COPY.retry, onPress: () => void savePdf() },
      ]);
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  const requestPhysical = async () => {
    if (!booklet) return;
    setRequesting(true);
    try {
      const matches = await searchArchives({
        school: booklet.school,
        session: booklet.academicSession,
        unitCode: booklet.unitCode,
        unitName: booklet.unitName,
        studentName: booklet.studentName,
        admissionNumber: booklet.registrationNo,
      });
      rememberArchives(matches);
      const rec =
        matches.find((row) => row.id === booklet.archiveId) ?? matches[0] ?? null;
      if (!rec) {
        showToast(BOOKLET_COPY.noArchive);
        return;
      }
      const failed = await requestBooklet(rec.id, 'PHYSICAL RETRIEVAL', rec);
      showToast(failed ?? BOOKLET_COPY.requested);
    } catch (caught) {
      showToast(friendlyBookletError(caught));
    } finally {
      setRequesting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <LecturerStackHeader
        title={BOOKLET_COPY.detailsTitle}
        onBack={() => navigation.goBack()}
        onDownload={ready ? () => void savePdf() : undefined}
        downloadDisabled={!ready || downloading}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.secondary} />
        </View>
      ) : error || !booklet ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || BOOKLET_COPY.genericError}</Text>
          <Pressable style={styles.filledBtn} onPress={() => void load()}>
            <Text style={styles.filledBtnText}>{BOOKLET_COPY.retry}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {ready ? (
              <BookletPdfViewer booklet={booklet} onError={showToast} />
            ) : (
              <View style={styles.emptyPreview}>
                <MaterialCommunityIcons name="file-search-outline" size={48} color={tokens.secondary} />
                <Text style={styles.emptyTitle}>{BOOKLET_COPY.notScanned}</Text>
                <Text style={styles.emptyBody}>{BOOKLET_COPY.notScannedBody}</Text>
                <Pressable
                  style={({ pressed }) => [styles.filledBtn, pressed ? styles.pressed : null]}
                  onPress={() => {
                    void requestPhysical();
                  }}
                  disabled={requesting}
                  accessibilityRole="button"
                  accessibilityLabel={BOOKLET_COPY.requestPhysical}
                >
                  {requesting ? (
                    <ActivityIndicator color={tokens.onPrimary} />
                  ) : (
                    <Text style={styles.filledBtnText}>{BOOKLET_COPY.requestPhysical}</Text>
                  )}
                </Pressable>
              </View>
            )}

            <View style={styles.summaryCard}>
              <SummaryRow label={BOOKLET_COPY.courseUnit} value={`${booklet.unitCode} · ${booklet.unitName}`} styles={styles} />
              <SummaryRow
                label={BOOKLET_COPY.registrationNo}
                value={booklet.registrationNo || BOOKLET_COPY.missingValue}
                styles={styles}
              />
              <SummaryRow
                label={BOOKLET_COPY.studentName}
                value={booklet.studentName || BOOKLET_COPY.missingValue}
                styles={styles}
              />
              <SummaryRow label={BOOKLET_COPY.session} value={booklet.academicSession} styles={styles} />
              <SummaryRow
                label={BOOKLET_COPY.pageCount}
                value={booklet.pageCount ? String(booklet.pageCount) : BOOKLET_COPY.missingValue}
                styles={styles}
                last
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.outlineBtn,
                (!ready || downloading) && styles.disabledBtn,
                pressed && ready ? styles.outlinePressed : null,
              ]}
              onPress={() => {
                void savePdf();
              }}
              disabled={!ready || downloading}
              accessibilityRole="button"
              accessibilityLabel={BOOKLET_COPY.downloadPdf}
              accessibilityState={{ disabled: !ready || downloading }}
            >
              {downloading ? (
                <ActivityIndicator color={tokens.secondary} />
              ) : (
                <Feather name="download" size={18} color={ready ? tokens.secondary : palette.muted} />
              )}
              <Text style={[styles.outlineBtnText, !ready ? styles.disabledText : null]}>
                {downloading && progress > 0
                  ? `${Math.round(progress * 100)}%`
                  : BOOKLET_COPY.downloadPdf}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.filledBtn,
                styles.flexBtn,
                (!ready || downloading) && styles.disabledBtn,
                pressed && ready ? styles.pressed : null,
              ]}
              onPress={() => setFullScreen(true)}
              disabled={!ready}
              accessibilityRole="button"
              accessibilityLabel={BOOKLET_COPY.viewFullScreen}
              accessibilityState={{ disabled: !ready }}
            >
              <Text style={styles.filledBtnText}>{BOOKLET_COPY.viewFullScreen}</Text>
            </Pressable>
          </View>

          <BookletPdfViewer
            booklet={booklet}
            fullscreen
            visible={fullScreen && ready}
            onClose={() => setFullScreen(false)}
            onError={showToast}
          />
        </>
      )}

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
};

function SummaryRow({
  label,
  value,
  last,
  styles,
}: {
  label: string;
  value: string;
  last?: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[styles.summaryRow, last ? null : styles.summaryRowBorder]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function createStyles(palette: ReturnType<typeof lecturerPalette>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.page,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.md,
    },
    errorText: {
      color: palette.body,
      textAlign: 'center',
      fontSize: control.body,
    },
    emptyPreview: {
      backgroundColor: palette.card,
      borderRadius: borderRadius.panel,
      borderWidth: 1,
      borderColor: palette.line,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.ink,
      textAlign: 'center',
    },
    emptyBody: {
      fontSize: control.subtitle,
      color: palette.muted,
      textAlign: 'center',
    },
    summaryCard: {
      backgroundColor: palette.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: palette.line,
      paddingHorizontal: spacing.md,
    },
    summaryRow: {
      paddingVertical: spacing.md,
    },
    summaryRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: palette.line,
    },
    summaryLabel: {
      fontSize: control.subtitle,
      color: palette.muted,
      marginBottom: spacing.xs,
    },
    summaryValue: {
      fontSize: control.body,
      fontWeight: '600',
      color: palette.ink,
      fontFamily: typography.fontFamilySans,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
      paddingTop: spacing.sm,
    },
    outlineBtn: {
      flex: 1,
      minHeight: control.inputHeight,
      borderRadius: borderRadius.button,
      borderWidth: 2,
      borderColor: tokens.secondary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: palette.card,
    },
    outlinePressed: {
      backgroundColor: tokens.surfaceContainerLow,
    },
    outlineBtnText: {
      color: tokens.secondary,
      fontWeight: '700',
      fontSize: control.body,
    },
    filledBtn: {
      minHeight: control.inputHeight,
      borderRadius: borderRadius.button,
      backgroundColor: tokens.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    flexBtn: {
      flex: 1,
    },
    filledBtnText: {
      color: tokens.onPrimary,
      fontWeight: '700',
      fontSize: control.body,
    },
    pressed: {
      backgroundColor: tokens.primaryHover,
    },
    disabledBtn: {
      opacity: 0.45,
    },
    disabledText: {
      color: palette.muted,
    },
    toast: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      bottom: spacing.xxl,
      backgroundColor: tokens.primary,
      borderRadius: borderRadius.md,
      padding: spacing.md,
    },
    toastText: {
      color: tokens.onPrimary,
      textAlign: 'center',
      fontWeight: '600',
    },
  });
}
