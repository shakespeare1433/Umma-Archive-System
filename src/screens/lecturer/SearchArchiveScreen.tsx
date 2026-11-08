import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { lecturerPalette, useTheme } from '../../context/ThemeContext';
import { useVault } from '../../context/VaultContext';
import { ALL_SESSIONS, Booklet, RootStackParamList } from '../../types';
import { BOOKLET_COPY, bookletHasPdf } from '../../constants/booklets';
import {
  bookletFileName,
  downloadBookletPdf,
  friendlyBookletError,
  hasActiveBookletFilter,
  searchBooklets,
  shareBookletFile,
} from '../../services/bookletService';
import {
  ACADEMIC_SESSION_TERMS,
  ACADEMIC_SESSION_YEARS,
  ALL_PROGRAMMES,
  ALL_SCHOOLS,
  formatAcademicSession,
  parseAcademicSession,
  PROGRAMMES_BY_SCHOOL,
  programmesForSchool,
  SCHOOLS,
} from '../../data/catalog';
import { loadProgrammesBySchool, loadSchools } from '../../services/catalogService';
import { borderRadius, colors as tokens, spacing } from '../../theme';

const SEARCH_COPY = {
  title: 'Search Examination Booklet',
  subtitle: "Find a student's examination script using the following details.",
  clear: 'Clear',
  school: 'School',
  programme: 'Programme',
  session: 'Academic Session',
  unitCode: 'Unit Code',
  unitName: 'Unit Name',
  bundleId: 'Bundle ID',
  studentName: 'Student Name',
  admissionNumber: 'Registration Number',
  search: 'Search',
  results: 'Search Results',
} as const;

type Palette = ReturnType<typeof lecturerPalette>;
type SearchStyles = ReturnType<typeof createSearchStyles>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Medium wells — each field gets its own dark coloured background. */
const ICON = {
  school: { name: 'school-outline' as IconName, bg: '#1E3A8A', fg: '#DBEAFE' },
  programme: { name: 'book-open-page-variant-outline' as IconName, bg: '#5B21B6', fg: '#EDE9FE' },
  session: { name: 'calendar-month-outline' as IconName, bg: '#0F766E', fg: '#CCFBF1' },
  unitCode: { name: 'file-document-outline' as IconName, bg: '#9A3412', fg: '#FFEDD5' },
  unitName: { name: 'notebook-outline' as IconName, bg: '#166534', fg: '#DCFCE7' },
  bundle: { name: 'barcode' as IconName, bg: '#334155', fg: '#E2E8F0' },
  student: { name: 'account-outline' as IconName, bg: '#1E40AF', fg: '#DBEAFE' },
  reg: { name: 'card-account-details-outline' as IconName, bg: '#9F1239', fg: '#FFE4E6' },
};

