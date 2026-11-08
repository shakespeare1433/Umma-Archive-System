import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import { officerPalette, useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import {
  ACADEMIC_SESSIONS,
  PROGRAMMES_BY_SCHOOL,
  SCHOOLS,
  programmesForSchool,
  racksForSchool,
  shelvesForSchool,
} from '../../data/catalog';
import { loadAcademicSessions, loadProgrammesBySchool, loadSchools } from '../../services/catalogService';
import { bytesFromBase64, upsertBookletFromArchive } from '../../services/bookletService';
import { createNotification } from '../../services/notificationService';
import { borderRadius, colors as tokens, control, spacing } from '../../theme';

type Palette = ReturnType<typeof officerPalette>;

type PickerKind = 'school' | 'programme' | 'session' | 'shelf' | 'rack';
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type StudentEntry = {
  id: string;
  studentName: string;
  registrationNo: string;
};

function newStudentEntry(): StudentEntry {
  return {
    id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    studentName: '',
    registrationNo: '',
  };
}

function resizeStudentEntries(current: StudentEntry[], count: number): StudentEntry[] {
  if (count < 1) return [];
  if (current.length === count) return current;
  if (current.length > count) return current.slice(0, count);
  const next = [...current];
  while (next.length < count) next.push(newStudentEntry());
  return next;
}

function isStudentComplete(row: StudentEntry): boolean {
  return Boolean(row.studentName.trim() && row.registrationNo.trim());
}

/** Medium wells — each field gets its own dark coloured background. */
const FIELD_ICON = {
  school: { name: 'school-outline' as IconName, bg: '#1E3A8A', fg: '#DBEAFE' },
  programme: { name: 'book-open-page-variant-outline' as IconName, bg: '#5B21B6', fg: '#EDE9FE' },
  session: { name: 'calendar-month-outline' as IconName, bg: '#0F766E', fg: '#CCFBF1' },
  unitCode: { name: 'file-document-outline' as IconName, bg: '#9A3412', fg: '#FFEDD5' },
  unitName: { name: 'notebook-outline' as IconName, bg: '#166534', fg: '#DCFCE7' },
  bundle: { name: 'barcode' as IconName, bg: '#334155', fg: '#E2E8F0' },
  student: { name: 'account-outline' as IconName, bg: '#1E40AF', fg: '#DBEAFE' },
  reg: { name: 'card-account-details-outline' as IconName, bg: '#9F1239', fg: '#FFE4E6' },
  rack: { name: 'server' as IconName, bg: '#1E3A8A', fg: '#DBEAFE' },
  shelf: { name: 'bookshelf' as IconName, bg: '#0F766E', fg: '#CCFBF1' },
  box: { name: 'package-variant-closed' as IconName, bg: '#9A3412', fg: '#FFEDD5' },
  position: { name: 'map-marker-outline' as IconName, bg: '#5B21B6', fg: '#EDE9FE' },
};

export const OfficerArchiveFormScreen: React.FC<{
  onClose: () => void;
  onDone: () => void;
}> = ({ onClose, onDone }) => {
  const { theme } = useTheme();
  const palette = officerPalette(theme);
  const { user } = useAuth();
  const { addRecord } = useVault();
  const [school, setSchool] = useState('');
  const [programme, setProgramme] = useState('');
  const [session, setSession] = useState('');
  const [unit, setUnit] = useState('');
  const [code, setCode] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [studentCountInput, setStudentCountInput] = useState('');
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [rack, setRack] = useState('');
  const [shelf, setShelf] = useState('');
  const [box, setBox] = useState('');
  const [position, setPosition] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [pdfSize, setPdfSize] = useState(0);
  const [schoolChoices, setSchoolChoices] = useState<string[]>([...SCHOOLS]);
  const [programmesBySchool, setProgrammesBySchool] = useState(PROGRAMMES_BY_SCHOOL);
  const [sessions, setSessions] = useState<string[]>([...ACADEMIC_SESSIONS]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const pdfBytesRef = useRef<Uint8Array | null>(null);

  const programmeChoices = useMemo(
    () => programmesForSchool(school, programmesBySchool),
    [school, programmesBySchool]
  );
  const rackChoices = useMemo(() => racksForSchool(school), [school]);
  const shelfChoices = useMemo(() => shelvesForSchool(school), [school]);
  const hasPdf = Boolean(pdfName);
  const studentCount = Number(studentCountInput);
  const completedStudents = useMemo(
    () => students.filter(isStudentComplete).length,
    [students]
  );
  const allStudentsComplete =
    Number.isInteger(studentCount) &&
    studentCount > 0 &&
    students.length === studentCount &&
    completedStudents === studentCount;

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSchools(), loadProgrammesBySchool(), loadAcademicSessions()])
      .then(([nextSchools, nextProgrammes, nextSessions]) => {
        if (cancelled) return;
        setSchoolChoices(nextSchools);
        setProgrammesBySchool(nextProgrammes);
        setSessions(nextSessions);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const readPdfBytes = async (uri: string) => {
    try {
      const response = await fetch(uri);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > 0) return new Uint8Array(buffer);
      }
    } catch {
      // Android content URIs often need the file API.
    }
    const encoded = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return bytesFromBase64(encoded);
  };

  const attachPdf = async (uri: string, name: string, mime?: string | null) => {
    const looksPdf = (mime || '').includes('pdf') || name.toLowerCase().endsWith('.pdf');
    if (!looksPdf) {
      setError('Choose a PDF file for the scanned booklet.');
      return;
    }
    const bytes = await readPdfBytes(uri);
    if (bytes.byteLength < 5) {
      setError('The selected file is empty. Choose a valid PDF.');
      return;
    }
    const header = String.fromCharCode(...bytes.slice(0, 4));
    if (header !== '%PDF') {
      setError('Choose a valid PDF file for the combined examination scripts.');
      return;
    }
    pdfBytesRef.current = bytes;
    setPdfName(name);
    setPdfSize(bytes.byteLength);
    setError('');
  };

  const clearPdf = () => {
    pdfBytesRef.current = null;
    setPdfName('');
    setPdfSize(0);
    setStudentCountInput('');
    setStudents([]);
  };

  const choosePdf = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const file = picked.assets[0];
    await attachPdf(file.uri, file.name || 'booklet.pdf', file.mimeType);
  };

  const applyStudentCount = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    setStudentCountInput(digits);
    const count = Number(digits);
    if (!Number.isInteger(count) || count < 1) {
      setStudents([]);
      return;
    }
    setStudents((current) => resizeStudentEntries(current, Math.min(count, 200)));
  };

  const updateStudent = (id: string, patch: Partial<Pick<StudentEntry, 'studentName' | 'registrationNo'>>) => {
    setStudents((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const submit = async () => {
    if (!school.trim()) return setError('Select the school.');
    if (programmeChoices.length > 0 && !programme.trim()) return setError('Select the programme.');
    if (!session.trim()) return setError('Select the academic session.');
    if (!code.trim() || !unit.trim()) return setError('Enter the unit code and unit name.');
    if (!bundleId.trim()) return setError('Enter the bundle ID.');
    if (!pdfBytesRef.current) return setError('Attach the combined PDF of the examination scripts.');
    if (!Number.isInteger(studentCount) || studentCount < 1) {
      return setError('Enter how many students are in this combined PDF.');
    }
    if (students.length !== studentCount) {
      return setError('Generate student forms by entering the number of students.');
    }

    const cleanedStudents = students.map((row) => ({
      studentName: row.studentName.trim(),
      registrationNo: row.registrationNo.trim(),
    }));
    if (cleanedStudents.some((row) => !row.studentName || !row.registrationNo)) {
      return setError(`Complete all student details (${completedStudents} of ${studentCount} done).`);
    }
    const registrations = cleanedStudents.map((row) => row.registrationNo.toLowerCase());
    if (new Set(registrations).size !== registrations.length) {
      return setError('Registration numbers must be unique within this archive.');
    }
    if (!rack.trim()) return setError('Select the rack for this school.');
    if (!shelf.trim()) return setError('Select the shelf.');
    if (!box.trim()) return setError('Enter the box.');
    if (!position.trim()) return setError('Enter the position of the bundle.');

    const firstStudent = cleanedStudents[0];
    // Keep existing booklet_scripts / archived_scripts shape; no page UI — index placeholders only.
    const studentScripts = cleanedStudents.map((row, index) => ({
      studentName: row.studentName,
      registrationNo: row.registrationNo,
      startPage: index + 1,
      endPage: index + 1,
    }));

    setError('');
    setSaving(true);
    setProgress('Saving examination details…');
    try {
      const saved = await addRecord({
        courseCode: code.trim(),
        courseName: unit.trim(),
        session,
        faculty: school,
        programme: programme.trim(),
        studentName: firstStudent.studentName,
        admissionNumber: firstStudent.registrationNo,
        bundleId: bundleId.trim(),
        shelf: shelf.trim(),
        rack: rack.trim(),
        box: box.trim(),
        pos: position.trim(),
        status: 'Digitized Copy',
        vaultStatus: 'Verified in Vault',
        scriptCount: studentCount,
      });
      setProgress(`Uploading ${pdfName || 'combined PDF'}…`);
      await upsertBookletFromArchive({
        archiveId: saved.id,
        unitCode: code.trim(),
        unitName: unit.trim(),
        programme: programme.trim(),
        school,
        academicSession: session,
        registrationNo: firstStudent.registrationNo,
        studentName: firstStudent.studentName,
        pdfBytes: pdfBytesRef.current,
        students: studentScripts,
        pageCount: studentCount,
      });
      await createNotification({
        audience: 'admin',
        title: 'Booklet archived',
        body: `${user?.name || 'Examination Officer'} archived ${code.trim()} · ${unit.trim()} (${studentCount} script${studentCount === 1 ? '' : 's'}, bundle ${bundleId.trim()}).`,
        skipAdminMirror: true,
      });
      onDone();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The booklet could not be archived.');
    } finally {
      setSaving(false);
      setProgress('');
    }
  };

  const options =
    picker === 'school'
      ? schoolChoices
      : picker === 'programme'
        ? programmeChoices
        : picker === 'session'
          ? sessions
          : picker === 'rack'
            ? rackChoices
            : picker === 'shelf'
              ? shelfChoices
              : [];

  return (
    <View style={[styles.stage, { backgroundColor: palette.page }]}>
      <KeyboardScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <MaterialCommunityIcons name="folder-open" size={28} color={tokens.primary} />
          <View style={styles.heroCopy}>
            <Text style={[styles.title, { color: palette.ink }]}>Archive Examination Booklet</Text>
            <Text style={[styles.subtitle, { color: palette.muted }]}>
              Upload and archive examination records with physical location
            </Text>
          </View>
        </View>

        <Section
          palette={palette}
          icon="book-open-variant"
          title="Examination Details"
          iconBg="#1E3A8A"
          iconFg="#DBEAFE"
        >
          <Field label="School" required palette={palette}>
            <Select
              palette={palette}
              icon={FIELD_ICON.school}
              value={school}
              placeholder="Select school"
              onPress={() => setPicker('school')}
            />
          </Field>
          <Field label="Programme" required={programmeChoices.length > 0} palette={palette}>
            <Select
              palette={palette}
              icon={FIELD_ICON.programme}
              value={programme}
              placeholder={
                !school
                  ? 'Select a school first'
                  : programmeChoices.length === 0
                    ? 'No programmes listed for this school'
                    : 'Select programme'
              }
              onPress={() => {
                if (!school || programmeChoices.length === 0) return;
                setPicker('programme');
              }}
            />
          </Field>
          <Field label="Academic Session" required palette={palette}>
            <Select
              palette={palette}
              icon={FIELD_ICON.session}
              value={session}
              placeholder="Select academic session"
              onPress={() => setPicker('session')}
            />
          </Field>
          <View style={styles.split}>
            <Field label="Unit Code" required palette={palette}>
              <IconInput
                palette={palette}
                icon={FIELD_ICON.unitCode}
                value={code}
                onChangeText={setCode}
                placeholder="ACC101"
                autoCapitalize="characters"
              />
            </Field>
            <Field label="Unit Name" required palette={palette}>
              <IconInput
                palette={palette}
                icon={FIELD_ICON.unitName}
                value={unit}
                onChangeText={setUnit}
                placeholder="Accounting"
              />
            </Field>
          </View>
          <Field label="Bundle ID" required palette={palette}>
            <IconInput
              palette={palette}
              icon={FIELD_ICON.bundle}
              value={bundleId}
              onChangeText={setBundleId}
              placeholder="e.g. BND-2026-014"
              autoCapitalize="characters"
            />
          </Field>
        </Section>

        <Section
          palette={palette}
          icon="cloud-upload-outline"
          title="Upload Combined PDF"
          iconBg="#0F766E"
          iconFg="#CCFBF1"
        >
          <TouchableOpacity
            style={[styles.uploadZone, { backgroundColor: palette.field, borderColor: palette.line }]}
            onPress={() => void choosePdf()}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="cloud-upload-outline" size={36} color={palette.muted} />
            <Text style={[styles.uploadText, { color: palette.ink }]}>Tap to select PDF file</Text>
            <Text style={[styles.uploadHint, { color: palette.muted }]}>
              (Combined PDF with multiple students)
            </Text>
          </TouchableOpacity>

          {pdfName ? (
            <View style={[styles.fileRow, { backgroundColor: palette.field, borderColor: palette.line }]}>
              <MaterialCommunityIcons name="file-pdf-box" size={28} color={tokens.error} />
              <View style={styles.fileCopy}>
                <Text style={[styles.fileName, { color: palette.ink }]} numberOfLines={1}>
                  {pdfName}
                </Text>
                <Text style={[styles.fileSize, { color: palette.muted }]}>
                  {pdfSize ? `${(pdfSize / (1024 * 1024)).toFixed(1)} MB` : 'PDF attached'}
                </Text>
              </View>
              <TouchableOpacity onPress={clearPdf} hitSlop={10} accessibilityLabel="Remove PDF">
                <Feather name="x" size={18} color={palette.muted} />
              </TouchableOpacity>
            </View>
          ) : null}
        </Section>

        <Section
          palette={palette}
          icon="account-group-outline"
          title="Student Details"
          iconBg="#5B21B6"
          iconFg="#EDE9FE"
          titleColor={palette.ink}
        >
          {!hasPdf ? (
            <Text style={[styles.studentHint, { color: palette.muted }]}>
              Upload the combined PDF first, then enter how many students it contains.
            </Text>
          ) : (
            <>
              <Field label="Number of students / booklets in this PDF" palette={palette}>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: palette.field, borderColor: palette.line, color: palette.ink },
                  ]}
                  value={studentCountInput}
                  onChangeText={applyStudentCount}
                  placeholder="e.g. 20"
                  keyboardType="number-pad"
                  placeholderTextColor={palette.muted}
                />
              </Field>

              {students.length > 0 ? (
                <>
                  <View style={[styles.studentProgressRow, { backgroundColor: palette.soft }]}>
                    <Text style={[styles.studentProgressText, { color: palette.ink }]}>
                      {completedStudents} of {students.length} students
                    </Text>
                    <Text style={[styles.studentProgressHint, { color: palette.muted }]}>
                      {allStudentsComplete ? 'All complete' : 'Fill every name and registration number'}
                    </Text>
                  </View>

                  {students.map((row, index) => (
                    <View
                      key={row.id}
                      style={[styles.studentCard, { backgroundColor: palette.field, borderColor: palette.line }]}
                    >
                      <View style={styles.studentCardHeader}>
                        <Text style={[styles.studentCardTitle, { color: palette.ink }]}>Student {index + 1}</Text>
                        {isStudentComplete(row) ? (
                          <Feather name="check-circle" size={16} color={tokens.tertiaryGreen} />
                        ) : null}
                      </View>
                      <Field label="Student Full Name" palette={palette}>
                        <IconInput
                          palette={palette}
                          icon={FIELD_ICON.student}
                          value={row.studentName}
                          onChangeText={(text) => updateStudent(row.id, { studentName: text })}
                          placeholder="Amina Hassan"
                        />
                      </Field>
                      <Field label="Student Registration Number" palette={palette}>
                        <IconInput
                          palette={palette}
                          icon={FIELD_ICON.reg}
                          value={row.registrationNo}
                          onChangeText={(text) => updateStudent(row.id, { registrationNo: text })}
                          placeholder="REG12345"
                          autoCapitalize="characters"
                        />
                      </Field>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={[styles.studentHint, { color: palette.muted }]}>
                  Enter the number of students to generate entry forms.
                </Text>
              )}
            </>
          )}
        </Section>

        <Section
          palette={palette}
          icon="map-marker-outline"
          title="Physical Storage Location"
          iconBg="#9A3412"
          iconFg="#FFEDD5"
        >
          <Field label="Rack" required palette={palette}>
            <Select
              palette={palette}
              icon={FIELD_ICON.rack}
              value={rack}
              placeholder={school ? (rackChoices.length ? 'Select rack' : 'No racks for this school') : 'Select a school first'}
              onPress={() => {
                if (!school || rackChoices.length === 0) return;
                setPicker('rack');
              }}
            />
          </Field>
          <Field label="Shelf" required palette={palette}>
            <Select
              palette={palette}
              icon={FIELD_ICON.shelf}
              value={shelf}
              placeholder={rack ? 'Select shelf' : 'Select a rack first'}
              onPress={() => {
                if (!rack) return;
                setPicker('shelf');
              }}
            />
          </Field>
          <View style={styles.split}>
            <Field label="Box" required palette={palette}>
              <IconInput
                palette={palette}
                icon={FIELD_ICON.box}
                value={box}
                onChangeText={setBox}
                placeholder="Box number"
              />
            </Field>
            <Field label="Position of Bundle" required palette={palette}>
              <IconInput
                palette={palette}
                icon={FIELD_ICON.position}
                value={position}
                onChangeText={setPosition}
                placeholder="Position"
              />
            </Field>
          </View>
        </Section>

        {progress ? <Text style={styles.progress}>{progress}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.archiveBtn,
            (saving || !hasPdf || !allStudentsComplete) && styles.archiveBtnDisabled,
          ]}
          onPress={() => void submit()}
          disabled={saving || !hasPdf || !allStudentsComplete}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="archive" size={20} color={tokens.onPrimary} />
          <Text style={styles.archiveBtnText}>
            {saving
              ? progress || 'Saving…'
              : !hasPdf
                ? 'Upload PDF to continue'
                : !allStudentsComplete
                  ? `Complete students (${completedStudents}/${Math.max(students.length, 0)})`
                  : 'Archive Record'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelLink} onPress={onClose} disabled={saving}>
          <Text style={[styles.cancelLinkText, { color: palette.muted }]}>Cancel</Text>
        </TouchableOpacity>
      </KeyboardScrollView>

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPicker(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: palette.card }]}>
            <Text style={[styles.sheetTitle, { color: palette.ink }]}>
              {picker === 'school'
                ? 'School'
                : picker === 'programme'
                  ? 'Programme'
                  : picker === 'session'
                    ? 'Academic Session'
                    : picker === 'rack'
                      ? 'Rack'
                      : 'Shelf'}
            </Text>
            <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
              {options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.option, { borderTopColor: palette.line }]}
                  onPress={() => {
                    if (picker === 'school') {
                      setSchool(option);
                      const nextProgrammes = programmesForSchool(option, programmesBySchool);
                      setProgramme((current) => (nextProgrammes.includes(current) ? current : ''));
                      const nextRacks = racksForSchool(option);
                      setRack((current) => (nextRacks.includes(current) ? current : ''));
                      setShelf('');
                    } else if (picker === 'programme') setProgramme(option);
                    else if (picker === 'session') setSession(option);
                    else if (picker === 'rack') {
                      setRack(option);
                      setShelf((current) => (shelfChoices.includes(current) ? current : ''));
                    } else if (picker === 'shelf') setShelf(option);
                    setPicker(null);
                  }}
                >
                  <Text style={[styles.optionText, { color: palette.ink }]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

function Section({
  icon,
  title,
  children,
  palette,
  iconBg = '#0F2744',
  iconFg = '#93C5FD',
  titleColor = tokens.primary,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  children: React.ReactNode;
  palette: Palette;
  iconBg?: string;
  iconFg?: string;
  titleColor?: string;
}) {
  return (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, { backgroundColor: palette.soft }]}>
        <View style={[styles.sectionIconWell, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons name={icon} size={22} color={iconFg} />
        </View>
        <Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>
      </View>
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.line }]}>
        {children}
      </View>
    </View>
  );
}

