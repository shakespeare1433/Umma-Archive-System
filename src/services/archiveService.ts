import { ArchivedExaminationRecord, CustodyStatus, ALL_SESSIONS } from '../types';
import { ALL_PROGRAMMES, ALL_SCHOOLS } from '../data/catalog';
import { getSupabase } from '../lib/supabase';

const TABLE = 'examination_archives';

interface ArchiveRow {
  id: string;
  school: string;
  programme: string;
  academic_session: string;
  unit_code: string;
  unit_name: string;
  student_name: string;
  admission_number: string;
  bundle_id?: string | null;
  script_count: number;
  shelf: string;
  rack: string;
  box: string;
  position: string;
  status: ArchivedExaminationRecord['status'];
  vault_status: ArchivedExaminationRecord['vaultStatus'];
  custody_status?: CustodyStatus | null;
  last_verified_at?: string | null;
  is_requested: boolean;
  archived_at: string;
}

export interface ArchiveSearchQuery {
  school?: string;
  programme?: string;
  session?: string;
  unitCode?: string;
  unitName?: string;
  studentName?: string;
  admissionNumber?: string;
  bundleId?: string;
  quickQuery?: string;
}

function fromRow(row: ArchiveRow): ArchivedExaminationRecord {
  return {
    id: row.id,
    faculty: row.school,
    programme: row.programme,
    session: row.academic_session,
    courseCode: row.unit_code,
    courseName: row.unit_name,
    studentName: row.student_name,
    admissionNumber: row.admission_number,
    bundleId: row.bundle_id || '',
    scriptCount: row.script_count,
    shelf: row.shelf,
    rack: row.rack,
    box: row.box,
    pos: row.position,
    status: row.status,
    vaultStatus: row.vault_status,
    custodyStatus: (row.custody_status as CustodyStatus) || 'On shelf',
    lastVerifiedAt: row.last_verified_at ?? null,
    isRequested: row.is_requested,
    archivedAt: row.archived_at,
  };
}

function toRow(record: Omit<ArchivedExaminationRecord, 'id'> & { id?: string }) {
  const row: Record<string, string | number | boolean | null> = {
    school: record.faculty,
    programme: record.programme ?? '',
    academic_session: record.session,
    unit_code: record.courseCode,
    unit_name: record.courseName,
    student_name: record.studentName,
    admission_number: record.admissionNumber,
    bundle_id: record.bundleId?.trim() || '',
    script_count: record.scriptCount,
    shelf: record.shelf,
    rack: record.rack,
    box: record.box,
    position: record.pos,
    status: record.status,
    vault_status: record.vaultStatus,
    is_requested: Boolean(record.isRequested),
  };
  if (record.custodyStatus) row.custody_status = record.custodyStatus;
  if (record.lastVerifiedAt !== undefined) row.last_verified_at = record.lastVerifiedAt;
  return row;
}

function message(error: { message: string }) {
  return error.message;
}

export async function listArchives(): Promise<ArchivedExaminationRecord[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .order('archived_at', { ascending: false });
  if (error) throw new Error(message(error));
  return ((data ?? []) as ArchiveRow[]).map(fromRow);
}

export async function searchArchives(query: ArchiveSearchQuery): Promise<ArchivedExaminationRecord[]> {
  const quick = query.quickQuery?.trim() || '';
  const bundleId = query.bundleId?.trim() || '';
  const { data, error } = await getSupabase().rpc('search_examination_archives', {
    p_school: query.school && query.school !== ALL_SCHOOLS ? query.school : null,
    p_programme: query.programme && query.programme !== ALL_PROGRAMMES ? query.programme : null,
    p_session: query.session && query.session !== ALL_SESSIONS ? query.session : null,
    p_unit_code: query.unitCode?.trim() || null,
    p_unit_name: query.unitName?.trim() || null,
    p_student_name: query.studentName?.trim() || null,
    p_admission_number: query.admissionNumber?.trim() || null,
    p_bundle_id: bundleId || null,
    // Free-text bar; Phase 2 SQL extends this to student name + registration too.
    p_query: quick || null,
  });

  // Older databases may not accept p_bundle_id yet — fall back to a direct filter.
  if (error) {
    if (!bundleId) throw new Error(message(error));
    return searchArchivesDirect(query);
  }

  const rows = ((data ?? []) as ArchiveRow[]).map(fromRow);
  if (!bundleId) return rows;
  const needle = bundleId.toLowerCase();
  return rows.filter((row) => (row.bundleId || '').toLowerCase().includes(needle));
}

