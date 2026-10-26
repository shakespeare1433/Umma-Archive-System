import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ALL_PROGRAMMES, ALL_SCHOOLS } from '../data/catalog';
import { getSupabase } from '../lib/supabase';
import {
  ALL_SESSIONS,
  Booklet,
  BookletDownloadAction,
  BookletSort,
  SearchFilterState,
} from '../types';
import {
  BOOKLET_BUCKET,
  BOOKLET_COPY,
  BOOKLET_PAGE_SIZE,
  BOOKLET_SIGNED_TTL_SEC,
} from '../constants/booklets';

interface BookletRow {
  id: string;
  unit_code: string;
  unit_name: string;
  programme: string;
  school: string;
  academic_session: string;
  registration_no: string;
  student_name: string;
  pdf_path: string | null;
  page_count: number | null;
  digitised: boolean;
  uploaded_by: string | null;
  archive_id: string | null;
  created_at: string;
}

export interface BookletSearchPage {
  rows: Booklet[];
  total: number;
}

export function hasActiveBookletFilter(filter: SearchFilterState): boolean {
  return Boolean(
    (filter.faculty && filter.faculty !== ALL_SCHOOLS) ||
      (filter.programme && filter.programme !== ALL_PROGRAMMES) ||
      (filter.session && filter.session !== ALL_SESSIONS) ||
      filter.unitCode.trim() ||
      filter.unitName.trim() ||
      filter.studentName.trim() ||
      filter.admissionNumber.trim()
  );
}

export function bookletFileName(booklet: Booklet): string {
  const unit = sanitiseSegment(booklet.unitCode) || 'unit';
  const reg = sanitiseSegment(booklet.registrationNo) || 'booklet';
  return `${unit}_${reg}.pdf`;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return String(error ?? '');
}

export function friendlyBookletError(error: unknown): string {
  const message = readErrorMessage(error);
  const lower = message.toLowerCase();
  if (!message || lower.includes('network') || lower.includes('failed to fetch') || lower.includes('internet')) {
    return BOOKLET_COPY.offline;
  }
  if (lower.includes('object not found') || lower.includes('not found') || lower.includes('no such file')) {
    return BOOKLET_COPY.missingFile;
  }
  if (
    lower.includes('permission') ||
    lower.includes('not allowed') ||
    lower.includes('row-level') ||
    lower.includes('unauthorized') ||
    lower.includes('jwt')
  ) {
    return BOOKLET_COPY.permissionDenied;
  }
  return message || BOOKLET_COPY.genericError;
}

function sanitiseSegment(value: string): string {
  return value.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '');
}

function fromRow(row: BookletRow): Booklet {
  return {
    id: row.id,
    unitCode: row.unit_code,
    unitName: row.unit_name,
    programme: row.programme,
    school: row.school,
    academicSession: row.academic_session,
    registrationNo: row.registration_no,
    studentName: row.student_name,
    pdfPath: row.pdf_path,
    pageCount: row.page_count,
    digitised: row.digitised,
    uploadedBy: row.uploaded_by,
    archiveId: row.archive_id,
    createdAt: row.created_at,
  };
}

