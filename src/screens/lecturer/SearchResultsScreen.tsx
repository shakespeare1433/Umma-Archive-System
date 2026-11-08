import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import { LecturerStackHeader } from '../../components/booklets/LecturerStackHeader';
import { BookletResultCard } from '../../components/booklets/BookletResultCard';
import { lecturerPalette, useTheme } from '../../context/ThemeContext';
import { useBookletSearch } from '../../hooks/useBookletSearch';
import { BOOKLET_COPY, BOOKLET_DOWNLOAD_CAP } from '../../constants/booklets';
import {
  bookletFileName,
  downloadBookletPdf,
  friendlyBookletError,
  shareBookletFile,
} from '../../services/bookletService';
import { Booklet, BookletSort, RootStackParamList } from '../../types';
import { useVault } from '../../context/VaultContext';
import { borderRadius, colors as tokens, control, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LecturerSearchResults'>;

const SORT_OPTIONS: { key: BookletSort; label: string }[] = [
  { key: 'newest', label: BOOKLET_COPY.sortNewest },
  { key: 'unit_code', label: BOOKLET_COPY.sortUnitCode },
  { key: 'session', label: BOOKLET_COPY.sortSession },
];

export const SearchResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const palette = lecturerPalette(theme);
  const styles = useMemo(() => createStyles(palette), [theme]);
  const search = useBookletSearch(route.params.filter);
  const { requestMissingBooklet, saveFoundBooklet } = useVault();
  const [sortOpen, setSortOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState('');
  const [reason, setReason] = useState('');
  const [requesting, setRequesting] = useState(false);

  const readyPdfs = search.items.filter((item) => item.digitised && item.pdfPath);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3200);
  };

  const saveOne = async (booklet: Booklet) => {
    if (!booklet.digitised || !booklet.pdfPath) {
      showToast(BOOKLET_COPY.missingFile);
      return;
    }
    setDownloadingId(booklet.id);
    try {
      const uri = await downloadBookletPdf(booklet);
      await shareBookletFile(uri);
      showToast(BOOKLET_COPY.savedAs(bookletFileName(booklet)));
    } catch (error) {
      showToast(friendlyBookletError(error));
    } finally {
      setDownloadingId(null);
    }
  };

  const saveAll = async () => {
    if (readyPdfs.length > BOOKLET_DOWNLOAD_CAP) {
      showToast(BOOKLET_COPY.downloadCap(BOOKLET_DOWNLOAD_CAP));
      return;
    }
    const queue = readyPdfs.slice(0, BOOKLET_DOWNLOAD_CAP);
    try {
      for (let index = 0; index < queue.length; index += 1) {
        const booklet = queue[index];
        setBatchProgress(BOOKLET_COPY.downloadingN(index + 1, queue.length));
        const uri = await downloadBookletPdf(booklet);
        if (index === queue.length - 1) {
          await shareBookletFile(uri);
        }
      }
      showToast(BOOKLET_COPY.savedAs(`${queue.length} PDFs`));
    } catch (error) {
      showToast(friendlyBookletError(error));
    } finally {
      setBatchProgress('');
    }
  };

  return (
    <View style={styles.screen}>
      <LecturerStackHeader title={BOOKLET_COPY.resultsTitle} onBack={() => navigation.goBack()} />

      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>{BOOKLET_COPY.found(search.total)}</Text>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={BOOKLET_COPY.sort}
        >
          <MaterialCommunityIcons name="sort" size={18} color={palette.muted} />
        </TouchableOpacity>
      </View>

      {search.loading ? (
        <View style={styles.listPad}>
          {[0, 1, 2, 3].map((key) => (
            <View key={key} style={styles.skeleton} />
          ))}
        </View>
      ) : search.error ? (
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>{search.error}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={search.retry}
            accessibilityRole="button"
            accessibilityLabel={BOOKLET_COPY.retry}
          >
            <Text style={styles.primaryBtnText}>{BOOKLET_COPY.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : search.items.length === 0 ? (
        <KeyboardScrollView bottomOffset={24} contentContainerStyle={styles.centerState}>
          <MaterialCommunityIcons name="file-search-outline" size={56} color={tokens.secondary} />
          <Text style={styles.emptyTitle}>{BOOKLET_COPY.emptyTitle}</Text>
          <Text style={styles.emptyBody}>{BOOKLET_COPY.emptyBody}</Text>
          <TextInput
            style={styles.reasonInput}
            value={reason}
            onChangeText={setReason}
            placeholder={BOOKLET_COPY.requestReasonHint}
            placeholderTextColor={palette.muted}
            multiline
          />
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setRequesting(true);
              void requestMissingBooklet(route.params.filter, reason)
                .then((failed) => {
                  showToast(failed ?? BOOKLET_COPY.requestSent);
                })
                .finally(() => setRequesting(false));
            }}
            disabled={requesting}
            accessibilityRole="button"
            accessibilityLabel={BOOKLET_COPY.requestOfficer}
          >
            {requesting ? (
              <ActivityIndicator color={tokens.onPrimary} />
            ) : (
              <Text style={styles.primaryBtnText}>{BOOKLET_COPY.requestOfficer}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={BOOKLET_COPY.changeFilters}
          >
            <Text style={styles.secondaryBtnText}>{BOOKLET_COPY.changeFilters}</Text>
          </TouchableOpacity>
        </KeyboardScrollView>
      ) : (
        <FlatList
          data={search.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPad}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <BookletResultCard
              booklet={item}
              downloading={downloadingId === item.id}
              onPress={() => {
                saveFoundBooklet(
                  item.unitCode,
                  item.unitName || item.studentName || 'Examination booklet',
                  item.school || item.programme || 'Archive',
                  `Opened ${new Date().toLocaleString()}`
                );
                navigation.navigate('LecturerBookletDetails', {
                  bookletId: item.id,
                  startPage: item.startPage ?? undefined,
                  endPage: item.endPage ?? undefined,
                  studentName: item.studentName,
                  registrationNo: item.registrationNo,
                });
              }}
              onDownload={() => {
                void saveOne(item);
              }}
            />
          )}
          onEndReached={search.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={search.refreshing} onRefresh={search.refresh} />
          }
          ListFooterComponent={
            search.loadingMore ? (
              <ActivityIndicator color={tokens.secondary} style={styles.moreSpinner} />
            ) : (
              <View style={styles.footerSpacer} />
            )
          }
        />
      )}

      {readyPdfs.length > 0 && !search.loading ? (
        <View style={styles.downloadAllWrap}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed ? styles.pressed : null]}
            onPress={() => {
              void saveAll();
            }}
            disabled={Boolean(batchProgress)}
            accessibilityRole="button"
            accessibilityLabel={BOOKLET_COPY.downloadAll(readyPdfs.length)}
          >
            {batchProgress ? (
              <ActivityIndicator color={tokens.onPrimary} />
            ) : (
              <Feather name="download" size={18} color={tokens.onPrimary} />
            )}
            <Text style={styles.primaryBtnText}>
              {batchProgress || BOOKLET_COPY.downloadAll(Math.min(readyPdfs.length, BOOKLET_DOWNLOAD_CAP))}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.sortBackdrop} onPress={() => setSortOpen(false)}>
          <View style={styles.sortSheet}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.sortItem}
                onPress={() => {
                  search.changeSort(option.key);
                  setSortOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={option.label}
              >
                <Text
                  style={[
                    styles.sortItemText,
                    search.sort === option.key ? styles.sortItemActive : null,
                  ]}
                >
                  {option.label}
                </Text>
                {search.sort === option.key ? (
                  <Feather name="check" size={18} color={tokens.secondary} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
};

function createStyles(palette: ReturnType<typeof lecturerPalette>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.page,
    },
    summaryBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    summaryText: {
      fontSize: control.body,
      fontWeight: '700',
      color: palette.ink,
      fontFamily: typography.fontFamilySans,
    },
    sortBtn: {
      width: control.minTap,
      height: control.minTap,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listPad: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxl,
    },
    separator: {
      height: spacing.md,
    },
    skeleton: {
      height: 108,
      borderRadius: borderRadius.lg,
      backgroundColor: palette.soft,
      marginBottom: spacing.md,
    },
    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.ink,
      textAlign: 'center',
      fontFamily: typography.fontFamilySans,
    },
    emptyBody: {
      fontSize: control.subtitle,
      color: palette.muted,
      textAlign: 'center',
    },
    reasonInput: {
      width: '100%',
      minHeight: 88,
      marginTop: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: palette.line,
      backgroundColor: palette.card,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: palette.ink,
      textAlignVertical: 'top',
    },
    secondaryBtn: {
      minHeight: control.inputHeight,
      borderRadius: borderRadius.button,
      borderWidth: 1.5,
      borderColor: tokens.secondary,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.card,
    },
    secondaryBtnText: {
      color: tokens.secondary,
      fontWeight: '700',
      fontSize: control.body,
    },
    primaryBtn: {
      marginTop: spacing.md,
      minHeight: control.inputHeight,
      borderRadius: borderRadius.button,
      backgroundColor: tokens.secondary,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    primaryBtnText: {
      color: tokens.onPrimary,
      fontWeight: '700',
      fontSize: control.body,
    },
    pressed: {
      backgroundColor: tokens.primaryHover,
    },
    downloadAllWrap: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
      paddingTop: spacing.sm,
      backgroundColor: palette.page,
    },
    moreSpinner: {
      marginVertical: spacing.md,
    },
    footerSpacer: {
      height: spacing.md,
    },
    sortBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(11, 28, 48, 0.35)',
      justifyContent: 'flex-end',
    },
    sortSheet: {
      backgroundColor: palette.card,
      borderTopLeftRadius: borderRadius.panel,
      borderTopRightRadius: borderRadius.panel,
      padding: spacing.md,
    },
    sortItem: {
      minHeight: control.minTap,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
    },
    sortItemText: {
      fontSize: control.body,
      color: palette.body,
    },
    sortItemActive: {
      color: tokens.secondary,
      fontWeight: '700',
    },
    toast: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      bottom: spacing.xl,
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
