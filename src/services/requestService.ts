import { ActiveRetrievalRequest, RetrievalType } from '../types';
import { getSupabase } from '../lib/supabase';

interface RequestRow {
  id: string;
  archive_id: string;
  requester_id: string;
  requester_name: string;
  request_type: RetrievalType;
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
  ready_eta: string | null;
  custodian: string | null;
  officer_status: string | null;
  created_at: string;
  updated_at: string;
}

function fromRow(row: RequestRow): ActiveRetrievalRequest {
  return {
    id: row.id,
    recordId: row.archive_id,
    requesterId: row.requester_id,
    requesterName: row.requester_name,
    type: row.request_type,
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
    readyEta: row.ready_eta ?? undefined,
    custodian: row.custodian ?? undefined,
    officerStatus: row.officer_status ?? undefined,
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
      archive_id: request.recordId,
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
    custodian?: string;
  }
): Promise<void> {
  const row: Record<string, string | number> = { updated_at: new Date().toISOString() };
  if (patch.currentStep !== undefined) row.current_step = patch.currentStep;
  if (patch.stepStatusText !== undefined) row.step_status_text = patch.stepStatusText;
  if (patch.officerStatus !== undefined) row.officer_status = patch.officerStatus;
  if (patch.custodian !== undefined) row.custodian = patch.custodian;
  const { error } = await getSupabase().from('retrieval_requests').update(row).eq('id', id);
  if (error) throw new Error(message(error));
}
