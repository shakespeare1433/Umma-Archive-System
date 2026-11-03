import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { lecturerPalette, useTheme } from '../../context/ThemeContext';
import { useVault } from '../../context/VaultContext';
import { ALL_SESSIONS, RootStackParamList } from '../../types';
import { BOOKLET_COPY } from '../../constants/booklets';
import { hasActiveBookletFilter } from '../../services/bookletService';
import {
  ACADEMIC_SESSIONS,
  ALL_PROGRAMMES,
  ALL_SCHOOLS,
  PROGRAMMES_BY_SCHOOL,
  programmesForSchool,
  SCHOOLS,
} from '../../data/catalog';
import { loadAcademicSessions, loadProgrammesBySchool } from '../../services/catalogService';
import { borderRadius, colors as tokens, control, spacing, typography } from '../../theme';

const SEARCH_COPY = {
  title: 'Search Archive',
  subtitle: 'Enter the details below to find a booklet',
  clear: 'Clear',
  school: 'School',
  programme: 'Programme',
  session: 'Academic Session',
  unitCode: 'Unit Code',
  unitName: 'Unit Name',
  studentName: 'Student Name',
  admissionNumber: 'Registration Number',
  optional: 'Optional',
  search: 'Search',
  info: 'You can search using any combination of the above details.',
} as const;

type Palette = ReturnType<typeof lecturerPalette>;
type SearchStyles = ReturnType<typeof createSearchStyles>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const FIELD_ICON_SIZE = 20;
const FIELD_ICON_WELL = 36;

