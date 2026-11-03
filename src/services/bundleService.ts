import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ALL_PROGRAMMES, ALL_SCHOOLS, ALL_SEMESTERS, ALL_YEARS } from '../data/catalog';
import { getSupabase } from '../lib/supabase';
import { BundleBooklet, ExamBundle, SearchFilterState } from '../types';

export const BUNDLE_COVER_BUCKET = 'bundle-covers';
export const BUNDLE_QR_PREFIX = 'umma-archive://bundle/';
const COVER_SIGNED_TTL_SEC = 60 * 30;

interface BundleRow {
  id: string;
  bundle_code: string;
  qr_token: string;
  qr_active: boolean;
  school: string;
  programme: string;
  academic_year: string;
  semester: string;
  unit_code: string;
  unit_name: string;
  student_name: string;
  registration_no: string;
  store: string;
  shelf: string;
  rack: string;
  position?: string;
  slot?: string;
  created_at: string;
  booklet_count?: number | string;
}

interface BookletRow {
  id: string;
  bundle_id: string;
  student_name: string;
  registration_no: string;
  school: string;
  programme: string;
  academic_year: string;
  semester: string;
  unit_code: string;
  unit_name: string;
  cover_path: string | null;
  created_at: string;
}

function message(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const value = (error as { message: unknown }).message;
    if (typeof value === 'string') return value;
  }
  return String(error ?? 'Something went wrong. Please try again.');
}

export function friendlyBundleError(error: unknown): string {
  const text = message(error);
  const lower = text.toLowerCase();
  if (lower.includes('duplicate') || lower.includes('unique') || lower.includes('exam_bundles_code')) {
    return 'That bundle code is already in use. Choose a different code.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('internet')) {
    return 'No internet connection. Check your network and try again.';
  }
  if (lower.includes('permission') || lower.includes('row-level') || lower.includes('not allowed')) {
    return 'You do not have permission to open this bundle.';
  }
  return text || 'Something went wrong. Please try again.';
}

export function bundleQrPayload(token: string): string {
  return `${BUNDLE_QR_PREFIX}${token}`;
}