function Field({
  label,
  children,
  palette,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  palette: Palette;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: palette.ink }]}>{label}</Text>
      {children}
    </View>
  );
}

function FieldIcon({
  icon,
}: {
  icon: { name: IconName; bg: string; fg: string };
}) {
  return (
    <View style={[styles.fieldIconWell, { backgroundColor: icon.bg }]}>
      <MaterialCommunityIcons name={icon.name} size={22} color={icon.fg} />
    </View>
  );
}

function IconInput({
  icon,
  value,
  onChangeText,
  placeholder,
  autoCapitalize,
  palette,
}: {
  icon: { name: IconName; bg: string; fg: string };
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  palette: Palette;
}) {
  return (
    <View style={[styles.iconControl, { backgroundColor: palette.field, borderColor: palette.line }]}>
      <FieldIcon icon={icon} />
      <TextInput
        style={[styles.iconInput, { color: palette.ink }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        autoCapitalize={autoCapitalize}
        underlineColorAndroid="transparent"
      />
    </View>
  );
}

function Select({
  value,
  placeholder,
  onPress,
  compact,
  icon,
  palette,
}: {
  value: string;
  placeholder: string;
  onPress: () => void;
  compact?: boolean;
  icon?: { name: IconName; bg: string; fg: string };
  palette: Palette;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.select,
        { backgroundColor: palette.field, borderColor: palette.line },
        compact && styles.compactSelect,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon ? <FieldIcon icon={icon} /> : null}
      <Text
        style={[styles.selectText, { color: value ? palette.ink : palette.muted }]}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
      <Feather name="chevron-down" size={16} color={palette.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: tokens.background },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 28 },
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  heroCopy: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: tokens.onSurface },
  subtitle: { marginTop: 4, fontSize: 13, lineHeight: 18, color: tokens.secondary },
  section: { marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: tokens.surfaceContainer,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  sectionIconWell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: tokens.primary },
  card: {
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
  },
  split: { flexDirection: 'row', gap: 10 },
  locationRow: { flexDirection: 'row', gap: 8 },
  studentHint: {
    fontSize: 12,
    lineHeight: 17,
    color: tokens.onSurfaceVariant,
    marginBottom: 10,
  },
  studentProgressRow: {
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    backgroundColor: tokens.surfaceContainer,
    gap: 2,
  },
  studentProgressText: { fontSize: 13, fontWeight: '800', color: tokens.onSurface },
  studentProgressHint: { fontSize: 11, color: tokens.onSurfaceVariant, fontWeight: '600' },
  studentCard: {
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: 10,
    backgroundColor: tokens.surfaceContainerLow,
  },
  studentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  studentCardTitle: { fontSize: 13, fontWeight: '800', color: tokens.onSurface },
  field: { flex: 1, marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: tokens.onSurface, marginBottom: 6 },
  input: {
    height: 46,
    borderRadius: borderRadius.md,
    backgroundColor: tokens.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    paddingHorizontal: 12,
    fontSize: 14,
    color: tokens.onSurface,
  },
  compactInput: { paddingHorizontal: 8, fontSize: 13 },
  fieldIconWell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconControl: {
    minHeight: 48,
    borderRadius: borderRadius.md,
    backgroundColor: tokens.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: tokens.onSurface,
    paddingVertical: 10,
  },
  select: {
    minHeight: 48,
    borderRadius: borderRadius.md,
    backgroundColor: tokens.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactSelect: { paddingHorizontal: 8, minHeight: 46 },
  selectText: { flex: 1, fontSize: 14, fontWeight: '600', color: tokens.onSurface },
  selectPlaceholder: { color: tokens.placeholder, fontWeight: '500' },
  uploadZone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: tokens.secondary,
    borderRadius: borderRadius.lg,
    backgroundColor: tokens.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  uploadText: { fontSize: 14, fontWeight: '700', color: tokens.primary, textAlign: 'center' },
  uploadHint: { fontSize: 12, color: tokens.onSurfaceVariant, textAlign: 'center' },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: tokens.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  fileCopy: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: '700', color: tokens.onSurface },
  fileSize: { marginTop: 2, fontSize: 12, color: tokens.onSurfaceVariant },
  progress: { color: tokens.primary, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  error: { color: tokens.error, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  archiveBtn: {
    height: control.inputHeight,
    borderRadius: borderRadius.button,
    backgroundColor: tokens.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  archiveBtnDisabled: { opacity: 0.7 },
  archiveBtnText: { color: tokens.onPrimary, fontWeight: '800', fontSize: 15 },
  cancelLink: { alignItems: 'center', paddingVertical: 14 },
  cancelLinkText: { color: tokens.onSurfaceVariant, fontWeight: '700', fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: tokens.surfaceContainerLowest,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 28,
    maxHeight: '70%',
  },
  sheetList: { flexGrow: 0 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: tokens.onSurface, marginBottom: 8 },
  option: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: tokens.outlineVariant },
  optionText: { fontSize: 15, fontWeight: '600', color: tokens.onSurface },
});
