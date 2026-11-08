export const BUSINESS_SCHOOL = 'School of Business and Technology';
export const NURSING_SCHOOL = 'School of Nursing and Midwifery';
export const EDUCATION_SCHOOL = 'School of Education';
export const LAW_AND_SHERIA_SCHOOL = 'School of Law and Sheria';
export const SHERIA_SCHOOL = 'School of Sheria';
export const LAW_SCHOOL = 'School of Law';

export const SCHOOLS = [
  BUSINESS_SCHOOL,
  NURSING_SCHOOL,
  EDUCATION_SCHOOL,
  LAW_AND_SHERIA_SCHOOL,
] as const;

/** Official programmes shown on search, archive, and admin catalogues. */
export const PROGRAMMES_BY_SCHOOL: Record<string, string[]> = {
  [BUSINESS_SCHOOL]: ['BSIT', 'BSCS', 'BCOM', 'BBM', 'BBIT'],
  [EDUCATION_SCHOOL]: ['English Literature', 'Kiswahili Literature', 'History', 'IRE', 'Sciences'],
  [NURSING_SCHOOL]: ['Nursing', 'Midwifery'],
  [LAW_AND_SHERIA_SCHOOL]: ['Law', 'Islamic Studies', 'Sheria'],
  [SHERIA_SCHOOL]: ['Law', 'Islamic Studies', 'Sheria'],
  [LAW_SCHOOL]: ['Law', 'Islamic Studies', 'Sheria'],
};

const SCHOOL_ALIASES: Record<string, string> = {
  'School of Nursing': NURSING_SCHOOL,
  'School of Sheria': LAW_AND_SHERIA_SCHOOL,
  'School of Law': LAW_AND_SHERIA_SCHOOL,
  'School of Sheria and Law': LAW_AND_SHERIA_SCHOOL,
};

const PROGRAMME_ALIASES: Record<string, string> = {
  Kiswahili: 'Kiswahili Literature',
  'English literature': 'English Literature',
  'kiswahili literature': 'Kiswahili Literature',
};

const RETIRED_PROGRAMMES = new Set(['Arabic']);

/** Map leftover school names onto the four current schools. */
export function canonicalSchoolName(name: string): string {
  const trimmed = name.trim();
  return SCHOOL_ALIASES[trimmed] || trimmed;
}

export function canonicalProgrammeName(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed || RETIRED_PROGRAMMES.has(trimmed)) return null;
  return PROGRAMME_ALIASES[trimmed] || trimmed;
}

/** Two lettered racks per school (physical vault layout). */
export const RACKS_BY_SCHOOL: Record<string, string[]> = {
  [BUSINESS_SCHOOL]: ['Rack A', 'Rack B'],
  [EDUCATION_SCHOOL]: ['Rack C', 'Rack D'],
  [NURSING_SCHOOL]: ['Rack E', 'Rack F'],
  [LAW_AND_SHERIA_SCHOOL]: ['Rack G', 'Rack H'],
  [SHERIA_SCHOOL]: ['Rack G', 'Rack H'],
  [LAW_SCHOOL]: ['Rack G', 'Rack H'],
};

/** Numbered shelves available on every rack. */
export const SHELF_NUMBERS = [
  'Shelf 1',
  'Shelf 2',
  'Shelf 3',
  'Shelf 4',
  'Shelf 5',
  'Shelf 6',
  'Shelf 7',
  'Shelf 8',
  'Shelf 9',
  'Shelf 10',
  'Shelf 11',
  'Shelf 12',
] as const;

/** @deprecated Prefer RACKS_BY_SCHOOL + SHELF_NUMBERS. Kept for older callers. */
export const SHELVES_BY_SCHOOL: Record<string, string[]> = {
  [BUSINESS_SCHOOL]: [...SHELF_NUMBERS],
  [NURSING_SCHOOL]: [...SHELF_NUMBERS],
  [EDUCATION_SCHOOL]: [...SHELF_NUMBERS],
  [LAW_AND_SHERIA_SCHOOL]: [...SHELF_NUMBERS],
};

/** Sample years shown first on Academic Session pickers. */
export const ACADEMIC_SESSION_YEARS = ['2023', '2024', '2025', '2026'] as const;

/** Terms shown after a year is tapped. */
export const ACADEMIC_SESSION_TERMS = ['Jan – Apr', 'May – Aug', 'Sep – Dec'] as const;

export const ACADEMIC_SESSIONS = ACADEMIC_SESSION_YEARS.flatMap((year) =>
  ACADEMIC_SESSION_TERMS.map((term) => formatAcademicSession(year, term))
);

export function formatAcademicSession(year: string, term: string): string {
  return `${year.trim()} ${term.trim()}`;
}

export function parseAcademicSession(session: string): { year: string; term: string } | null {
  const trimmed = session.trim();
  const match = /^(\d{4})\s+(.+)$/.exec(trimmed);
  if (!match) return null;
  return { year: match[1], term: match[2] };
}

export const ALL_SCHOOLS = 'All schools';
export const ALL_PROGRAMMES = 'All programmes';
export const ALL_YEARS = 'All years';
export const ALL_SEMESTERS = 'All semesters';

export const ACADEMIC_YEARS = ['2024/2025', '2025/2026', '2026/2027'] as const;
export const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3'] as const;
export const STORAGE_STORES = ['Main Examination Store', 'Records Store', 'Archive Room'] as const;
export const SHELF_OPTIONS = SHELF_NUMBERS;
export const RACK_OPTIONS = [
  'Rack A',
  'Rack B',
  'Rack C',
  'Rack D',
  'Rack E',
  'Rack F',
  'Rack G',
  'Rack H',
] as const;

export function schoolSearchNames(school: string): string[] {
  if (!school || school === ALL_SCHOOLS) return [];
  const canonical = canonicalSchoolName(school);
  if (canonical === NURSING_SCHOOL) {
    return [NURSING_SCHOOL, 'School of Nursing'];
  }
  if (canonical === LAW_AND_SHERIA_SCHOOL) {
    return [LAW_AND_SHERIA_SCHOOL, 'School of Sheria and Law', SHERIA_SCHOOL, LAW_SCHOOL];
  }
  return [canonical];
}

export function racksForSchool(school: string): string[] {
  return [...(RACKS_BY_SCHOOL[school] ?? [])];
}

export function shelvesForSchool(_school?: string): string[] {
  return [...SHELF_NUMBERS];
}

export function programmesForSchool(
  school: string,
  source: Record<string, string[]> = PROGRAMMES_BY_SCHOOL
): string[] {
  if (school === ALL_SCHOOLS) {
    const seen = new Set<string>();
    const all: string[] = [];
    for (const name of SCHOOLS) {
      for (const code of source[name] ?? []) {
        if (seen.has(code)) continue;
        seen.add(code);
        all.push(code);
      }
    }
    return all;
  }
  const canonical = canonicalSchoolName(school);
  return [...(source[canonical] ?? source[school] ?? [])];
}