export async function searchBooklets(
  filter: SearchFilterState,
  options: { page: number; pageSize?: number; sort: BookletSort }
): Promise<BookletSearchPage> {
  const pageSize = options.pageSize ?? BOOKLET_PAGE_SIZE;
  const from = options.page * pageSize;
  const to = from + pageSize - 1;

  let query = getSupabase().from('booklets').select('*', { count: 'exact' });

  if (filter.faculty && filter.faculty !== ALL_SCHOOLS) {
    query = query.eq('school', filter.faculty);
  }
  if (filter.programme && filter.programme !== ALL_PROGRAMMES) {
    query = query.ilike('programme', `%${filter.programme.trim()}%`);
  }
  if (filter.session && filter.session !== ALL_SESSIONS) {
    query = query.eq('academic_session', filter.session);
  }
  if (filter.unitCode.trim()) {
    query = query.ilike('unit_code', `%${filter.unitCode.trim()}%`);
  }
  if (filter.unitName.trim()) {
    query = query.ilike('unit_name', `%${filter.unitName.trim()}%`);
  }
  if (filter.studentName.trim()) {
    query = query.ilike('student_name', `%${filter.studentName.trim()}%`);
  }
  if (filter.admissionNumber.trim()) {
    query = query.ilike('registration_no', `%${filter.admissionNumber.trim()}%`);
  }

  if (options.sort === 'unit_code') {
    query = query.order('unit_code', { ascending: true });
  } else if (options.sort === 'session') {
    query = query.order('academic_session', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(friendlyBookletError(error));
  return {
    rows: ((data ?? []) as BookletRow[]).map(fromRow),
    total: count ?? 0,
  };
}

export async function listOfficerUploads(): Promise<Booklet[]> {
  const { data, error } = await getSupabase()
    .from('booklets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(friendlyBookletError(error));
  return ((data ?? []) as BookletRow[]).map(fromRow);
}

export async function countDigitisedBooklets(): Promise<number> {
  const { count, error } = await getSupabase()
    .from('booklets')
    .select('id', { count: 'exact', head: true })
    .or('digitised.eq.true,pdf_path.not.is.null');
  if (error) return 0;
  return count ?? 0;
}

export async function getBooklet(id: string): Promise<Booklet | null> {
  const { data, error } = await getSupabase().from('booklets').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(friendlyBookletError(error));
  if (!data) return null;
  return fromRow(data as BookletRow);
}

export async function createBookletSignedUrl(pdfPath: string, retried = false): Promise<string> {
  const { data, error } = await getSupabase()
    .storage.from(BOOKLET_BUCKET)
    .createSignedUrl(pdfPath, BOOKLET_SIGNED_TTL_SEC);
  if (error || !data?.signedUrl) {
    if (!retried) return createBookletSignedUrl(pdfPath, true);
    throw new Error(friendlyBookletError(error ?? new Error(BOOKLET_COPY.missingFile)));
  }
  return data.signedUrl;
}

export async function logBookletAction(bookletId: string, action: BookletDownloadAction): Promise<void> {
  const { data: auth } = await getSupabase().auth.getUser();
  const lecturerId = auth.user?.id;
  if (!lecturerId) return;
  const { error } = await getSupabase().from('booklet_downloads').insert({
    booklet_id: bookletId,
    lecturer_id: lecturerId,
    action,
  });
  if (error) {
    // Audit failure must not block viewing or saving the PDF.
  }
}

interface DownloadAuditRow {
  id: string;
  booklet_id: string;
  lecturer_id: string;
  action: BookletDownloadAction;
  created_at: string;
  booklets: { unit_code: string; registration_no: string } | { unit_code: string; registration_no: string }[] | null;
}

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function listRecentDownloads(limit = 40): Promise<
  Array<{
    id: string;
    bookletId: string;
    lecturerId: string;
    action: BookletDownloadAction;
    createdAt: string;
    unitCode: string;
    registrationNo: string;
  }>
> {
  const { data, error } = await getSupabase()
    .from('booklet_downloads')
    .select('id, booklet_id, lecturer_id, action, created_at, booklets(unit_code, registration_no)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(friendlyBookletError(error));
  return ((data ?? []) as DownloadAuditRow[]).map((row) => {
    const booklet = firstRelated(row.booklets);
    return {
      id: row.id,
      bookletId: row.booklet_id,
      lecturerId: row.lecturer_id,
      action: row.action,
      createdAt: row.created_at,
      unitCode: booklet?.unit_code ?? '',
      registrationNo: booklet?.registration_no ?? '',
    };
  });
}

export async function downloadBookletPdf(
  booklet: Booklet,
  onProgress?: (ratio: number) => void
): Promise<string> {
  if (!booklet.digitised || !booklet.pdfPath) {
    throw new Error(BOOKLET_COPY.missingFile);
  }

  const directory = FileSystem.documentDirectory;
  if (!directory) throw new Error(BOOKLET_COPY.genericError);

  const fileName = bookletFileName(booklet);
  const fileUri = `${directory}${fileName}`;

  const attempt = async (retried: boolean) => {
    const signedUrl = await createBookletSignedUrl(booklet.pdfPath as string);
    const resumable = FileSystem.createDownloadResumable(
      signedUrl,
      fileUri,
      {},
      (progress) => {
        if (!progress.totalBytesExpectedToWrite) return;
        onProgress?.(progress.totalBytesWritten / progress.totalBytesExpectedToWrite);
      }
    );
    const result = await resumable.downloadAsync();
    if (!result?.uri) {
      throw new Error(BOOKLET_COPY.genericError);
    }
    if (result.status >= 400) {
      if (!retried && (result.status === 400 || result.status === 401 || result.status === 403)) {
        return attempt(true);
      }
      if (result.status === 404) throw new Error(BOOKLET_COPY.missingFile);
      throw new Error(BOOKLET_COPY.genericError);
    }
    return result.uri;
  };

  const uri = await attempt(false);
  await logBookletAction(booklet.id, 'download');
  return uri;
}

export async function shareBookletFile(fileUri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error(BOOKLET_COPY.shareUnavailable);
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: BOOKLET_COPY.downloadPdf,
  });
}

export function bookletObjectPath(input: {
  academicSession: string;
  unitCode: string;
  registrationNo: string;
}): string {
  const session = sanitiseSegment(input.academicSession) || 'session';
  const unit = sanitiseSegment(input.unitCode) || 'unit';
  const reg = sanitiseSegment(input.registrationNo) || 'booklet';
  return `${session}/${unit}/${reg}.pdf`;
}

export function bytesFromBase64(base64: string): Uint8Array {
  const clean = base64.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function upsertBookletFromArchive(input: {
  archiveId: string;
  unitCode: string;
  unitName: string;
  programme: string;
  school: string;
  academicSession: string;
  registrationNo: string;
  studentName: string;
  pdfBytes?: Uint8Array;
}): Promise<void> {
  const { data: auth } = await getSupabase().auth.getUser();
  let pdfPath: string | null = null;
  if (input.pdfBytes) {
    pdfPath = bookletObjectPath({
      academicSession: input.academicSession,
      unitCode: input.unitCode,
      registrationNo: input.registrationNo,
    });
    const { error } = await getSupabase().storage.from(BOOKLET_BUCKET).upload(pdfPath, input.pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (error) throw new Error(friendlyBookletError(error));
  }

  const row: Record<string, string | boolean | number | null> = {
    unit_code: input.unitCode,
    unit_name: input.unitName,
    programme: input.programme,
    school: input.school,
    academic_session: input.academicSession,
    registration_no: input.registrationNo,
    student_name: input.studentName,
    archive_id: input.archiveId,
    uploaded_by: auth.user?.id ?? null,
    digitised: Boolean(pdfPath),
  };
  if (pdfPath) {
    row.pdf_path = pdfPath;
  }

  const existing = await getSupabase()
    .from('booklets')
    .select('id')
    .eq('archive_id', input.archiveId)
    .maybeSingle();
  if (existing.error) throw new Error(friendlyBookletError(existing.error));
  if (existing.data?.id) {
    const { error } = await getSupabase().from('booklets').update(row).eq('id', existing.data.id);
    if (error) throw new Error(friendlyBookletError(error));
    return;
  }
  const { error } = await getSupabase().from('booklets').upsert(row, { onConflict: 'archive_id' });
  if (error) throw new Error(friendlyBookletError(error));
}
