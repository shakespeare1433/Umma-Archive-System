import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useVault } from '../../context/VaultContext';
import {
  ACADEMIC_SESSIONS,
  PROGRAMMES_BY_SCHOOL,
  RACK_OPTIONS,
  SCHOOLS,
  programmesForSchool,
  shelvesForSchool,
} from '../../data/catalog';
import { loadAcademicSessions, loadProgrammesBySchool } from '../../services/catalogService';
import { bytesFromBase64, upsertBookletFromArchive } from '../../services/bookletService';
import { borderRadius, colors as tokens, control, spacing } from '../../theme';

type PickerKind = 'school' | 'programme' | 'session' | 'shelf' | 'rack';

interface StudentDraft {
  key: string;
  name: string;
  registrationNo: string;
  startPage: string;
  endPage: string;
}

function emptyStudent(start = 1): StudentDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    registrationNo: '',
    startPage: String(start),
    endPage: '',
  };
}

export const OfficerArchiveFormScreen: React.FC<{
  onClose: () => void;
  onDone: () => void;
}> = ({ onClose, onDone }) => {
  const { addRecord } = useVault();
  const [school, setSchool] = useState('');
  const [programme, setProgramme] = useState('');
  const [session, setSession] = useState('');
  const [unit, setUnit] = useState('');
  const [code, setCode] = useState('');
  const [students, setStudents] = useState<StudentDraft[]>([emptyStudent(1)]);
  const [shelf, setShelf] = useState('');
  const [rack, setRack] = useState('');
  const [box, setBox] = useState('');
  const [position, setPosition] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [pdfSize, setPdfSize] = useState(0);
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
  const shelfChoices = useMemo(() => shelvesForSchool(school), [school]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadProgrammesBySchool(), loadAcademicSessions()])
      .then(([nextProgrammes, nextSessions]) => {
        if (cancelled) return;
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

  const scanPdf = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Allow camera access to scan a booklet, or choose a PDF instead.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
    if (result.canceled || !result.assets?.[0]) return;
    setError('Camera captures a photo. Use Choose PDF to attach the scanned booklet file.');
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

  const submit = async () => {
    if (!pdfBytesRef.current) return setError('Attach the combined PDF of the examination scripts.');
    if (!school.trim()) return setError('Select the school.');
    if (programmeChoices.length > 0 && !programme.trim()) return setError('Select the programme.');
    if (!session.trim()) return setError('Select the academic session.');
    if (!unit.trim() || !code.trim()) return setError('Enter the unit name and unit code.');
    if (shelfChoices.length > 0 && !shelf.trim()) return setError('Select the shelf for this school.');
    const parsed = students.map((row, index) => {
      const startPage = Number(row.startPage);
      const endPage = Number(row.endPage);
      return {
        index,
        studentName: row.name.trim(),
        registrationNo: row.registrationNo.trim(),
        startPage,
        endPage,
      };
    });
    for (const row of parsed) {
      if (!row.studentName) return setError(`Enter the student name for script ${row.index + 1}.`);
      if (!row.registrationNo) return setError(`Enter the registration number for ${row.studentName}.`);
      if (!Number.isInteger(row.startPage) || row.startPage < 1) {
        return setError(`Enter a valid starting page for ${row.studentName}.`);
      }
      if (!Number.isInteger(row.endPage) || row.endPage < row.startPage) {
        return setError(`Ending page must be the same as or after the starting page for ${row.studentName}.`);
      }
    }
    const regs = parsed.map((row) => row.registrationNo.toLowerCase());
    if (new Set(regs).size !== regs.length) {
      return setError('Each registration number can appear only once in this combined PDF.');
    }
    setError('');
    setSaving(true);
    setProgress('Saving examination details…');
    try {
      const first = parsed[0];
      const saved = await addRecord({
        courseCode: code.trim(),
        courseName: unit.trim(),
        session,
        faculty: school,
        programme: programme.trim(),
        studentName: first.studentName,
        admissionNumber: first.registrationNo,
        shelf: shelf.trim() || 'Not recorded',
        rack: rack.trim() || 'Not recorded',
        box: box.trim() || 'Not recorded',
        pos: position.trim() || 'Not recorded',
        status: 'Digitized Copy',
        vaultStatus: 'Verified in Vault',
        scriptCount: parsed.length,
      });
      setProgress(`Uploading ${pdfName || 'combined PDF'}…`);
      await upsertBookletFromArchive({
        archiveId: saved.id,
        unitCode: code.trim(),
        unitName: unit.trim(),
        programme: programme.trim(),
        school,
        academicSession: session,
        registrationNo: first.registrationNo,
        studentName: first.studentName,
        pdfBytes: pdfBytesRef.current,
        students: parsed,
        pageCount: Math.max(...parsed.map((row) => row.endPage)),
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
      ? [...SCHOOLS]
      : picker === 'programme'
        ? programmeChoices
        : picker === 'session'
          ? sessions
          : picker === 'shelf'
            ? shelfChoices
            : picker === 'rack'
              ? [...RACK_OPTIONS]
              : [];

  return (
    <View style={styles.stage}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Archive booklet</Text>
        <Text style={styles.subtitle}>
          Upload one combined PDF for this sitting, then record each student’s page range and the shelf location.
        </Text>

        <View style={styles.card}>
          <StepHeader step={1} title="Combined PDF" hint="Required · one file for all students" />
          {pdfName ? (
            <Text style={styles.pdfName}>
              {pdfName}
              {pdfSize ? ` · ${(pdfSize / (1024 * 1024)).toFixed(1)} MB` : ''}
            </Text>
          ) : (
            <Text style={styles.hint}>No PDF attached yet. Choose the combined examination scripts file.</Text>
          )}
          <View style={styles.row}>
            <TouchableOpacity style={styles.ghost} onPress={() => void scanPdf()}>
              <Feather name="camera" size={16} color={tokens.primary} />
              <Text style={styles.ghostText}>Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghost} onPress={() => void choosePdf()}>
              <Feather name="file-text" size={16} color={tokens.primary} />
              <Text style={styles.ghostText}>Choose PDF</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <StepHeader step={2} title="Examination information" hint="Required" />
          <Field label="School" required>
            <Select value={school} placeholder="Select school" onPress={() => setPicker('school')} />
          </Field>
          <Field label="Programme" required={programmeChoices.length > 0}>
            <Select
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
              icon="book"
            />
          </Field>
          <Field label="Academic Session" required>
            <Select value={session} placeholder="Select academic session" onPress={() => setPicker('session')} icon="calendar" />
          </Field>
          <View style={styles.split}>
            <Field label="Unit name" required>
              <TextInput
                style={styles.input}
                value={unit}
                onChangeText={setUnit}
                placeholder="Introduction to Programming"
                placeholderTextColor={tokens.placeholder}
              />
            </Field>
            <Field label="Unit code" required>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="CS101"
                placeholderTextColor={tokens.placeholder}
                autoCapitalize="characters"
              />
            </Field>
          </View>
        </View>

        <View style={styles.card}>
          <StepHeader
            step={3}
            title="Student scripts"
            hint={`${students.length} script${students.length === 1 ? '' : 's'} in this PDF`}
          />
          {students.map((row, index) => (
            <View key={row.key} style={styles.studentCard}>
              <View style={styles.studentHead}>
                <Text style={styles.studentTitle}>Student {index + 1}</Text>
                {students.length > 1 ? (
                  <TouchableOpacity
                    onPress={() => setStudents((current) => current.filter((item) => item.key !== row.key))}
                  >
                    <Text style={styles.removeStudent}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Field label="Student Name" required>
                <TextInput
                  style={styles.input}
                  value={row.name}
                  onChangeText={(value) =>
                    setStudents((current) =>
                      current.map((item) => (item.key === row.key ? { ...item, name: value } : item))
                    )
                  }
                  placeholder="Student name"
                  placeholderTextColor={tokens.placeholder}
                />
              </Field>
              <Field label="Registration Number" required>
                <TextInput
                  style={styles.input}
                  value={row.registrationNo}
                  onChangeText={(value) =>
                    setStudents((current) =>
                      current.map((item) => (item.key === row.key ? { ...item, registrationNo: value } : item))
                    )
                  }
                  placeholder="CIT/00452/2021"
                  placeholderTextColor={tokens.placeholder}
                  autoCapitalize="characters"
                />
              </Field>
              <View style={styles.split}>
                <Field label="Starting page" required>
                  <TextInput
                    style={styles.input}
                    value={row.startPage}
                    onChangeText={(value) =>
                      setStudents((current) =>
                        current.map((item) => (item.key === row.key ? { ...item, startPage: value } : item))
                      )
                    }
                    placeholder="1"
                    keyboardType="number-pad"
                    placeholderTextColor={tokens.placeholder}
                  />
                </Field>
                <Field label="Ending page" required>
                  <TextInput
                    style={styles.input}
                    value={row.endPage}
                    onChangeText={(value) =>
                      setStudents((current) =>
                        current.map((item) => (item.key === row.key ? { ...item, endPage: value } : item))
                      )
                    }
                    placeholder="5"
                    keyboardType="number-pad"
                    placeholderTextColor={tokens.placeholder}
                  />
                </Field>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addStudent}
            onPress={() => {
              const last = students[students.length - 1];
              const nextStart = Number(last?.endPage);
              setStudents((current) => [...current, emptyStudent(Number.isInteger(nextStart) && nextStart > 0 ? nextStart + 1 : 1)]);
            }}
          >
            <Feather name="plus" size={16} color={tokens.primary} />
            <Text style={styles.addStudentText}>Add another student</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <StepHeader
            step={4}
            title="Physical shelf location"
            hint={shelfChoices.length ? 'Required for this school' : 'Shelf list not specified for this school'}
          />
          <View style={styles.split}>
            <Field label="Shelf" required={shelfChoices.length > 0}>
              <Select
                value={shelf}
                placeholder={shelfChoices.length ? 'Select shelf' : 'Not yet specified'}
                onPress={() => {
                  if (!shelfChoices.length) return;
                  setPicker('shelf');
                }}
              />
            </Field>
            <Field label="Rack">
              <Select value={rack} placeholder="Rack 1" onPress={() => setPicker('rack')} />
            </Field>
          </View>
          <View style={styles.split}>
            <Field label="Box">
              <TextInput
                style={styles.input}
                value={box}
                onChangeText={setBox}
                placeholder="Box 2"
                placeholderTextColor={tokens.placeholder}
              />
            </Field>
            <Field label="Position">
              <TextInput
                style={styles.input}
                value={position}
                onChangeText={setPosition}
                placeholder="Position 3"
                placeholderTextColor={tokens.placeholder}
              />
            </Field>
          </View>
        </View>

        {progress ? <Text style={styles.progress}>{progress}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.85}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.save} onPress={() => void submit()} disabled={saving} activeOpacity={0.85}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color={tokens.onPrimary} />
          <Text style={styles.saveText}>{saving ? progress || 'Saving…' : 'Archive booklet'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPicker(null)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {picker === 'school'
                ? 'School'
                : picker === 'programme'
                  ? 'Programme'
                    : picker === 'session'
                    ? 'Academic Session'
                    : picker === 'shelf'
                      ? 'Shelf'
                      : 'Rack'}
            </Text>
            <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
              {options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.option}
                  onPress={() => {
                    if (picker === 'school') {
                      setSchool(option);
                      const nextProgrammes = programmesForSchool(option, programmesBySchool);
                      setProgramme((current) => (nextProgrammes.includes(current) ? current : ''));
                      const nextShelves = shelvesForSchool(option);
                      setShelf((current) => (nextShelves.includes(current) ? current : ''));
                    } else if (picker === 'programme') setProgramme(option);
                    else if (picker === 'session') setSession(option);
                    else if (picker === 'shelf') setShelf(option);
                    else setRack(option);
                    setPicker(null);
                  }}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

function StepHeader({ step, title, hint }: { step: number; title: string; hint: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepNum}>{step}</Text>
      </View>
      <View style={styles.stepCopy}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepHint}>{hint}</Text>
      </View>
    </View>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function Select({
  value,
  placeholder,
  onPress,
  icon,
}: {
  value: string;
  placeholder: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Feather>['name'];
}) {
  return (
    <TouchableOpacity style={styles.select} onPress={onPress} activeOpacity={0.8}>
      {icon ? <Feather name={icon} size={16} color={tokens.secondary} /> : null}
      <Text style={[styles.selectText, !value && styles.selectPlaceholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <Feather name="chevron-down" size={16} color={tokens.outline} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: tokens.background },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: tokens.onSurface },
  subtitle: { marginTop: 4, marginBottom: 14, fontSize: 13, lineHeight: 18, color: tokens.onSurfaceVariant },
  card: {
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { color: tokens.onPrimary, fontSize: 13, fontWeight: '800' },
  stepCopy: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '800', color: tokens.onSurface },
  stepHint: { marginTop: 1, fontSize: 12, color: tokens.onSurfaceVariant },
  hint: { fontSize: 13, color: tokens.onSurfaceVariant, marginBottom: 10 },
  pdfName: { fontSize: 13, fontWeight: '700', color: tokens.primary, marginBottom: 10 },
  studentCard: {
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: 10,
  },
  studentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  studentTitle: { fontSize: 13, fontWeight: '800', color: tokens.onSurface },
  removeStudent: { fontSize: 12, fontWeight: '700', color: tokens.error },
  addStudent: {
    height: 42,
    borderRadius: borderRadius.pill,
    borderWidth: 1.5,
    borderColor: tokens.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addStudentText: { color: tokens.primary, fontWeight: '700' },
  progress: { color: tokens.primary, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  ghost: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.pill,
    borderWidth: 1.5,
    borderColor: tokens.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ghostText: { color: tokens.primary, fontWeight: '700' },
  split: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: tokens.onSurface, marginBottom: 6 },
  required: { color: tokens.error },
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
  select: {
    height: 46,
    borderRadius: borderRadius.md,
    backgroundColor: tokens.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectText: { flex: 1, fontSize: 14, fontWeight: '600', color: tokens.onSurface },
  selectPlaceholder: { color: tokens.placeholder, fontWeight: '500' },
  error: { color: tokens.error, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: tokens.background,
  },
  cancel: {
    flex: 1,
    height: control.inputHeight - 4,
    borderRadius: borderRadius.pill,
    backgroundColor: tokens.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: tokens.onSurfaceVariant, fontWeight: '700', fontSize: 15 },
  save: {
    flex: 1.6,
    height: control.inputHeight - 4,
    borderRadius: borderRadius.pill,
    backgroundColor: tokens.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveText: { color: tokens.onPrimary, fontWeight: '800', fontSize: 14 },
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
