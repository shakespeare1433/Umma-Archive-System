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
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useVault } from '../../context/VaultContext';
import { ACADEMIC_SESSIONS, PROGRAMMES_BY_SCHOOL, programmesForSchool, SCHOOLS } from '../../data/catalog';
import { bytesFromBase64, upsertBookletFromArchive } from '../../services/bookletService';
import { loadProgrammesBySchool } from '../../services/catalogService';
import { borderRadius, colors as tokens, control, spacing } from '../../theme';
import { useCustody } from './custody';

const SHELVES = ['Shelf A', 'Shelf B', 'Shelf B-01', 'Shelf A-02'];
const RACKS = ['Rack 1', 'Rack 2', 'Rack 01', 'Rack 02', 'Rack 03'];
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const PENDING_PDF_NAME = 'officer-pending-booklet.pdf';
const PDF_OPEN_ERROR = 'The selected PDF could not be opened. Choose it again.';

function asPickedFile(value: unknown): File | null {
  if (value instanceof File) return value;
  if (Array.isArray(value) && value[0] instanceof File) return value[0];
  if (value && typeof value === 'object' && 'canceled' in value) {
    const picked = value as { canceled: boolean; result: unknown };
    if (picked.canceled) return null;
    if (picked.result instanceof File) return picked.result;
  }
  return null;
}

async function readPdfBytes(file: File): Promise<Uint8Array> {
  try {
    const bytes = await file.bytes();
    if (bytes.byteLength > 0) return bytes;
  } catch {
    // Android picker URIs are often readable by another File API method.
  }
  try {
    const buffer = await file.arrayBuffer();
    if (buffer.byteLength > 0) return new Uint8Array(buffer);
  } catch {
    // Keep trying.
  }
  try {
    const encoded = await file.base64();
    if (encoded) return bytesFromBase64(encoded);
  } catch {
    // Last native option is fetch against the picker URI.
  }
  const response = await fetch(file.uri);
  if (!response.ok) throw new Error(PDF_OPEN_ERROR);
  const buffer = await response.arrayBuffer();
  if (!buffer.byteLength) throw new Error(PDF_OPEN_ERROR);
  return new Uint8Array(buffer);
}

async function stageReadablePdf(source: File): Promise<{ file: File; bytes: Uint8Array }> {
  const dest = new File(Paths.cache, PENDING_PDF_NAME);
  try {
    if (dest.exists) dest.delete();
  } catch {
    // Overwrite below if the previous staged copy is still present.
  }
  try {
    await source.copy(dest, { overwrite: true });
    if (dest.exists) {
      return { file: dest, bytes: await readPdfBytes(dest) };
    }
  } catch {
    // Read the picker file in place when the cache copy is blocked.
  }
  return { file: source, bytes: await readPdfBytes(source) };
}

async function pickPdfSource(): Promise<{ file: File; name: string } | null> {
  try {
    const picked = await File.pickFileAsync({ mimeTypes: ['application/pdf'] });
    const file = asPickedFile(picked);
    if (picked && typeof picked === 'object' && 'canceled' in picked && (picked as { canceled: boolean }).canceled) {
      return null;
    }
    if (file) return { file, name: file.name || 'booklet.pdf' };
  } catch {
    // Older Expo Go builds only accept the positional picker signature.
  }
  try {
    const picked = await (File.pickFileAsync as (initialUri?: string, mimeType?: string) => Promise<unknown>)(
      undefined,
      'application/pdf'
    );
    const file = asPickedFile(picked);
    if (file) return { file, name: file.name || 'booklet.pdf' };
  } catch {
    // Fall back to the document picker.
  }
  const picked = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: false,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;
  return { file: new File(picked.assets[0].uri), name: picked.assets[0].name || 'booklet.pdf' };
}

const DEFAULTS = {
  school: '',
  session: '',
  programme: '',
  unit: '',
  code: '',
  studentName: '',
  admissionNumber: '',
  shelf: '',
  rack: '',
  box: '',
  position: '',
};