export const SearchArchiveScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const colors = lecturerPalette(theme);
  const styles = useMemo(() => createSearchStyles(colors), [theme]);
  const { searchFilter, setSearchFilter, resetSearchFilter, logSearch, saveFoundBooklet } = useVault();

  const [schoolChoices, setSchoolChoices] = useState<string[]>([...SCHOOLS]);
  const schools = [ALL_SCHOOLS, ...schoolChoices];
  const sessionYears = [ALL_SESSIONS, ...ACADEMIC_SESSION_YEARS];
  const [programmesBySchool, setProgrammesBySchool] = useState(PROGRAMMES_BY_SCHOOL);
  const programmeChoices = programmesForSchool(searchFilter.faculty, programmesBySchool);
  const programmes = [ALL_PROGRAMMES, ...programmeChoices];
  const selectedSession = parseAcademicSession(searchFilter.session);

  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [showProgrammeModal, setShowProgrammeModal] = useState(false);
  const [showSessionYearModal, setShowSessionYearModal] = useState(false);
  const [showSessionTermModal, setShowSessionTermModal] = useState(false);
  const [pendingSessionYear, setPendingSessionYear] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState<Booklet[]>([]);
  const [searched, setSearched] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSchools(), loadProgrammesBySchool()])
      .then(([nextSchools, nextProgrammes]) => {
        if (cancelled) return;
        setSchoolChoices(nextSchools);
        setProgrammesBySchool(nextProgrammes);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3200);
  };

  const runSearch = async () => {
    if (!hasActiveBookletFilter(searchFilter)) {
      setSearchError(BOOKLET_COPY.emptyFilter);
      Alert.alert(BOOKLET_COPY.emptyFilterTitle, BOOKLET_COPY.emptyFilter);
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      logSearch(
        searchFilter.unitCode,
        searchFilter.unitName || searchFilter.studentName,
        searchFilter.faculty
      );
      const found = await searchBooklets(searchFilter, { page: 0, pageSize: 20, sort: 'newest' });
      setResults(found.rows);
      setSearched(true);
      found.rows.slice(0, 5).forEach((row) => {
        saveFoundBooklet(
          row.unitCode,
          row.unitName,
          row.programme || row.school,
          `Found ${new Date().toLocaleString()}`
        );
      });
    } catch (caught) {
      setResults([]);
      setSearched(true);
      setSearchError(friendlyBookletError(caught));
    } finally {
      setSearching(false);
    }
  };

  const viewPdf = (booklet: Booklet) => {
    if (!bookletHasPdf(booklet) || !booklet.pdfPath) {
      showToast(BOOKLET_COPY.missingFile);
      return;
    }
    navigation.navigate('LecturerPdfViewer', {
      bookletId: booklet.id,
      pdfPath: booklet.pdfPath,
      startPage: booklet.startPage ?? undefined,
      endPage: booklet.endPage ?? undefined,
      pageCount: booklet.pageCount,
      studentName: booklet.studentName,
      registrationNo: booklet.registrationNo,
      unitCode: booklet.unitCode,
      unitName: booklet.unitName,
    });
  };

  const downloadPdf = async (booklet: Booklet) => {
    if (!bookletHasPdf(booklet)) {
      showToast(BOOKLET_COPY.missingFile);
      return;
    }
    setDownloadingId(booklet.id);
    try {
      const uri = await downloadBookletPdf(booklet);
      await shareBookletFile(uri);
      showToast(BOOKLET_COPY.savedAs(bookletFileName(booklet)));
    } catch (caught) {
      showToast(friendlyBookletError(caught));
    } finally {
      setDownloadingId(null);
    }
  };

  const openPhysicalRequest = (booklet: Booklet) => {
    navigation.navigate('LecturerRequestPhysical', {
      bookletId: booklet.id,
      archiveId: booklet.archiveId,
      studentName: booklet.studentName,
      registrationNo: booklet.registrationNo,
      school: booklet.school,
      programme: booklet.programme,
      academicSession: booklet.academicSession,
      unitCode: booklet.unitCode,
      unitName: booklet.unitName,
    });
  };

  return (
    <View style={styles.screen}>
      <LecturerTopHeader subtitle="Lecturer Portal" />

      <KeyboardScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        <View style={styles.card}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Feather name="search" size={22} color={tokens.onPrimary} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.title}>{SEARCH_COPY.title}</Text>
              <Text style={styles.subtitle}>{SEARCH_COPY.subtitle}</Text>
            </View>
            <TouchableOpacity onPress={resetSearchFilter} hitSlop={10} accessibilityLabel="Clear">
              <MaterialCommunityIcons name="refresh" size={20} color={tokens.secondary} />
            </TouchableOpacity>
          </View>

          <SelectField
            label={SEARCH_COPY.school}
            value={searchFilter.faculty}
            icon={ICON.school}
            focused={showFacultyModal}
            onPress={() => setShowFacultyModal(true)}
            styles={styles}
          />
          <SelectField
            label={SEARCH_COPY.programme}
            value={searchFilter.programme}
            icon={ICON.programme}
            focused={showProgrammeModal}
            onPress={() => setShowProgrammeModal(true)}
            styles={styles}
          />
          <SelectField
            label={SEARCH_COPY.session}
            value={searchFilter.session}
            icon={ICON.session}
            focused={showSessionYearModal || showSessionTermModal}
            onPress={() => setShowSessionYearModal(true)}
            styles={styles}
          />
          <TextField
            label={SEARCH_COPY.unitCode}
            icon={ICON.unitCode}
            value={searchFilter.unitCode}
            onChangeText={(txt) => setSearchFilter((p) => ({ ...p, unitCode: txt }))}
            placeholder="e.g., ACC101"
            styles={styles}
          />
          <TextField
            label={SEARCH_COPY.unitName}
            icon={ICON.unitName}
            value={searchFilter.unitName}
            onChangeText={(txt) => setSearchFilter((p) => ({ ...p, unitName: txt }))}
            placeholder="e.g., Accounting"
            styles={styles}
          />
          <TextField
            label={SEARCH_COPY.bundleId}
            icon={ICON.bundle}
            value={searchFilter.bundleCode}
            onChangeText={(txt) => setSearchFilter((p) => ({ ...p, bundleCode: txt }))}
            placeholder="e.g. BND-2026-014"
            autoCapitalize="characters"
            styles={styles}
          />
          <TextField
            label={SEARCH_COPY.studentName}
            icon={ICON.student}
            value={searchFilter.studentName}
            onChangeText={(txt) => setSearchFilter((p) => ({ ...p, studentName: txt }))}
            placeholder="Enter Student Name"
            styles={styles}
          />
          <TextField
            label={SEARCH_COPY.admissionNumber}
            icon={ICON.reg}
            value={searchFilter.admissionNumber}
            onChangeText={(txt) => setSearchFilter((p) => ({ ...p, admissionNumber: txt }))}
            placeholder="Enter Registration Number"
            styles={styles}
          />

          <TouchableOpacity
            style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
            onPress={() => void runSearch()}
            disabled={searching}
            activeOpacity={0.85}
          >
            {searching ? (
              <ActivityIndicator color={tokens.onPrimary} />
            ) : (
              <Feather name="search" size={18} color={tokens.onPrimary} />
            )}
            <Text style={styles.searchBtnText}>{SEARCH_COPY.search}</Text>
          </TouchableOpacity>
        </View>

        {searchError ? <Text style={styles.error}>{searchError}</Text> : null}

        {searched ? (
          <View style={styles.resultsBlock}>
            <Text style={styles.resultsTitle}>{SEARCH_COPY.results}</Text>
            {results.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>{BOOKLET_COPY.emptyTitle}</Text>
                <Text style={styles.emptyBody}>{BOOKLET_COPY.emptyBody}</Text>
                <TouchableOpacity
                  style={styles.requestWide}
                  onPress={() => navigation.navigate('LecturerSearchResults', { filter: { ...searchFilter } })}
                >
                  <MaterialCommunityIcons name="package-variant-closed" size={18} color={tokens.onPrimary} />
                  <Text style={styles.requestWideText}>{BOOKLET_COPY.requestOfficer}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              results.map((booklet) => (
                <ResultCard
                  key={`${booklet.id}-${booklet.registrationNo}-${booklet.startPage || 0}`}
                  booklet={booklet}
                  styles={styles}
                  downloading={downloadingId === booklet.id}
                  onView={() => viewPdf(booklet)}
                  onDownload={() => void downloadPdf(booklet)}
                  onRequest={() => openPhysicalRequest(booklet)}
                  onOpenDetails={() =>
                    navigation.navigate('LecturerBookletDetails', {
                      bookletId: booklet.id,
                      studentName: booklet.studentName,
                      registrationNo: booklet.registrationNo,
                      startPage: booklet.startPage,
                      endPage: booklet.endPage,
                    })
                  }
                />
              ))
            )}
          </View>
        ) : null}

        {toast ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </KeyboardScrollView>

      <PickerModal
        visible={showFacultyModal}
        title="Select School"
        options={schools}
        selected={searchFilter.faculty}
        onClose={() => setShowFacultyModal(false)}
        onSelect={(fac) => {
          setSearchFilter((p) => ({
            ...p,
            faculty: fac,
            programme: fac === p.faculty ? p.programme : ALL_PROGRAMMES,
          }));
          setShowFacultyModal(false);
        }}
        styles={styles}
      />
      <PickerModal
        visible={showProgrammeModal}
        title="Select Programme"
        options={programmes}
        selected={searchFilter.programme}
        onClose={() => setShowProgrammeModal(false)}
        onSelect={(programme) => {
          setSearchFilter((p) => ({ ...p, programme }));
          setShowProgrammeModal(false);
        }}
        styles={styles}
      />
      <PickerModal
        visible={showSessionYearModal}
        title="Select Year"
        options={sessionYears}
        selected={
          searchFilter.session === ALL_SESSIONS ? ALL_SESSIONS : selectedSession?.year || ''
        }
        onClose={() => setShowSessionYearModal(false)}
        onSelect={(year) => {
          if (year === ALL_SESSIONS) {
            setSearchFilter((p) => ({ ...p, session: ALL_SESSIONS }));
            setPendingSessionYear('');
            setShowSessionYearModal(false);
            return;
          }
          setPendingSessionYear(year);
          setShowSessionYearModal(false);
          setShowSessionTermModal(true);
        }}
        styles={styles}
      />
      <PickerModal
        visible={showSessionTermModal}
        title={`${pendingSessionYear || selectedSession?.year || 'Session'} · Select Term`}
        options={[...ACADEMIC_SESSION_TERMS]}
        selected={
          pendingSessionYear && selectedSession?.year === pendingSessionYear
            ? selectedSession.term
            : ''
        }
        onClose={() => {
          setShowSessionTermModal(false);
          setPendingSessionYear('');
        }}
        onSelect={(term) => {
          const year = pendingSessionYear || selectedSession?.year;
          if (!year) return;
          setSearchFilter((p) => ({ ...p, session: formatAcademicSession(year, term) }));
          setShowSessionTermModal(false);
          setPendingSessionYear('');
        }}
        styles={styles}
      />

    </View>
  );
};

