import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import { LecturerStackHeader } from '../../components/booklets/LecturerStackHeader';
import { BookletPdfViewer } from '../../components/booklets/BookletPdfViewer';
import { lecturerPalette, useTheme } from '../../context/ThemeContext';
import { useVault } from '../../context/VaultContext';
import { BOOKLET_COPY, bookletHasPdf, formatPhysicalLocation } from '../../constants/booklets';
import { searchArchives } from '../../services/archiveService';
import {
  bookletFileName,
  downloadBookletPdf,
  friendlyBookletError,
  getBooklet,
  listArchivedScripts,
  shareBookletFile,
} from '../../services/bookletService';
import { ArchivedScript, Booklet, RootStackParamList } from '../../types';
import { borderRadius, colors as tokens, control, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LecturerBookletDetails'>;

export const BookletDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const palette = lecturerPalette(theme);
  const styles = useMemo(() => createStyles(palette), [theme]);
  const { requestBooklet, rememberArchives } = useVault();
  const [booklet, setBooklet] = useState<Booklet | null>(null);
  const [scripts, setScripts] = useState<ArchivedScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [reason, setReason] = useState('');
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
        setScripts([]);
        return;
      }
      const focused: Booklet = {
        ...row,
        studentName: route.params.studentName || row.studentName,
        registrationNo: route.params.registrationNo || row.registrationNo,
        startPage: route.params.startPage ?? row.startPage,
        endPage: route.params.endPage ?? row.endPage,
      };
      setBooklet(focused);
      const index = await listArchivedScripts({
        archiveId: focused.archiveId,
        bookletId: focused.id.startsWith('archive:') ? null : focused.id,
      });
      setScripts(index);
      // No script index: show whole PDF (page 1) and rely on student name list below.
      if (!index.length && route.params.startPage == null) {
        setBooklet((current) =>
          current
            ? {
                ...current,
                startPage: 1,
                endPage: current.pageCount || current.endPage || null,
              }
            : current
        );
      }
    } catch (caught) {
      setError(friendlyBookletError(caught));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [route.params.bookletId, route.params.startPage, route.params.studentName]);

  const selectScript = (script: ArchivedScript) => {
    setBooklet((current) =>
      current
        ? {
            ...current,
            studentName: script.studentName || current.studentName,
            registrationNo: script.registrationNumber || current.registrationNo,
            startPage: script.firstPage,
            endPage: script.lastPage,
          }
        : current
    );
  };

  const ready = booklet ? bookletHasPdf(booklet) : false;
  const locationLine = booklet ? formatPhysicalLocation(booklet) : BOOKLET_COPY.locationMissing;

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

  const submitPhysicalRequest = async () => {
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
        matches.find((row) => row.id === booklet.archiveId) ??
        matches.find(
          (row) =>
            row.admissionNumber.trim().toLowerCase() === booklet.registrationNo.trim().toLowerCase()
        ) ??
        matches[0] ??
        null;
      if (!rec) {
        showToast(BOOKLET_COPY.noArchive);
        return;
      }
      const failed = await requestBooklet(rec.id, 'PHYSICAL RETRIEVAL', rec, reason);
      if (failed) {
        showToast(failed);
        return;
      }
      setRequestOpen(false);
      setReason('');
      showToast(BOOKLET_COPY.requested);
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
              </View>
            )}

            <View style={styles.summaryCard}>
              <View style={[styles.statusChip, ready ? styles.statusReady : styles.statusPhysical]}>
                <Text style={[styles.statusChipText, ready ? styles.statusReadyText : styles.statusPhysicalText]}>
                  {ready ? BOOKLET_COPY.pdfReady : BOOKLET_COPY.notDigitised}
                </Text>
              </View>
              <SummaryRow
                label={BOOKLET_COPY.courseUnit}
                value={`${booklet.unitCode} · ${booklet.unitName}`}
                styles={styles}
              />
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
              <SummaryRow label="School" value={booklet.school || BOOKLET_COPY.missingValue} styles={styles} />
              <SummaryRow
                label="Programme"
                value={booklet.programme || BOOKLET_COPY.missingValue}
                styles={styles}
              />
              <SummaryRow
                label={BOOKLET_COPY.pages}
                value={BOOKLET_COPY.pagesOf(booklet.startPage, booklet.endPage)}
                styles={styles}
              />
              <SummaryRow
                label={BOOKLET_COPY.pageCount}
                value={booklet.pageCount ? String(booklet.pageCount) : BOOKLET_COPY.missingValue}
                styles={styles}
                last
              />
            </View>

            <View style={styles.locationCard}>
              <Text style={styles.locationLabel}>{BOOKLET_COPY.locationLabel}</Text>
              <Text style={styles.locationValue}>{locationLine}</Text>
            </View>

            <View style={styles.scriptsCard}>
              <Text style={styles.scriptsTitle}>Students in this PDF</Text>
              {scripts.length === 0 ? (
                <Text style={styles.scriptsEmpty}>
                  No page index yet. The whole PDF is shown
                  {booklet.studentName ? ` · listed student: ${booklet.studentName}` : ''}.
                </Text>
              ) : (
                scripts.map((script) => {
                  const active =
                    booklet.registrationNo.trim().toLowerCase() ===
                      script.registrationNumber.trim().toLowerCase() &&
                    booklet.startPage === script.firstPage;
                  return (
                    <Pressable
                      key={script.id}
                      style={[styles.scriptRow, active ? styles.scriptRowActive : null]}
                      onPress={() => selectScript(script)}
                    >
                      <View style={styles.scriptCopy}>
                        <Text style={styles.scriptName}>{script.studentName || 'Student'}</Text>
                        <Text style={styles.scriptMeta}>
                          {script.registrationNumber || BOOKLET_COPY.missingValue}
                          {script.firstPage
                            ? ` · pages ${script.firstPage}${script.lastPage ? `–${script.lastPage}` : ''}`
                            : ''}
                        </Text>
                      </View>
                      <Text style={styles.scriptAction}>
                        {script.firstPage ? `Open p.${script.firstPage}` : 'View'}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>

            <View style={styles.physicalCard}>
              <Text style={styles.physicalTitle}>{BOOKLET_COPY.requestPhysical}</Text>
              <Text style={styles.physicalBody}>{BOOKLET_COPY.requestPhysicalHint}</Text>
              <Pressable
                style={({ pressed }) => [styles.physicalBtn, pressed ? styles.pressed : null]}
                onPress={() => setRequestOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={BOOKLET_COPY.requestPhysical}
              >
                <Feather name="archive" size={18} color={tokens.onPrimary} />
                <Text style={styles.filledBtnText}>{BOOKLET_COPY.requestPhysical}</Text>
              </Pressable>
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

          <Modal
            visible={requestOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setRequestOpen(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalCard, { maxHeight: '90%' }]}>
                <KeyboardScrollView bottomOffset={16} showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalTitle}>{BOOKLET_COPY.requestPhysical}</Text>
                  <Text style={styles.modalHint}>{BOOKLET_COPY.requestPhysicalHint}</Text>
                  <SummaryRow
                    label={BOOKLET_COPY.studentName}
                    value={booklet.studentName || BOOKLET_COPY.missingValue}
                    styles={styles}
                  />
                  <SummaryRow
                    label={BOOKLET_COPY.registrationNo}
                    value={booklet.registrationNo || BOOKLET_COPY.missingValue}
                    styles={styles}
                  />
                  <SummaryRow label="School" value={booklet.school || BOOKLET_COPY.missingValue} styles={styles} />
                  <SummaryRow
                    label="Programme"
                    value={booklet.programme || BOOKLET_COPY.missingValue}
                    styles={styles}
                  />
                  <SummaryRow label={BOOKLET_COPY.session} value={booklet.academicSession} styles={styles} />
                  <SummaryRow
                    label={BOOKLET_COPY.courseUnit}
                    value={`${booklet.unitCode} · ${booklet.unitName}`}
                    styles={styles}
                  />
                  <SummaryRow label={BOOKLET_COPY.locationLabel} value={locationLine} styles={styles} last />
                  <Text style={styles.reasonLabel}>{BOOKLET_COPY.requestReason}</Text>
                  <TextInput
                    style={styles.reasonInput}
                    value={reason}
                    onChangeText={setReason}
                    placeholder={BOOKLET_COPY.requestReasonHint}
                    placeholderTextColor={palette.muted}
                    multiline
                  />
                  <Pressable
                    style={({ pressed }) => [styles.physicalBtn, pressed ? styles.pressed : null]}
                    onPress={() => {
                      void submitPhysicalRequest();
                    }}
                    disabled={requesting}
                  >
                    {requesting ? (
                      <ActivityIndicator color={tokens.onPrimary} />
                    ) : (
                      <Text style={styles.filledBtnText}>{BOOKLET_COPY.submitRequest}</Text>
                    )}
                  </Pressable>
                  <Pressable style={styles.cancelBtn} onPress={() => setRequestOpen(false)}>
                    <Text style={styles.cancelText}>{BOOKLET_COPY.close}</Text>
                  </Pressable>
                </KeyboardScrollView>
              </View>
            </View>
          </Modal>
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
      paddingTop: spacing.md,
    },
    statusChip: {
      alignSelf: 'flex-start',
      borderRadius: borderRadius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      marginBottom: spacing.sm,
    },
    statusReady: {
      backgroundColor: tokens.statusVerifiedBg,
    },
    statusPhysical: {
      backgroundColor: tokens.statusPendingBg,
    },
    statusChipText: {
      fontSize: 11,
      fontWeight: '700',
    },
    statusReadyText: {
      color: tokens.statusVerifiedText,
    },
    statusPhysicalText: {
      color: tokens.statusPendingText,
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
    locationCard: {
      backgroundColor: tokens.statusShelfBg,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: palette.line,
      padding: spacing.md,
      gap: spacing.xs,
    },
    locationLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: tokens.statusShelfText,
      textTransform: 'uppercase',
    },
    locationValue: {
      fontSize: 15,
      fontWeight: '800',
      color: tokens.statusShelfText,
      fontFamily: typography.fontFamilySans,
    },
    scriptsCard: {
      backgroundColor: palette.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: palette.line,
      padding: spacing.md,
      gap: spacing.sm,
    },
    scriptsTitle: {
      fontSize: control.body,
      fontWeight: '800',
      color: palette.ink,
    },
    scriptsEmpty: {
      fontSize: control.subtitle,
      color: palette.muted,
      lineHeight: 18,
    },
    scriptRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: palette.line,
    },
    scriptRowActive: {
      backgroundColor: tokens.surfaceContainerLow,
      marginHorizontal: -spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.md,
    },
    scriptCopy: { flex: 1 },
    scriptName: { fontSize: 14, fontWeight: '700', color: palette.ink },
    scriptMeta: { marginTop: 2, fontSize: 12, color: palette.muted },
    scriptAction: { fontSize: 12, fontWeight: '700', color: tokens.secondary },
    physicalCard: {
      backgroundColor: palette.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: palette.line,
      padding: spacing.md,
      gap: spacing.sm,
    },
    physicalTitle: {
      fontSize: control.body,
      fontWeight: '800',
      color: palette.ink,
    },
    physicalBody: {
      fontSize: control.subtitle,
      color: palette.muted,
      lineHeight: 18,
    },
    physicalBtn: {
      minHeight: control.inputHeight,
      borderRadius: borderRadius.button,
      backgroundColor: tokens.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.xs,
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.45)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: palette.card,
      borderTopLeftRadius: borderRadius.panel,
      borderTopRightRadius: borderRadius.panel,
      padding: spacing.md,
      paddingBottom: spacing.xl,
      maxHeight: '88%',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.ink,
      marginBottom: spacing.xs,
    },
    modalHint: {
      fontSize: control.subtitle,
      color: palette.muted,
      marginBottom: spacing.md,
      lineHeight: 18,
    },
    reasonLabel: {
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      fontSize: control.label,
      fontWeight: '700',
      color: palette.ink,
    },
    reasonInput: {
      minHeight: 88,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: palette.line,
      backgroundColor: palette.page,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: palette.ink,
      textAlignVertical: 'top',
      marginBottom: spacing.md,
    },
    cancelBtn: {
      minHeight: control.minTap,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
    },
    cancelText: {
      color: palette.muted,
      fontWeight: '700',
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