type PickerKind = 'school' | 'programme' | 'session' | 'shelf' | 'rack';

export const OfficerArchiveFormScreen: React.FC<{
  onClose: () => void;
  onDone: () => void;
}> = ({ onClose, onDone }) => {
  const { logBatch } = useCustody();
  const { addRecord } = useVault();
  const [school, setSchool] = useState(DEFAULTS.school);
  const [session, setSession] = useState(DEFAULTS.session);
  const [programme, setProgramme] = useState(DEFAULTS.programme);
  const [programmesBySchool, setProgrammesBySchool] = useState(PROGRAMMES_BY_SCHOOL);
  const [unit, setUnit] = useState(DEFAULTS.unit);
  const [code, setCode] = useState(DEFAULTS.code);
  const [studentName, setStudentName] = useState(DEFAULTS.studentName);
  const [admissionNumber, setAdmissionNumber] = useState(DEFAULTS.admissionNumber);
  const [shelf, setShelf] = useState(DEFAULTS.shelf);
  const [rack, setRack] = useState(DEFAULTS.rack);
  const [box, setBox] = useState(DEFAULTS.box);
  const [position, setPosition] = useState(DEFAULTS.position);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pdfName, setPdfName] = useState('');
  const [pdfUri, setPdfUri] = useState('');
  const [pdfIsPdf, setPdfIsPdf] = useState(false);
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const pdfBytesRef = useRef<Uint8Array | null>(null);
  const programmeChoices = useMemo(
    () => programmesForSchool(school, programmesBySchool),
    [school, programmesBySchool]
  );

  useEffect(() => {
    let cancelled = false;
    loadProgrammesBySchool()
      .then((next) => {
        if (!cancelled) setProgrammesBySchool(next);
      })
      .catch(() => {
        // Bundled school lists still drive the dropdowns if the catalog query fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reset = () => {
    setSchool(DEFAULTS.school);
    setProgramme(DEFAULTS.programme);
    setSession(DEFAULTS.session);
    setUnit(DEFAULTS.unit);
    setCode(DEFAULTS.code);
    setStudentName(DEFAULTS.studentName);
    setAdmissionNumber(DEFAULTS.admissionNumber);
    setShelf(DEFAULTS.shelf);
    setRack(DEFAULTS.rack);
    setBox(DEFAULTS.box);
    setPosition(DEFAULTS.position);
    setPdfName('');
    setPdfUri('');
    setPdfIsPdf(false);
    pdfBytesRef.current = null;
    setError('');
  };

  const clearPdf = () => {
    pdfBytesRef.current = null;
    setPdfName('');
    setPdfUri('');
    setPdfIsPdf(false);
  };

  const pickScannedPdf = async () => {
    try {
      const picked = await pickPdfSource();
      if (!picked) return;
      const staged = await stageReadablePdf(picked.file);
      if (staged.bytes.byteLength > MAX_PDF_BYTES) {
        clearPdf();
        setError('The scanned PDF must be 20 MB or smaller.');
        return;
      }
      pdfBytesRef.current = staged.bytes;
      setError('');
      setPdfName(picked.name || staged.file.name || 'booklet.pdf');
      setPdfUri(staged.file.uri);
      setPdfIsPdf(true);
    } catch (pickError) {
      clearPdf();
      setError(pickError instanceof Error ? pickError.message : PDF_OPEN_ERROR);
    }
  };

  const scanBooklet = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Allow camera access to scan a booklet.');
      return;
    }
    const captured = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (captured.canceled || !captured.assets?.[0]) return;
    pdfBytesRef.current = null;
    setError('Attach the scan as a PDF so lecturers can search it. Use Choose PDF.');
    setPdfName(captured.assets[0].fileName || 'scan.jpg');
    setPdfUri(captured.assets[0].uri);
    setPdfIsPdf(false);
  };

  const submit = async () => {
    const pdfBytes = pdfBytesRef.current;
    if (!pdfUri || !pdfIsPdf || !pdfBytes?.byteLength) {
      setError('Attach the scanned booklet PDF. Lecturers search from this file.');
      return;
    }
    if (!school.trim()) {
      setError('Select the school.');
      return;
    }
    if (programmeChoices.length > 0 && !programme.trim()) {
      setError('Select the programme.');
      return;
    }
    if (!unit.trim() || !code.trim()) {
      setError('Enter the unit name and unit code.');
      return;
    }
    if (!session.trim()) {
      setError('Select the academic session.');
      return;
    }
    if (!admissionNumber.trim()) {
      setError('Enter the registration number.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const saved = await addRecord({
        faculty: school,
        programme: programme.trim(),
        session,
        courseCode: code.trim(),
        courseName: unit.trim(),
        studentName: studentName.trim(),
        admissionNumber: admissionNumber.trim(),
        scriptCount: 1,
        shelf: shelf.trim() || 'Vault',
        rack: rack.trim() || '',
        box: box.trim() || '',
        pos: position.trim() || '',
        status: 'Original Booklet',
        vaultStatus: 'Verified in Vault',
        isRequested: false,
      });
      await upsertBookletFromArchive({
        archiveId: saved.id,
        unitCode: saved.courseCode,
        unitName: saved.courseName,
        programme: saved.programme ?? programme.trim(),
        school: saved.faculty,
        academicSession: saved.session,
        registrationNo: saved.admissionNumber,
        studentName: saved.studentName,
        pdfBytes,
      });
      logBatch({
        code: saved.courseCode,
        title: saved.courseName,
        scripts: 1,
        box: saved.box,
        shelf: saved.rack ? `${saved.shelf}, ${saved.rack}` : saved.shelf,
        archiveId: saved.id,
      });
      reset();
      onDone();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'The archive could not be saved.';
      const lower = message.toLowerCase();
      setError(
        lower.includes('isn\'t readable') || lower.includes('readasstringasync')
          ? 'The selected PDF could not be opened. Choose it again, then tap Archive booklet.'
          : message
      );
    } finally {
      setSaving(false);
    }
  };

  const options =
    picker === 'school'
      ? [...SCHOOLS]
      : picker === 'programme'
        ? programmeChoices
        : picker === 'session'
          ? [...ACADEMIC_SESSIONS]
          : picker === 'shelf'
            ? SHELVES
            : picker === 'rack'
              ? RACKS
              : [];

  return (
    <View style={styles.stage}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Archive booklet</Text>
        <Text style={styles.subtitle}>Upload the scan and enter the details lecturers will search by</Text>

        <View style={styles.card}>
          <StepHeader step={1} title="Scanned PDF" hint="Required" />
          <View style={styles.dropzone}>
            {pdfName ? (
              <>
                <MaterialCommunityIcons name="file-pdf-box" size={32} color={tokens.primary} />
                <Text style={styles.dropTitle} numberOfLines={2}>
                  {pdfName}
                </Text>
                <TouchableOpacity
                  onPress={clearPdf}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Remove scanned PDF"
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.dropIcon}>
                  <Feather name="file-text" size={22} color={tokens.secondary} />
                </View>
                <Text style={styles.dropTitle}>Attach the scanned booklet</Text>
                <Text style={styles.dropHint}>PDF, up to 20 MB</Text>
              </>
            )}
            <View style={styles.dropActions}>
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => {
                  void scanBooklet();
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Scan booklet"
              >
                <MaterialCommunityIcons name="line-scan" size={16} color={tokens.onPrimary} />
                <Text style={styles.scanBtnText}>Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chooseBtn}
                onPress={() => {
                  void pickScannedPdf();
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Choose PDF"
              >
                <Feather name="upload" size={16} color={tokens.primary} />
                <Text style={styles.chooseBtnText}>Choose PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <StepHeader step={2} title="Booklet details" hint="Used for lecturer search" />
          <Field label="School" required>
            <Select
              value={school}
              placeholder="Select school"
              onPress={() => setPicker('school')}
            />
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
          <View style={styles.split}>
            <Field label="Unit name" required>
              <TextInput
                style={styles.input}
                value={unit}
                onChangeText={setUnit}
                placeholder="Unit name"
                placeholderTextColor={tokens.placeholder}
              />
            </Field>
            <Field label="Unit code" required>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="Code"
                placeholderTextColor={tokens.placeholder}
                autoCapitalize="characters"
              />
            </Field>
          </View>
          <Field label="Academic session" required>
            <Select
              value={session}
              placeholder="Select session"
              onPress={() => setPicker('session')}
              icon="calendar"
            />
          </Field>
          <View style={styles.split}>
            <Field label="Student name">
              <TextInput
                style={styles.input}
                value={studentName}
                onChangeText={setStudentName}
                placeholder="Name"
                placeholderTextColor={tokens.placeholder}
              />
            </Field>
            <Field label="Registration no." required>
              <TextInput
                style={styles.input}
                value={admissionNumber}
                onChangeText={setAdmissionNumber}
                placeholder="REG/…"
                placeholderTextColor={tokens.placeholder}
                autoCapitalize="characters"
              />
            </Field>
          </View>
        </View>

        <View style={styles.card}>
          <StepHeader step={3} title="Storage location" hint="Optional · helps locate the paper booklet" />
          <View style={styles.split}>
            <Field label="Shelf">
              <Select value={shelf} placeholder="Shelf A" onPress={() => setPicker('shelf')} />
            </Field>
            <Field label="Rack">
              <Select value={rack} placeholder="Rack 2" onPress={() => setPicker('rack')} />
            </Field>
          </View>
          <View style={styles.split}>
            <Field label="Box number">
              <TextInput
                style={styles.input}
                value={box}
                onChangeText={setBox}
                placeholder="Box 4"
                placeholderTextColor={tokens.placeholder}
              />
            </Field>
            <Field label="Slot">
              <TextInput
                style={styles.input}
                value={position}
                onChangeText={setPosition}
                placeholder="15"
                placeholderTextColor={tokens.placeholder}
              />
            </Field>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.85}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.save} onPress={submit} disabled={saving} activeOpacity={0.85}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color={tokens.onPrimary} />
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Archive booklet'}</Text>
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
                    ? 'Academic session'
                    : picker === 'shelf'
                      ? 'Shelf'
                      : 'Rack'}
            </Text>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.option}
                onPress={() => {
                  if (picker === 'school') {
                    setSchool(option);
                    const nextProgrammes = programmesForSchool(option, programmesBySchool);
                    setProgramme((current) => (nextProgrammes.includes(current) ? current : ''));
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
  dropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: tokens.secondary,
    borderRadius: borderRadius.lg,
    backgroundColor: tokens.surfaceContainerLow,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  dropIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#C2410C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dropTitle: { fontSize: 14, fontWeight: '700', color: tokens.onSurface, textAlign: 'center' },
  dropHint: { marginTop: 4, fontSize: 12, color: tokens.onSurfaceVariant },
  removeText: { marginTop: 6, fontSize: 12, fontWeight: '700', color: tokens.secondary },
  dropActions: { flexDirection: 'row', gap: 10, marginTop: 14, width: '100%' },
  scanBtn: {
    flex: 1,
    height: 42,
    borderRadius: borderRadius.pill,
    backgroundColor: tokens.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  scanBtnText: { color: tokens.onPrimary, fontWeight: '700', fontSize: 14 },
  chooseBtn: {
    flex: 1,
    height: 42,
    borderRadius: borderRadius.pill,
    backgroundColor: tokens.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: tokens.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chooseBtnText: { color: tokens.primary, fontWeight: '700', fontSize: 14 },
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
  sheetTitle: { fontSize: 16, fontWeight: '800', color: tokens.onSurface, marginBottom: 8 },
  option: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: tokens.outlineVariant },
  optionText: { fontSize: 15, fontWeight: '600', color: tokens.onSurface },
});
