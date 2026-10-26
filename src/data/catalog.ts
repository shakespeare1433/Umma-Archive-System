export const BUSINESS_SCHOOL = 'School of Business and Technology';
export const NURSING_SCHOOL = 'School of Nursing and Midwifery';
export const EDUCATION_SCHOOL = 'School of Education';
export const SHERIA_SCHOOL = 'School of Sheria';
export const LAW_SCHOOL = 'School of Law';

export const SCHOOLS = [
  BUSINESS_SCHOOL,
  NURSING_SCHOOL,
  EDUCATION_SCHOOL,
  SHERIA_SCHOOL,
  LAW_SCHOOL,
] as const;

/**
 * Programme codes for each school.
 * Nursing, Sheria, and Law stay empty until their official programmes are added
 * here or in the public.programmes table. Do not invent those names.
 */
export const PROGRAMMES_BY_SCHOOL: Record<string, string[]> = {
  [BUSINESS_SCHOOL]: ['BSIT', 'BSCS', 'BCOM', 'BBM', 'BBIT'],
  [NURSING_SCHOOL]: [],
  [EDUCATION_SCHOOL]: ['History', 'Kiswahili', 'English Literature', 'Sciences', 'IRE', 'Arabic'],
  [SHERIA_SCHOOL]: [],
  [LAW_SCHOOL]: [],
};

const SESSION_TERMS = ['January – May', 'May – September', 'September – December'] as const;
const SESSION_YEARS = ['2025', '2026'] as const;

export const ACADEMIC_SESSIONS = SESSION_YEARS.flatMap((year) =>
  SESSION_TERMS.map((term) => `${year} ${term}`)
);

export const ALL_SCHOOLS = 'All schools';
export const ALL_PROGRAMMES = 'All programmes';

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