export function parseBundleQr(data: string): string | null {
  const trimmed = data.trim();
  if (trimmed.startsWith(BUNDLE_QR_PREFIX)) {
    return trimmed.slice(BUNDLE_QR_PREFIX.length).trim() || null;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function hasActiveBundleFilter(filter: SearchFilterState): boolean {
  return Boolean(
    (filter.faculty && filter.faculty !== ALL_SCHOOLS) ||
      (filter.programme && filter.programme !== ALL_PROGRAMMES) ||
      (filter.academicYear && filter.academicYear !== ALL_YEARS) ||
      (filter.semester && filter.semester !== ALL_SEMESTERS) ||
      filter.unitCode.trim() ||
      filter.unitName.trim() ||
      filter.bundleCode.trim() ||
      filter.studentName.trim() ||
      filter.admissionNumber.trim()
  );
}

export function storageLine(bundle: Pick<ExamBundle, 'store' | 'shelf' | 'rack' | 'position'>): string {
  return `${bundle.store} → ${bundle.shelf} → ${bundle.rack} → ${bundle.position}`;
}

function fromBundleRow(row: BundleRow, bookletCount = 0): ExamBundle {
  return {
    id: row.id,
    bundleCode: row.bundle_code,
    qrToken: row.qr_token,
    qrActive: row.qr_active,
    school: row.school,
    programme: row.programme,
    academicYear: row.academic_year,
    semester: row.semester,
    unitCode: row.unit_code,
    unitName: row.unit_name,
    studentName: row.student_name,
    registrationNo: row.registration_no,
    store: row.store,
    shelf: row.shelf,
    rack: row.rack,
    position: row.slot || row.position || '',
    bookletCount,
    createdAt: row.created_at,
  };
}

function fromBookletRow(row: BookletRow, coverUrl: string | null = null): BundleBooklet {
  return {
    id: row.id,
    bundleId: row.bundle_id,
    studentName: row.student_name,
    registrationNo: row.registration_no,
    school: row.school,
    programme: row.programme,
    academicYear: row.academic_year,
    semester: row.semester,
    unitCode: row.unit_code,
    unitName: row.unit_name,
    coverPath: row.cover_path,
    coverUrl,
    createdAt: row.created_at,
  };
}

async function countBooklets(bundleId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from('exam_bundle_booklets')
    .select('id', { count: 'exact', head: true })
    .eq('bundle_id', bundleId);
  if (error) throw new Error(friendlyBundleError(error));
  return count ?? 0;
}

export async function suggestBundleCode(academicYear: string): Promise<string> {
  const year = academicYear.replace('/', '') || new Date().getFullYear().toString();
  const { count } = await getSupabase().from('exam_bundles').select('id', { count: 'exact', head: true });
  const next = String((count ?? 0) + 1).padStart(3, '0');
  return `BNDL-${year}-${next}`;
}

export async function createExamBundle(input: {
  bundleCode: string;
  school: string;
  programme: string;
  academicYear: string;
  semester: string;
  unitCode: string;
  unitName: string;
  studentName?: string;
  registrationNo?: string;
  store: string;
  shelf: string;
  rack: string;
  position: string;
}): Promise<ExamBundle> {
  const { data: auth } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from('exam_bundles')
    .insert({
      bundle_code: input.bundleCode.trim(),
      school: input.school,
      programme: input.programme,
      academic_year: input.academicYear,
      semester: input.semester,
      unit_code: input.unitCode.trim(),
      unit_name: input.unitName.trim(),
      student_name: input.studentName?.trim() || '',
      registration_no: input.registrationNo?.trim() || '',
      store: input.store,
      shelf: input.shelf,
      rack: input.rack,
      position: input.position.trim(),
      archived_by: auth.user?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(friendlyBundleError(error));
  return fromBundleRow(data as BundleRow, 0);
}

export async function searchExamBundles(filter: SearchFilterState): Promise<ExamBundle[]> {
  const { data, error } = await getSupabase().rpc('search_exam_bundles', {
    p_school: filter.faculty && filter.faculty !== ALL_SCHOOLS ? filter.faculty : null,
    p_programme: filter.programme && filter.programme !== ALL_PROGRAMMES ? filter.programme : null,
    p_academic_year: filter.academicYear && filter.academicYear !== ALL_YEARS ? filter.academicYear : null,
    p_semester: filter.semester && filter.semester !== ALL_SEMESTERS ? filter.semester : null,
    p_unit_code: filter.unitCode.trim() || null,
    p_unit_name: filter.unitName.trim() || null,
    p_bundle_code: filter.bundleCode.trim() || null,
    p_student_name: filter.studentName.trim() || null,
    p_registration_no: filter.admissionNumber.trim() || null,
  });
  if (error) throw new Error(friendlyBundleError(error));
  return ((data ?? []) as BundleRow[]).map((row) =>
    fromBundleRow(row, Number(row.booklet_count ?? 0))
  );
}

export async function getExamBundle(id: string): Promise<ExamBundle | null> {
  const { data, error } = await getSupabase().from('exam_bundles').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(friendlyBundleError(error));
  if (!data) return null;
  const count = await countBooklets(id);
  return fromBundleRow(data as BundleRow, count);
}

export async function getExamBundleByQrToken(token: string): Promise<ExamBundle> {
  const { data, error } = await getSupabase()
    .from('exam_bundles')
    .select('*')
    .eq('qr_token', token)
    .maybeSingle();
  if (error) throw new Error(friendlyBundleError(error));
  if (!data) {
    throw new Error('This QR code does not match a known examination bundle.');
  }
  const row = data as BundleRow;
  if (!row.qr_active) {
    throw new Error('This bundle QR code is no longer active.');
  }
  const count = await countBooklets(row.id);
  return fromBundleRow(row, count);
}

async function signedCoverUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await getSupabase()
    .storage.from(BUNDLE_COVER_BUCKET)
    .createSignedUrl(path, COVER_SIGNED_TTL_SEC);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function listBundleBooklets(bundleId: string): Promise<BundleBooklet[]> {
  const { data, error } = await getSupabase()
    .from('exam_bundle_booklets')
    .select('*')
    .eq('bundle_id', bundleId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(friendlyBundleError(error));
  const rows = (data ?? []) as BookletRow[];
  return Promise.all(rows.map(async (row) => fromBookletRow(row, await signedCoverUrl(row.cover_path))));
}

export async function getBundleBooklet(id: string): Promise<BundleBooklet | null> {
  const { data, error } = await getSupabase().from('exam_bundle_booklets').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(friendlyBundleError(error));
  if (!data) return null;
  const row = data as BookletRow;
  return fromBookletRow(row, await signedCoverUrl(row.cover_path));
}

async function readLocalBytes(uri: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(uri);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 0) return buffer;
    }
  } catch {
    // Android content URIs often need the file API.
  }
  const encoded = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const binary = globalThis.atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function addBundleBooklet(input: {
  bundle: ExamBundle;
  studentName?: string;
  registrationNo?: string;
  coverUri?: string | null;
  coverMime?: string | null;
}): Promise<BundleBooklet> {
  const { data: auth } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from('exam_bundle_booklets')
    .insert({
      bundle_id: input.bundle.id,
      student_name: input.studentName?.trim() || '',
      registration_no: input.registrationNo?.trim() || '',
      school: input.bundle.school,
      programme: input.bundle.programme,
      academic_year: input.bundle.academicYear,
      semester: input.bundle.semester,
      unit_code: input.bundle.unitCode,
      unit_name: input.bundle.unitName,
      created_by: auth.user?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(friendlyBundleError(error));
  const row = data as BookletRow;
  if (!input.coverUri) return fromBookletRow(row, null);

  const mime = input.coverMime || 'image/jpeg';
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const path = `${input.bundle.id}/${row.id}.${ext}`;
  const bytes = await readLocalBytes(input.coverUri);
  const upload = await getSupabase().storage.from(BUNDLE_COVER_BUCKET).upload(path, bytes, {
    contentType: mime,
    upsert: true,
  });
  if (upload.error) throw new Error(friendlyBundleError(upload.error));
  const { error: patchError } = await getSupabase()
    .from('exam_bundle_booklets')
    .update({ cover_path: path })
    .eq('id', row.id);
  if (patchError) throw new Error(friendlyBundleError(patchError));
  return fromBookletRow({ ...row, cover_path: path }, await signedCoverUrl(path));
}

export function qrImageUrl(payload: string, size = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&ecc=M&margin=8&data=${encodeURIComponent(payload)}`;
}

export async function shareBundleQr(bundle: ExamBundle): Promise<void> {
  const payload = bundleQrPayload(bundle.qrToken);
  const destination = `${FileSystem.cacheDirectory || ''}bundle-${bundle.bundleCode.replace(/[^\w.-]+/g, '_')}.png`;
  const result = await FileSystem.downloadAsync(qrImageUrl(payload, 480), destination);
  if (result.status !== 200) throw new Error('The QR code could not be downloaded for sharing.');
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(result.uri, { mimeType: 'image/png', dialogTitle: `${bundle.bundleCode} QR code` });
}
