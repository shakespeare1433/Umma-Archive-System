import { VaultSettings } from '../types';
import { getSupabase } from '../lib/supabase';

export const DEFAULT_SETTINGS: VaultSettings = {
  academicYear: '2024/2025 Academic Year',
  dispatchHours: 4,
  faculties: [
    'School of Business and Technology',
    'School of Nursing and Midwifery',
    'School of Education',
    'School of Sheria',
    'School of Law',
  ],
  sessions: [
    '2025 January – May',
    '2025 May – September',
    '2025 September – December',
    '2026 January – May',
    '2026 May – September',
    '2026 September – December',
  ],
};

interface SettingsRow {
  academic_year: string;
  dispatch_hours: number;
  faculties: string[];
  sessions: string[];
}

function fromRow(row: SettingsRow): VaultSettings {
  return {
    academicYear: row.academic_year,
    dispatchHours: row.dispatch_hours,
    faculties: row.faculties,
    sessions: row.sessions,
  };
}

export async function loadSettings(): Promise<VaultSettings> {
  const { data, error } = await getSupabase().from('vault_settings').select('*').eq('id', 1).maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  return fromRow(data as SettingsRow);
}

export async function saveSettings(settings: VaultSettings): Promise<void> {
  const { error } = await getSupabase()
    .from('vault_settings')
    .update({
      academic_year: settings.academicYear,
      dispatch_hours: settings.dispatchHours,
      faculties: settings.faculties,
      sessions: settings.sessions,
    })
    .eq('id', 1);
  if (error) throw new Error(error.message);
}
