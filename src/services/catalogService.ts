import {
  ACADEMIC_SESSIONS,
  canonicalProgrammeName,
  canonicalSchoolName,
  PROGRAMMES_BY_SCHOOL,
  SCHOOLS,
} from '../data/catalog';
import { getSupabase } from '../lib/supabase';

interface ProgrammeRow {
  school: string;
  code: string;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function mergeUnique(preferred: string[], extras: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of [...preferred, ...extras]) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    next.push(trimmed);
  }
  return next;
}

/** Schools used on officer archive + lecturer search screens. */
export async function loadSchools(): Promise<string[]> {
  const fallback = [...SCHOOLS];
  try {
    const { data, error } = await getSupabase().from('schools').select('name').order('name');
    if (error || !data?.length) return fallback;
    const extras = (data as { name: string }[])
      .map((row) => canonicalSchoolName(row.name))
      .filter((name) => name && !fallback.includes(name));
    return mergeUnique(fallback, extras);
  } catch {
    return fallback;
  }
}

/** Catalog lists, plus any programmes already stored for those schools. */
export async function loadProgrammesBySchool(): Promise<Record<string, string[]>> {
  const schools = await loadSchools();
  const next: Record<string, string[]> = {};
  for (const school of schools) {
    next[school] = [...(PROGRAMMES_BY_SCHOOL[school] ?? [])];
  }

  try {
    const { data, error } = await getSupabase().from('programmes').select('school, code');
    if (error) throw new Error(error.message);

    for (const row of (data ?? []) as ProgrammeRow[]) {
      const school = canonicalSchoolName(row.school || '');
      const code = canonicalProgrammeName(row.code || '');
      if (!school || !code) continue;
      if (!next[school]) next[school] = [];
      if (!next[school].includes(code)) next[school].push(code);
    }
  } catch {
    // Keep static catalogue when the network/table is unavailable.
  }

  for (const school of Object.keys(next)) {
    const preferred = PROGRAMMES_BY_SCHOOL[school] ?? [];
    next[school] = mergeUnique(preferred, next[school]);
  }
  return next;
}

const OBSOLETE_SESSION_MARKERS = [
  ' January – May',
  ' May – September',
  ' January – April',
  ' May – August',
  ' September – December',
];

function isCurrentSessionName(name: string) {
  return !OBSOLETE_SESSION_MARKERS.some((marker) => name.includes(marker));
}

export async function loadAcademicSessions(): Promise<string[]> {
  const preferred = [...ACADEMIC_SESSIONS];
  try {
    const { data, error } = await getSupabase().from('academic_sessions').select('name').order('name');
    if (error || !data?.length) return preferred;
    const names = (data as { name: string }[])
      .map((row) => row.name)
      .filter((name) => Boolean(name) && isCurrentSessionName(name));
    // Keep catalogue year/term order first; only append unknown extras after.
    return names.length ? mergeUnique(preferred, names) : preferred;
  } catch {
    return preferred;
  }
}

export async function addSchool(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Enter a school name.');
  const { error } = await getSupabase().from('schools').upsert({ name: trimmed });
  if (error) throw new Error(error.message);
}

export async function addProgramme(school: string, code: string): Promise<void> {
  const schoolName = school.trim();
  const programme = code.trim();
  if (!schoolName) throw new Error('Choose a school first.');
  if (!programme) throw new Error('Enter a programme code.');
  const { error: schoolError } = await getSupabase().from('schools').upsert({ name: schoolName });
  if (schoolError) throw new Error(schoolError.message);
  const { error } = await getSupabase().from('programmes').upsert({ school: schoolName, code: programme });
  if (error) throw new Error(error.message);
}

export async function addAcademicSession(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Enter an academic session.');
  const { error } = await getSupabase().from('academic_sessions').upsert({ name: trimmed });
  if (error) throw new Error(error.message);
}

export async function removeAcademicSession(name: string): Promise<void> {
  const { error } = await getSupabase().from('academic_sessions').delete().eq('name', name);
  if (error) throw new Error(error.message);
}

export async function removeProgramme(school: string, code: string): Promise<void> {
  const { error } = await getSupabase()
    .from('programmes')
    .delete()
    .eq('school', school)
    .eq('code', code);
  if (error) throw new Error(error.message);
}