function ResultCard({
  booklet,
  styles,
  downloading,
  onView,
  onDownload,
  onRequest,
  onOpenDetails,
}: {
  booklet: Booklet;
  styles: SearchStyles;
  downloading: boolean;
  onView: () => void;
  onDownload: () => void;
  onRequest: () => void;
  onOpenDetails: () => void;
}) {
  const ready = bookletHasPdf(booklet);
  return (
    <View style={styles.resultCard}>
      <TouchableOpacity style={styles.resultTop} onPress={onOpenDetails} activeOpacity={0.85}>
        <View style={styles.pdfIcon}>
          <MaterialCommunityIcons name="file-pdf-box" size={30} color="#DC2626" />
        </View>
        <View style={styles.resultCopy}>
          <Text style={styles.resultName} numberOfLines={1}>
            {booklet.studentName || BOOKLET_COPY.missingValue}
          </Text>
          <Text style={styles.resultMeta}>Reg No: {booklet.registrationNo || '—'}</Text>
          <Text style={styles.resultMeta} numberOfLines={1}>
            {booklet.school || '—'}
          </Text>
          <Text style={styles.resultMeta} numberOfLines={1}>
            {booklet.programme || '—'} · {booklet.academicSession || '—'}
          </Text>
          <Text style={styles.resultMeta} numberOfLines={1}>
            {booklet.unitCode} – {booklet.unitName}
          </Text>
        </View>
        <View style={[styles.foundBadge, !ready && styles.physicalBadge]}>
          <Text style={[styles.foundBadgeText, !ready && styles.physicalBadgeText]}>
            {ready ? 'Found' : 'Physical'}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, !ready && styles.actionBtnDisabled]}
          onPress={onView}
          disabled={!ready}
        >
          <Feather name="eye" size={15} color={tokens.onPrimary} />
          <Text style={styles.actionBtnText}>View PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, !ready && styles.actionBtnDisabled]}
          onPress={onDownload}
          disabled={!ready || downloading}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={tokens.onPrimary} />
          ) : (
            <Feather name="download" size={15} color={tokens.onPrimary} />
          )}
          <Text style={styles.actionBtnText}>Download</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.requestWide} onPress={onRequest} activeOpacity={0.85}>
        <MaterialCommunityIcons name="package-variant-closed" size={18} color={tokens.onPrimary} />
        <Text style={styles.requestWideText}>Request Physical Booklet</Text>
      </TouchableOpacity>
    </View>
  );
}

