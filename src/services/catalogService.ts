import { ACADEMIC_SESSIONS, PROGRAMMES_BY_SCHOOL, SCHOOLS } from '../data/catalog';
import { getSupabase } from '../lib/supabase';

interface ProgrammeRow {
  school: string;
  code: string;
}

/** Catalog lists, plus any programmes already stored for those schools. */
export async function loadProgrammesBySchool(): Promise<Record<string, string[]>> {
  const next: Record<string, string[]> = {};
  for (const school of SCHOOLS) {
    next[school] = [...(PROGRAMMES_BY_SCHOOL[school] ?? [])];
  }

  const { data, error } = await getSupabase().from('programmes').select('school, code');
  if (error) throw new Error(error.message);

  const known = new Set<string>(SCHOOLS);
  for (const row of (data ?? []) as ProgrammeRow[]) {
    if (!known.has(row.school) || !row.code) continue;
    if (!next[row.school].includes(row.code)) next[row.school].push(row.code);
  }
  return next;
}

export async function loadAcademicSessions(): Promise<string[]> {
  const { data, error } = await getSupabase().from('academic_sessions').select('name').order('name');
  if (error || !data?.length) return [...ACADEMIC_SESSIONS];
  const names = (data as { name: string }[]).map((row) => row.name).filter(Boolean);
  return names.length ? names : [...ACADEMIC_SESSIONS];
}
