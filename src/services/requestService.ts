import { ActiveRetrievalRequest, RetrievalRequestKind, RetrievalType } from '../types';
import { getSupabase } from '../lib/supabase';

interface RequestRow {
  id: string;
  archive_id: string | null;
  bundle_id: string | null;
  requester_id: string;
  requester_name: string;
  request_type: RetrievalType;
  request_kind?: RetrievalRequestKind | null;
  course_code: string;
  course_title: string;
  academic_session: string;
  school: string;
  reg_or_cohort: string;
  student_name: string;
  current_step: number;
  total_steps: number;
  step_status_text: string | null;
  shelf_location: string | null;
  rack: string | null;
  box: string | null;
  position: string | null;
  ready_eta: string | null;
  custodian: string | null;
  officer_status: string | null;
  lecturer_note: string | null;
  officer_note: string | null;
  created_at: string;
  updated_at: string;
}

function fromRow(row: RequestRow): ActiveRetrievalRequest {
  return {
    id: row.id,
    recordId: row.archive_id ?? '',
    bundleId: row.bundle_id ?? undefined,
    requesterId: row.requester_id,
    requesterName: row.requester_name,
    type: row.request_type,
    requestKind:
      row.request_kind ||
      (row.archive_id ? 'PHYSICAL_BOOKLET' : 'MISSING_PDF_INVESTIGATION'),
    courseCode: row.course_code,
    courseTitle: row.course_title,
    session: row.academic_session,
    faculty: row.school,
    regOrCohort: row.reg_or_cohort,
    studentName: row.student_name,
    currentStep: row.current_step,
    totalSteps: row.total_steps,
    stepStatusText: row.step_status_text ?? undefined,
    shelfLocation: row.shelf_location ?? undefined,
    rack: row.rack ?? undefined,
    box: row.box ?? undefined,
    position: row.position ?? undefined,
    readyEta: row.ready_eta ?? undefined,
    custodian: row.custodian ?? undefined,
    officerStatus: row.officer_status ?? undefined,
    lecturerNote: row.lecturer_note ?? undefined,
    officerNote: row.officer_note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function message(error: { message: string }) {
  return error.message;
}

export async function listRequests(): Promise<ActiveRetrievalRequest[]> {
  const { data, error } = await getSupabase()
    .from('retrieval_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(message(error));
  return ((data ?? []) as RequestRow[]).map(fromRow);
}

export async function insertRequest(
  request: Omit<ActiveRetrievalRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ActiveRetrievalRequest> {
  const { data, error } = await getSupabase()
    .from('retrieval_requests')
    .insert({
      archive_id: request.recordId || null,
      bundle_id: request.bundleId || null,
      request_kind: request.requestKind || (request.recordId ? 'PHYSICAL_BOOKLET' : 'MISSING_PDF_INVESTIGATION'),
      lecturer_note: request.lecturerNote ?? null,
      officer_note: request.officerNote ?? null,
      requester_id: request.requesterId,
      requester_name: request.requesterName,
      request_type: request.type,
      course_code: request.courseCode,
      course_title: request.courseTitle,
      academic_session: request.session,
      school: request.faculty,
      reg_or_cohort: request.regOrCohort,
      student_name: request.studentName,
      current_step: request.currentStep,
      total_steps: request.totalSteps,
      step_status_text: request.stepStatusText ?? null,
      shelf_location: request.shelfLocation ?? null,
      rack: request.rack ?? null,
      box: request.box ?? null,
      position: request.position ?? null,
      ready_eta: request.readyEta ?? null,
      custodian: request.custodian ?? null,
      officer_status: request.officerStatus ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(message(error));
  return fromRow(data as RequestRow);
}

export async function getRequest(id: string): Promise<ActiveRetrievalRequest | null> {
  const { data, error } = await getSupabase()
    .from('retrieval_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(message(error));
  if (!data) return null;
  return fromRow(data as RequestRow);
}

export async function updateRequest(request: ActiveRetrievalRequest): Promise<void> {
  const { error } = await getSupabase()
    .from('retrieval_requests')
    .update({
      current_step: request.currentStep,
      step_status_text: request.stepStatusText ?? null,
      ready_eta: request.readyEta ?? null,
      custodian: request.custodian ?? null,
      officer_status: request.officerStatus ?? null,
      officer_note: request.officerNote ?? null,
      shelf_location: request.shelfLocation ?? null,
      rack: request.rack ?? null,
      box: request.box ?? null,
      position: request.position ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id);
  if (error) throw new Error(message(error));
}

export async function deleteRequest(id: string): Promise<void> {
  const { error } = await getSupabase().from('retrieval_requests').delete().eq('id', id);
  if (error) throw new Error(message(error));
}

export async function patchRequest(
  id: string,
  patch: {
    currentStep?: number;
    stepStatusText?: string;
    officerStatus?: string;
    officerNote?: string;
    custodian?: string;
    shelfLocation?: string;
    rack?: string;
    box?: string;
    position?: string;
  }
): Promise<void> {
  const row: Record<string, string | number> = { updated_at: new Date().toISOString() };
  if (patch.currentStep !== undefined) row.current_step = patch.currentStep;
  if (patch.stepStatusText !== undefined) row.step_status_text = patch.stepStatusText;
  if (patch.officerStatus !== undefined) row.officer_status = patch.officerStatus;
  if (patch.officerNote !== undefined) row.officer_note = patch.officerNote;
  if (patch.custodian !== undefined) row.custodian = patch.custodian;
  if (patch.shelfLocation !== undefined) row.shelf_location = patch.shelfLocation;
  if (patch.rack !== undefined) row.rack = patch.rack;
  if (patch.box !== undefined) row.box = patch.box;
  if (patch.position !== undefined) row.position = patch.position;
  const { error } = await getSupabase().from('retrieval_requests').update(row).eq('id', id);
  if (error) throw new Error(message(error));
}

export async function findOpenRequest(input: {
  requesterId: string;
  courseCode: string;
  session?: string;
  registrationNo?: string;
  studentName?: string;
  archiveId?: string;
  requestKind?: RetrievalRequestKind;
}): Promise<ActiveRetrievalRequest | null> {
  let query = getSupabase()
    .from('retrieval_requests')
    .select('*')
    .eq('requester_id', input.requesterId)
    .lt('current_step', 5)
    .order('created_at', { ascending: false })
    .limit(30);
  if (input.courseCode) query = query.eq('course_code', input.courseCode);
  if (input.session) query = query.eq('academic_session', input.session);
  if (input.archiveId) query = query.eq('archive_id', input.archiveId);
  if (input.requestKind) query = query.eq('request_kind', input.requestKind);
  const { data, error } = await query;
  if (error) throw new Error(message(error));
  const match = ((data ?? []) as RequestRow[]).find((row) => {
    const sameReg =
      !input.registrationNo ||
      (row.reg_or_cohort || '').toLowerCase().includes(input.registrationNo.toLowerCase());
    const sameStudent =
      !input.studentName ||
      (row.student_name || '').toLowerCase() === input.studentName.toLowerCase();
    return sameReg && sameStudent;
  });
  return match ? fromRow(match) : null;
}

/** @deprecated Prefer findOpenRequest. */
export async function findOpenMissingRequest(input: {
  requesterId: string;
  courseCode: string;
  session: string;
  registrationNo: string;
  studentName: string;
}): Promise<ActiveRetrievalRequest | null> {
  return findOpenRequest({
    ...input,
    requestKind: 'MISSING_PDF_INVESTIGATION',
  });
}

export function requestIsLocated(request: ActiveRetrievalRequest): boolean {
  const status = (request.officerStatus || '').toLowerCase();
  return (
    request.currentStep >= 3 ||
    status === 'located' ||
    status === 'ready for collection' ||
    status === 'review' ||
    status === 'fulfilled'
  );
}

export function requestForBundle(
  requests: ActiveRetrievalRequest[],
  bundleId: string
): ActiveRetrievalRequest | undefined {
  return requests.find((row) => row.bundleId === bundleId);
}

export function formatPhysicalLocation(parts: {
  shelfLocation?: string | null;
  rack?: string | null;
  box?: string | null;
  position?: string | null;
}): string {
  const values = [parts.shelfLocation, parts.rack, parts.box, parts.position]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return values.length ? values.join(' → ') : 'Location has not been recorded yet.';
}