function SelectField({
  label,
  value,
  icon,
  focused,
  onPress,
  styles,
}: {
  label: string;
  value: string;
  icon: { name: IconName; bg: string; fg: string };
  focused: boolean;
  onPress: () => void;
  styles: SearchStyles;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.control, focused && styles.controlFocused]}
        onPress={onPress}
        activeOpacity={1}
      >
        <View style={[styles.iconWell, { backgroundColor: icon.bg }]}>
          <MaterialCommunityIcons name={icon.name} size={22} color={icon.fg} />
        </View>
        <Text style={styles.controlText} numberOfLines={1}>
          {value}
        </Text>
        <Feather name="chevron-down" size={16} color={tokens.outline} />
      </TouchableOpacity>
    </View>
  );
}

function TextField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'none',
  styles,
}: {
  label: string;
  icon: { name: IconName; bg: string; fg: string };
  value: string;
  onChangeText: (txt: string) => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  styles: SearchStyles;
}) {
  const inputRef = useRef<TextInput>(null);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.control}
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
      >
        <View style={[styles.iconWell, { backgroundColor: icon.bg }]}>
          <MaterialCommunityIcons name={icon.name} size={22} color={icon.fg} />
        </View>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.placeholder}
          autoCapitalize={autoCapitalize}
          blurOnSubmit={false}
          autoCorrect={false}
          underlineColorAndroid="transparent"
          selectionColor={tokens.primary}
          cursorColor={tokens.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

function PickerModal({
  visible,
  title,
  options,
  selected,
  onClose,
  onSelect,
  styles,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onClose: () => void;
  onSelect: (value: string) => void;
  styles: SearchStyles;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
            {options.map((option) => (
              <TouchableOpacity key={option} style={styles.modalItem} onPress={() => onSelect(option)}>
                <Text style={[styles.modalItemText, selected === option && styles.modalItemTextOn]}>
                  {option}
                </Text>
                {selected === option ? <MaterialIcons name="check" size={18} color={tokens.secondary} /> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function createSearchStyles(palette: Palette) {
  const page = palette.dark ? '#0B1220' : '#D7DEEA';
  const card = palette.dark ? '#152238' : '#EEF2F8';
  const ink = palette.dark ? '#F8FAFC' : '#0B1C30';
  const muted = palette.dark ? '#94A3B8' : '#475569';
  const line = palette.dark ? '#334155' : '#B8C7DE';
  const field = palette.dark ? '#0F172A' : '#F8FAFC';

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: page },
    scroll: { flex: 1 },
    content: { padding: spacing.md, paddingBottom: 36 },
    card: {
      backgroundColor: card,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: line,
    },
    hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: tokens.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCopy: { flex: 1 },
    title: { fontSize: 18, fontWeight: '800', color: ink },
    subtitle: { marginTop: 4, fontSize: 12, lineHeight: 17, color: muted, fontWeight: '600' },
    field: { marginBottom: 10 },
    label: { fontSize: 12, fontWeight: '800', color: tokens.primary, marginBottom: 6 },
    control: {
      minHeight: 48,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: line,
      backgroundColor: field,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    controlFocused: {
      borderColor: line,
      backgroundColor: field,
    },
    iconWell: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlText: { flex: 1, fontSize: 14, fontWeight: '600', color: ink },
    input: { flex: 1, fontSize: 14, fontWeight: '600', color: ink, paddingVertical: 10 },
    searchBtn: {
      marginTop: 6,
      height: 48,
      borderRadius: borderRadius.button,
      backgroundColor: tokens.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    searchBtnDisabled: { opacity: 0.7 },
    searchBtnText: { color: tokens.onPrimary, fontWeight: '800', fontSize: 15 },
    error: { marginTop: 10, color: tokens.error, fontWeight: '700', fontSize: 12 },
    resultsBlock: { marginTop: 18 },
    resultsTitle: { fontSize: 16, fontWeight: '800', color: ink, marginBottom: 10 },
    emptyCard: {
      backgroundColor: card,
      borderRadius: borderRadius.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: line,
      gap: 8,
    },
    emptyTitle: { fontSize: 14, fontWeight: '800', color: ink },
    emptyBody: { fontSize: 12, color: muted, lineHeight: 18 },
    resultCard: {
      backgroundColor: card,
      borderRadius: borderRadius.lg,
      padding: 12,
      borderWidth: 1,
      borderColor: line,
      marginBottom: 12,
    },
    resultTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    pdfIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultCopy: { flex: 1 },
    resultName: { fontSize: 14, fontWeight: '800', color: ink },
    resultMeta: { marginTop: 2, fontSize: 11, fontWeight: '600', color: muted },
    foundBadge: {
      backgroundColor: '#14532D',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    foundBadgeText: { color: '#BBF7D0', fontSize: 10, fontWeight: '800' },
    physicalBadge: { backgroundColor: '#1E3A8A' },
    physicalBadgeText: { color: '#BFDBFE' },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    actionBtn: {
      flex: 1,
      height: 40,
      borderRadius: 10,
      backgroundColor: tokens.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    actionBtnDisabled: { opacity: 0.45 },
    actionBtnText: { color: tokens.onPrimary, fontWeight: '800', fontSize: 12 },
    requestWide: {
      marginTop: 8,
      height: 42,
      borderRadius: 10,
      backgroundColor: '#047857',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    requestWideText: { color: tokens.onPrimary, fontWeight: '800', fontSize: 13 },
    toast: {
      marginTop: 10,
      backgroundColor: tokens.primary,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    toastText: { color: tokens.onPrimary, fontWeight: '700', fontSize: 12 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.45)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: palette.dark ? '#1E293B' : '#FFFFFF',
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 18,
      paddingBottom: 28,
      maxHeight: '70%',
    },
    modalTitle: { fontSize: 16, fontWeight: '800', color: ink, marginBottom: 8 },
    modalList: { flexGrow: 0 },
    modalItem: {
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: line,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalItemText: { fontSize: 14, fontWeight: '600', color: ink, flex: 1, paddingRight: 8 },
    modalItemTextOn: { color: tokens.secondary, fontWeight: '800' },
    modalCancel: { alignItems: 'center', paddingVertical: 12 },
    modalCancelText: { color: muted, fontWeight: '700' },
  });
}
