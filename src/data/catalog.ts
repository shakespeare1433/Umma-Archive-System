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

/**
 * Programme codes for each school.
 * Nursing and Law and Sheria stay empty until their official programmes are added
 * here or in the public.programmes table. Do not invent those names.
 */
export const PROGRAMMES_BY_SCHOOL: Record<string, string[]> = {
  [BUSINESS_SCHOOL]: ['BCOM', 'BBM', 'BBIT', 'BSIT', 'BSCS'],
  [NURSING_SCHOOL]: [],
  [EDUCATION_SCHOOL]: ['History', 'Kiswahili', 'English Literature', 'Sciences', 'IRE', 'Arabic'],
  [LAW_AND_SHERIA_SCHOOL]: [],
  [SHERIA_SCHOOL]: [],
  [LAW_SCHOOL]: [],
};

export const SHELVES_BY_SCHOOL: Record<string, string[]> = {
  [BUSINESS_SCHOOL]: ['Shelf A', 'Shelf B'],
  [NURSING_SCHOOL]: ['Shelf C', 'Shelf D'],
  [EDUCATION_SCHOOL]: ['Shelf E', 'Shelf F'],
  [LAW_AND_SHERIA_SCHOOL]: [],
};

const SESSION_TERMS = ['January – May', 'May – September', 'September – December'] as const;
const SESSION_YEARS = ['2025', '2026'] as const;

export const ACADEMIC_SESSIONS = SESSION_YEARS.flatMap((year) =>
  SESSION_TERMS.map((term) => `${year} ${term}`)
);

export const ALL_SCHOOLS = 'All schools';
export const ALL_PROGRAMMES = 'All programmes';
export const ALL_YEARS = 'All years';
export const ALL_SEMESTERS = 'All semesters';

export const ACADEMIC_YEARS = ['2024/2025', '2025/2026', '2026/2027'] as const;
export const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3'] as const;
export const STORAGE_STORES = ['Main Examination Store', 'Records Store', 'Archive Room'] as const;
export const SHELF_OPTIONS = ['Shelf A', 'Shelf B', 'Shelf C', 'Shelf D', 'Shelf E', 'Shelf F'] as const;
export const RACK_OPTIONS = ['Rack 1', 'Rack 2', 'Rack 3', 'Column A', 'Column B'] as const;

export function schoolSearchNames(school: string): string[] {
  if (!school || school === ALL_SCHOOLS) return [];
  if (school === NURSING_SCHOOL || school === 'School of Nursing') {
    return [NURSING_SCHOOL, 'School of Nursing'];
  }
  if (
    school === LAW_AND_SHERIA_SCHOOL ||
    school === SHERIA_SCHOOL ||
    school === LAW_SCHOOL ||
    school === 'School of Sheria and Law'
  ) {
    return [LAW_AND_SHERIA_SCHOOL, 'School of Sheria and Law', SHERIA_SCHOOL, LAW_SCHOOL];
  }
  return [school];
}

export function shelvesForSchool(school: string): string[] {
  return [...(SHELVES_BY_SCHOOL[school] ?? [])];
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
  return [...(source[school] ?? [])];
}
