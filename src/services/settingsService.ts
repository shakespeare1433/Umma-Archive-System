import { VaultSettings } from '../types';
import { getSupabase } from '../lib/supabase';

export const DEFAULT_SETTINGS: VaultSettings = {
  academicYear: '2024/2025 Academic Year',
  dispatchHours: 4,
  faculties: [
    'School of Business and Technology',
    'School of Nursing and Midwifery',
    'School of Education',
    'School of Law and Sheria',
  ],
  sessions: [
    '2023 Jan – Apr',
    '2023 May – Aug',
    '2023 Sep – Dec',
    '2024 Jan – Apr',
    '2024 May – Aug',
    '2024 Sep – Dec',
    '2025 Jan – Apr',
    '2025 May – Aug',
    '2025 Sep – Dec',
    '2026 Jan – Apr',
    '2026 May – Aug',
    '2026 Sep – Dec',
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
