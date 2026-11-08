import { getSupabase } from '../lib/supabase';
import { formatLocationCode } from './locationService';

export function locationLabel(parts: {
  shelf?: string | null;
  rack?: string | null;
  box?: string | null;
  position?: string | null;
}): string {
  const shelf = (parts.shelf || '').trim();
  const rack = (parts.rack || '').trim();
  const box = (parts.box || '').trim();
  const position = (parts.position || '').trim();
  if (!shelf && !rack && !box && !position) return 'Location not recorded';
  try {
    return formatLocationCode({
      shelf: shelf || 'X',
      rack: rack || '0',
      box: box || '0',
      position: position || '0',
    });
  } catch {
    return [shelf, rack, box, position].filter(Boolean).join(' · ');
  }
}

export async function insertLocationHistory(input: {
  archiveId: string;
  fromLocation: string;
  toLocation: string;
  movedBy?: string | null;
}): Promise<void> {
  const { data: auth } = await getSupabase().auth.getUser();
  const { error } = await getSupabase().from('location_history').insert({
    archive_id: input.archiveId,
    from_location: input.fromLocation,
    to_location: input.toLocation,
    moved_by: input.movedBy ?? auth.user?.id ?? null,
  });
  if (error) {
    // Table may not exist until Phase 5 SQL is applied.
    if (
      error.message.toLowerCase().includes('location_history') ||
      error.code === '42P01' ||
      error.code === 'PGRST205'
    ) {
      return;
    }
    throw new Error(error.message);
  }
}

export async function listLocationHistory(archiveId: string): Promise<
  { id: string; fromLocation: string; toLocation: string; movedAt: string }[]
> {
  const { data, error } = await getSupabase()
    .from('location_history')
    .select('id, from_location, to_location, moved_at')
    .eq('archive_id', archiveId)
    .order('moved_at', { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return (
    data as { id: string; from_location: string; to_location: string; moved_at: string }[]
  ).map((row) => ({
    id: row.id,
    fromLocation: row.from_location,
    toLocation: row.to_location,
    movedAt: row.moved_at,
  }));
}