export const SearchArchiveScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const colors = lecturerPalette(theme);
  const styles = useMemo(() => createSearchStyles(colors), [theme]);
  const {
    searchFilter,
    setSearchFilter,
    resetSearchFilter,
    logSearch,
  } = useVault();

  const schools = [ALL_SCHOOLS, ...SCHOOLS];
  const [sessionChoices, setSessionChoices] = useState<string[]>([...ACADEMIC_SESSIONS]);
  const sessions = [ALL_SESSIONS, ...sessionChoices];
  const [programmesBySchool, setProgrammesBySchool] = useState(PROGRAMMES_BY_SCHOOL);
  const programmeChoices = programmesForSchool(searchFilter.faculty, programmesBySchool);
  const programmes = [ALL_PROGRAMMES, ...programmeChoices];

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadProgrammesBySchool(), loadAcademicSessions()])
      .then(([nextProgrammes, nextSessions]) => {
        if (cancelled) return;
        setProgrammesBySchool(nextProgrammes);
        setSessionChoices(nextSessions);
      })
      .catch(() => {
        // The bundled school lists still drive the dropdowns if the catalog query fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [showProgrammeModal, setShowProgrammeModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

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
      navigation.navigate('LecturerSearchResults', { filter: { ...searchFilter } });
    } finally {
      setSearching(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <LecturerTopHeader subtitle="Lecturer Portal" />

      <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.headingBlock}>
            <Text style={styles.pageTitle}>{SEARCH_COPY.title}</Text>
            <Text style={styles.pageSubtitle}>{SEARCH_COPY.subtitle}</Text>
          </View>

          <View style={styles.filterCard}>
            <View style={styles.clearRow}>
              <TouchableOpacity
                onPress={resetSearchFilter}
                style={styles.clearBtn}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Clear search filters"
              >
                <MaterialCommunityIcons name="refresh" size={FIELD_ICON_SIZE} color={tokens.primary} />
                <Text style={styles.clearBtnText}>{SEARCH_COPY.clear}</Text>
              </TouchableOpacity>
            </View>

            <SelectField
              label={SEARCH_COPY.school}
              value={searchFilter.faculty}
              icon="school-outline"
              iconBg="#1E3A8A"
              focused={showFacultyModal}
              onPress={() => setShowFacultyModal(true)}
              styles={styles}
            />

            <SelectField
              label={SEARCH_COPY.programme}
              value={searchFilter.programme}
              icon="book-open-outline"
              iconBg="#6B21A8"
              focused={showProgrammeModal}
              onPress={() => setShowProgrammeModal(true)}
              styles={styles}
            />

            <SelectField
              label={SEARCH_COPY.session}
              value={searchFilter.session}
              icon="calendar-outline"
              iconBg="#0369A1"
              focused={showSessionModal}
              onPress={() => setShowSessionModal(true)}
              styles={styles}
            />

            <TextField
              label={SEARCH_COPY.unitCode}
              icon="pound"
              iconBg="#C2410C"
              value={searchFilter.unitCode}
              onChangeText={(txt) => setSearchFilter((p) => ({ ...p, unitCode: txt }))}
              placeholder="e.g., CSC 3201"
              styles={styles}
            />

            <TextField
              label={SEARCH_COPY.unitName}
              icon="book-outline"
              iconBg="#047857"
              value={searchFilter.unitName}
              onChangeText={(txt) => setSearchFilter((p) => ({ ...p, unitName: txt }))}
              placeholder="e.g., Advanced Database Systems"
              styles={styles}
            />

            <TextField
              label={SEARCH_COPY.studentName}
              icon="account-outline"
              iconBg="#1D4ED8"
              value={searchFilter.studentName}
              onChangeText={(txt) => setSearchFilter((p) => ({ ...p, studentName: txt }))}
              placeholder="Filter by candidate..."
              optional
              styles={styles}
            />

            <TextField
              label={SEARCH_COPY.admissionNumber}
              icon="card-account-details-outline"
              iconBg="#0F766E"
              value={searchFilter.admissionNumber}
              onChangeText={(txt) => setSearchFilter((p) => ({ ...p, admissionNumber: txt }))}
              placeholder="e.g., CIT/00452/2021"
              optional
              styles={styles}
            />

            <Pressable
              style={({ pressed }) => [
                styles.searchSubmitBtn,
                pressed && !searching ? styles.searchSubmitBtnPressed : null,
                searching ? styles.searchSubmitBtnDisabled : null,
              ]}
              onPress={() => {
                void runSearch();
              }}
              disabled={searching}
              accessibilityRole="button"
              accessibilityLabel={SEARCH_COPY.search}
              accessibilityState={{ disabled: searching, busy: searching }}
            >
              {searching ? (
                <ActivityIndicator color={tokens.onPrimary} />
              ) : (
                <Feather name="search" size={FIELD_ICON_SIZE} color={tokens.onPrimary} />
              )}
              <Text style={styles.searchSubmitBtnText}>{SEARCH_COPY.search}</Text>
            </Pressable>
          </View>

          <View
            style={styles.infoNote}
            accessibilityRole="text"
            accessibilityLabel={SEARCH_COPY.info}
          >
            <View style={styles.infoIconCircle}>
              <Feather name="info" size={FIELD_ICON_SIZE} color={tokens.onPrimary} />
            </View>
            <Text style={styles.infoNoteText}>{SEARCH_COPY.info}</Text>
          </View>

          {searchError ? <Text style={styles.emptyText}>{searchError}</Text> : null}
        </ScrollView>

      <Modal visible={showFacultyModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalSheetTitle}>Select School</Text>
            {schools.map((fac) => (
              <TouchableOpacity
                key={fac}
                style={styles.modalItem}
                onPress={() => {
                  setSearchFilter((p) => ({
                    ...p,
                    faculty: fac,
                    programme: fac === p.faculty ? p.programme : ALL_PROGRAMMES,
                  }));
                  setShowFacultyModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    searchFilter.faculty === fac && styles.modalItemTextActive,
                  ]}
                >
                  {fac}
                </Text>
                {searchFilter.faculty === fac && (
                  <MaterialIcons name="check" size={18} color="#2563EB" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowFacultyModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showProgrammeModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalSheetTitle}>Select Programme</Text>
            {programmeChoices.length === 0 && searchFilter.faculty !== ALL_SCHOOLS ? (
              <Text style={styles.modalHint}>
                No programmes are configured for this school yet. Search still includes every programme in the school.
              </Text>
            ) : null}
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {programmes.map((programme) => (
                <TouchableOpacity
                  key={programme}
                  style={styles.modalItem}
                  onPress={() => {
                    setSearchFilter((p) => ({ ...p, programme }));
                    setShowProgrammeModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      searchFilter.programme === programme && styles.modalItemTextActive,
                    ]}
                  >
                    {programme}
                  </Text>
                  {searchFilter.programme === programme && (
                    <MaterialIcons name="check" size={18} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowProgrammeModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSessionModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalSheetTitle}>Select Academic Session</Text>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {sessions.map((sess) => (
                <TouchableOpacity
                  key={sess}
                  style={styles.modalItem}
                  onPress={() => {
                    setSearchFilter((p) => ({ ...p, session: sess }));
                    setShowSessionModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      searchFilter.session === sess && styles.modalItemTextActive,
                    ]}
                  >
                    {sess}
                  </Text>
                  {searchFilter.session === sess && (
                    <MaterialIcons name="check" size={18} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowSessionModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

function FieldLabel({
  label,
  optional,
  styles,
}: {
  label: string;
  optional?: boolean;
  styles: SearchStyles;
}) {
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {optional ? <Text style={styles.optionalText}>{SEARCH_COPY.optional}</Text> : null}
    </View>
  );
}

function IconWell({ name, iconBg, styles }: { name: IconName; iconBg: string; styles: SearchStyles }) {
  return (
    <View style={[styles.iconWell, { backgroundColor: iconBg }]} pointerEvents="none">
      <MaterialCommunityIcons name={name} size={FIELD_ICON_SIZE} color={tokens.onPrimary} />
    </View>
  );
}

function SelectField({
  label,
  value,
  icon,
  iconBg,
  focused,
  onPress,
  styles,
}: {
  label: string;
  value: string;
  icon: IconName;
  iconBg: string;
  focused: boolean;
  onPress: () => void;
  styles: SearchStyles;
}) {
  return (
    <View style={styles.fieldBlock}>
      <FieldLabel label={label} styles={styles} />
      <TouchableOpacity
        style={[styles.fieldControl, focused ? styles.fieldControlFocused : null]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value }}
      >
        <IconWell name={icon} iconBg={iconBg} styles={styles} />
        <Text style={styles.dropdownText} numberOfLines={1}>
          {value}
        </Text>
        <Feather name="chevron-down" size={FIELD_ICON_SIZE} color={tokens.primary} />
      </TouchableOpacity>
    </View>
  );
}

function TextField({
  label,
  icon,
  iconBg,
  value,
  onChangeText,
  placeholder,
  optional,
  styles,
}: {
  label: string;
  icon: IconName;
  iconBg: string;
  value: string;
  onChangeText: (txt: string) => void;
  placeholder: string;
  optional?: boolean;
  styles: SearchStyles;
}) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldBlock}>
      <FieldLabel label={label} optional={optional} styles={styles} />
      <View
        collapsable={false}
        style={[styles.fieldControl, focused ? styles.fieldControlFocused : null]}
      >
        <IconWell name={icon} iconBg={iconBg} styles={styles} />
        <TextInput
          ref={inputRef}
          style={styles.textInputField}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          blurOnSubmit={false}
          autoCorrect={false}
          textAlignVertical="center"
          accessibilityLabel={optional ? `${label}, ${SEARCH_COPY.optional}` : label}
        />
      </View>
    </View>
  );
}

function createSearchStyles(palette: Palette) {
  const { dark, page, card, ink, body, muted, line, field } = palette;
  const serif = Platform.OS === 'ios' ? 'Georgia' : typography.fontFamilySerif;
  const fieldBg = dark ? field : tokens.surfaceContainerLowest;
  const cardBorder = dark ? line : tokens.surfaceContainerHigh;
  const infoBg = dark ? tokens.primaryContainer : tokens.roleLecturerBg;
  const infoBorder = dark ? line : tokens.surfaceContainerHigh;
  const labelColor = dark ? ink : tokens.primary;

  return StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: page,
    },
    flex: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
    },
    headingBlock: {
      backgroundColor: tokens.primary,
      borderRadius: borderRadius.panel,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
      marginBottom: spacing.md,
      shadowColor: tokens.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 10,
      elevation: 3,
    },
    pageTitle: {
      fontSize: control.heading,
      lineHeight: 28,
      fontWeight: '700',
      color: tokens.onPrimary,
      fontFamily: typography.fontFamilySans,
    },
    pageSubtitle: {
      marginTop: spacing.xs,
      fontSize: control.subtitle,
      lineHeight: 18,
      color: tokens.surfaceContainerHighest,
      fontFamily: typography.fontFamilySans,
    },
    filterCard: {
      backgroundColor: card,
      borderRadius: borderRadius.panel,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: cardBorder,
      marginBottom: spacing.md,
      shadowColor: tokens.onSurface,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: dark ? 0 : 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    clearRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: spacing.sm,
    },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: control.minTap,
      paddingHorizontal: spacing.sm,
      gap: spacing.xs,
    },
    clearBtnText: {
      fontSize: control.subtitle,
      fontWeight: '600',
      color: tokens.primary,
      fontFamily: typography.fontFamilySans,
    },
    fieldBlock: {
      marginBottom: spacing.md,
    },
    fieldLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      minHeight: 20,
    },
    fieldLabel: {
      fontSize: control.label,
      fontWeight: '600',
      color: labelColor,
      fontFamily: typography.fontFamilySans,
    },
    optionalText: {
      fontSize: control.subtitle,
      fontWeight: '500',
      color: muted,
      fontFamily: typography.fontFamilySans,
    },
    fieldControl: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: fieldBg,
      borderWidth: 2,
      borderColor: tokens.inputBorder,
      borderRadius: borderRadius.md,
      minHeight: control.inputHeight,
      paddingHorizontal: spacing.sm,
      gap: spacing.sm,
    },
    fieldControlFocused: {
      borderColor: tokens.primary,
      backgroundColor: fieldBg,
    },
    iconWell: {
      width: FIELD_ICON_WELL,
      height: FIELD_ICON_WELL,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropdownText: {
      flex: 1,
      fontSize: control.body,
      color: body,
      fontWeight: '500',
      fontFamily: typography.fontFamilySans,
    },
    textInputField: {
      flex: 1,
      height: control.inputHeight - 4,
      fontSize: control.body,
      color: body,
      paddingVertical: 0,
      margin: 0,
      fontFamily: typography.fontFamilySans,
    },
    searchSubmitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.primary,
      borderRadius: borderRadius.button,
      minHeight: control.inputHeight,
      gap: spacing.sm,
      shadowColor: tokens.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 8,
      elevation: 4,
    },
    searchSubmitBtnPressed: {
      backgroundColor: tokens.primaryHover,
    },
    searchSubmitBtnDisabled: {
      opacity: 0.6,
    },
    searchSubmitBtnText: {
      fontSize: control.body,
      fontWeight: '700',
      color: tokens.onPrimary,
      fontFamily: typography.fontFamilySans,
    },
    scanSubmitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.surfaceContainerLowest,
      borderRadius: borderRadius.button,
      minHeight: control.inputHeight,
      gap: spacing.sm,
      marginTop: spacing.sm,
      borderWidth: 1.5,
      borderColor: tokens.primary,
    },
    scanSubmitBtnPressed: {
      backgroundColor: tokens.primaryContainer,
    },
    scanSubmitBtnText: {
      fontSize: control.body,
      fontWeight: '700',
      color: tokens.primary,
      fontFamily: typography.fontFamilySans,
    },
    infoNote: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: infoBg,
      borderRadius: borderRadius.note,
      borderWidth: 1,
      borderColor: infoBorder,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    infoIconCircle: {
      width: FIELD_ICON_WELL,
      height: FIELD_ICON_WELL,
      borderRadius: FIELD_ICON_WELL / 2,
      backgroundColor: '#1E3A8A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoNoteText: {
      flex: 1,
      fontSize: control.note,
      lineHeight: 18,
      color: labelColor,
      fontFamily: typography.fontFamilySans,
    },
    resultsHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    resultsTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    greenLiveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#16A34A',
    },
    emptyText: {
      marginBottom: 12,
      color: muted,
      fontSize: 14,
      fontWeight: '600',
    },
    resultsSectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: ink,
    },
    resultsControlsGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    foundBadge: {
      backgroundColor: '#EDE9FE',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    foundBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#6D28D9',
    },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: control.minTap,
      gap: 2,
    },
    sortButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: muted,
    },
    recordCard: {
      backgroundColor: card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: line,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
    recordTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    recordBadgesLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    courseCodePill: {
      backgroundColor: '#35477B',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    courseCodePillText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    originalBookletPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 8,
      gap: 3,
    },
    originalBookletPillText: {
      fontSize: 10.5,
      fontWeight: '600',
      color: '#166534',
    },
    sessionDateText: {
      fontSize: 11.5,
      color: muted,
    },
    recordCourseName: {
      fontSize: 15,
      fontWeight: '700',
      color: body,
      fontFamily: serif,
      marginBottom: 6,
    },
    candidateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    candidateText: {
      fontSize: 12,
      color: muted,
      fontWeight: '500',
    },
    coordinateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: field,
      borderRadius: 8,
      padding: 9,
      marginBottom: 12,
    },
    coordIcon: {
      marginRight: 8,
    },
    coordContent: {
      flex: 1,
    },
    coordLabel: {
      fontSize: 10,
      color: muted,
      marginBottom: 1,
    },
    coordCoordinates: {
      fontSize: 11.5,
      fontWeight: '700',
      color: body,
    },
    recordFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    vaultVerifiedTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    vaultVerifiedText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: '#15803D',
    },
    requestBookletBtn: {
      backgroundColor: '#A7F3D0',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      minHeight: control.minTap,
      justifyContent: 'center',
    },
    requestBookletBtnDisabled: {
      backgroundColor: '#E2E8F0',
    },
    requestBookletBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#064E3B',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '60%',
    },
    modalSheetTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: ink,
      marginBottom: 14,
    },
    modalHint: {
      fontSize: 13,
      lineHeight: 18,
      color: muted,
      marginBottom: 10,
    },
    modalList: {
      flexGrow: 0,
    },
    modalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      minHeight: control.minTap,
      borderBottomWidth: 1,
      borderBottomColor: line,
    },
    modalItemText: {
      fontSize: 14,
      color: body,
    },
    modalItemTextActive: {
      color: '#2563EB',
      fontWeight: '700',
    },
    modalCloseBtn: {
      backgroundColor: field,
      borderRadius: 10,
      paddingVertical: 12,
      minHeight: control.minTap,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
    },
    modalCloseBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: muted,
    },
    successModalCard: {
      backgroundColor: card,
      borderRadius: 20,
      padding: 24,
      marginHorizontal: 24,
      marginBottom: '40%',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    successIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    successModalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: ink,
      textAlign: 'center',
      marginBottom: 8,
    },
    successModalMessage: {
      fontSize: 13,
      color: muted,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 8,
    },
    successModalCoordinate: {
      fontSize: 12,
      fontWeight: '700',
      color: '#2563EB',
      marginBottom: 16,
    },
    successModalBtn: {
      backgroundColor: '#35477B',
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 32,
      minHeight: control.minTap,
      justifyContent: 'center',
    },
    successModalBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
  });
}