async function searchArchivesDirect(query: ArchiveSearchQuery): Promise<ArchivedExaminationRecord[]> {
  let request = getSupabase().from(TABLE).select('*').order('archived_at', { ascending: false });

  if (query.school && query.school !== ALL_SCHOOLS) {
    request = request.eq('school', query.school);
  }
  if (query.programme && query.programme !== ALL_PROGRAMMES) {
    request = request.ilike('programme', `%${query.programme.trim()}%`);
  }
  if (query.session && query.session !== ALL_SESSIONS) {
    request = request.eq('academic_session', query.session);
  }
  if (query.unitCode?.trim()) {
    request = request.ilike('unit_code', `%${query.unitCode.trim()}%`);
  }
  if (query.unitName?.trim()) {
    request = request.ilike('unit_name', `%${query.unitName.trim()}%`);
  }
  if (query.studentName?.trim()) {
    request = request.ilike('student_name', `%${query.studentName.trim()}%`);
  }
  if (query.admissionNumber?.trim()) {
    request = request.ilike('admission_number', `%${query.admissionNumber.trim()}%`);
  }
  if (query.bundleId?.trim()) {
    request = request.ilike('bundle_id', `%${query.bundleId.trim()}%`);
  }
  if (query.quickQuery?.trim()) {
    const pattern = `%${query.quickQuery.trim()}%`;
    request = request.or(
      `unit_code.ilike.${pattern},unit_name.ilike.${pattern},programme.ilike.${pattern},student_name.ilike.${pattern},admission_number.ilike.${pattern},bundle_id.ilike.${pattern}`
    );
  }

  const { data, error } = await request;
  if (error) throw new Error(message(error));
  return ((data ?? []) as ArchiveRow[]).map(fromRow);
}

export async function insertArchive(
  record: Omit<ArchivedExaminationRecord, 'id'>
): Promise<ArchivedExaminationRecord> {
  const { data: auth } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert({ ...toRow(record), archived_by: auth.user?.id ?? null })
    .select('*')
    .single();
  if (error) throw new Error(message(error));
  return fromRow(data as ArchiveRow);
}

export async function updateArchive(record: ArchivedExaminationRecord): Promise<void> {
  const { error } = await getSupabase().from(TABLE).update(toRow(record)).eq('id', record.id);
  if (error) throw new Error(message(error));
}

export async function updateArchiveLocation(
  id: string,
  location: { shelf?: string; rack?: string; box?: string; position?: string }
): Promise<void> {
  const patch: Record<string, string> = {};
  if (location.shelf !== undefined) patch.shelf = location.shelf;
  if (location.rack !== undefined) patch.rack = location.rack;
  if (location.box !== undefined) patch.box = location.box;
  if (location.position !== undefined) patch.position = location.position;
  const { error } = await getSupabase().from(TABLE).update(patch).eq('id', id);
  if (error) throw new Error(message(error));
}

export async function updateArchiveLocationByIdentity(
  match: { unitCode: string; studentName?: string; admissionNumber?: string },
  location: { shelf?: string; rack?: string; box?: string; position?: string }
): Promise<void> {
  const patch: Record<string, string> = {};
  if (location.shelf !== undefined) patch.shelf = location.shelf;
  if (location.rack !== undefined) patch.rack = location.rack;
  if (location.box !== undefined) patch.box = location.box;
  if (location.position !== undefined) patch.position = location.position;
  if (!Object.keys(patch).length || !match.unitCode) return;

  let request = getSupabase().from(TABLE).update(patch).eq('unit_code', match.unitCode);
  if (match.studentName) request = request.eq('student_name', match.studentName);
  if (match.admissionNumber) request = request.eq('admission_number', match.admissionNumber);
  const { error } = await request;
  if (error) throw new Error(message(error));
}
