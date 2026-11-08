import { getSupabase } from '../lib/supabase';
import {
  racksForSchool as catalogRacks,
  shelvesForSchool as catalogShelves,
} from '../data/catalog';

export interface StorageLocationRow {
  id: string;
  school: string;
  shelf: string;
  rack: string;
  box: string;
  slot: string;
  isActive: boolean;
}

interface DbRow {
  id: string;
  school: string;
  shelf: string;
  rack: string;
  box: string;
  slot: string;
  is_active: boolean;
}

function fromRow(row: DbRow): StorageLocationRow {
  return {
    id: row.id,
    school: row.school,
    shelf: row.shelf,
    rack: row.rack,
    box: row.box,
    slot: row.slot,
    isActive: row.is_active,
  };
}

/** Example: B-R2-BX05-S03 */
export function formatLocationCode(parts: {
  shelf: string;
  rack: string;
  box: string;
  position: string;
}): string {
  const shelf = parts.shelf.replace(/^shelf\s*/i, '').trim() || 'X';
  const rack = parts.rack.replace(/^rack\s*/i, '').replace(/^r/i, '').trim() || '0';
  const boxRaw = parts.box.replace(/^box\s*/i, '').trim() || '0';
  const slotRaw = parts.position.replace(/^(slot|position)\s*/i, '').trim() || '0';
  const box = boxRaw.replace(/\D/g, '') || boxRaw;
  const slot = slotRaw.replace(/\D/g, '') || slotRaw;
  return `${shelf}-R${rack}-BX${String(box).padStart(2, '0')}-S${String(slot).padStart(2, '0')}`.toUpperCase();
}

export function isLocationRecorded(parts: {
  shelf?: string | null;
  rack?: string | null;
  box?: string | null;
  position?: string | null;
}): boolean {
  const values = [parts.shelf, parts.rack, parts.box, parts.position];
  return values.some((value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    return lower !== 'not recorded' && lower !== 'n/a' && lower !== '-';
  });
}

export async function listStorageLocations(school?: string): Promise<StorageLocationRow[]> {
  let query = getSupabase()
    .from('storage_locations')
    .select('id, school, shelf, rack, box, slot, is_active')
    .eq('is_active', true)
    .order('shelf', { ascending: true });
  if (school?.trim()) query = query.eq('school', school.trim());
  const { data, error } = await query;
  if (error) {
    // Table may not exist until Phase 4 SQL is applied.
    return [];
  }
  return ((data ?? []) as DbRow[]).map(fromRow);
}

export async function shelvesForSchoolFromDb(school: string): Promise<string[]> {
  const rows = await listStorageLocations(school);
  const shelves = [...new Set(rows.map((row) => row.shelf).filter(Boolean))];
  if (shelves.length) return shelves;
  return catalogShelves(school);
}

export async function racksForSchoolFromDb(school: string): Promise<string[]> {
  const rows = await listStorageLocations(school);
  const racks = [...new Set(rows.map((row) => row.rack).filter(Boolean))];
  if (racks.length) return racks;
  return catalogRacks(school);
}

export async function racksForSchoolShelf(school: string, shelf: string): Promise<string[]> {
  const rows = await listStorageLocations(school);
  const racks = [
    ...new Set(
      rows
        .filter((row) => row.shelf === shelf && row.rack.trim())
        .map((row) => row.rack)
    ),
  ];
  if (racks.length) return racks;
  return catalogRacks(school);
}

export async function findArchiveAtLocation(parts: {
  shelf: string;
  rack: string;
  box: string;
  position: string;
  excludeId?: string;
}): Promise<{ id: string; unitCode: string; unitName: string } | null> {
  let query = getSupabase()
    .from('examination_archives')
    .select('id, unit_code, unit_name')
    .eq('shelf', parts.shelf.trim())
    .eq('rack', parts.rack.trim())
    .eq('box', parts.box.trim())
    .eq('position', parts.position.trim())
    .limit(5);

  const { data, error } = await query;
  if (error || !data?.length) return null;
  const hit = (data as { id: string; unit_code: string; unit_name: string }[]).find(
    (row) => row.id !== parts.excludeId
  );
  if (!hit) return null;
  return { id: hit.id, unitCode: hit.unit_code, unitName: hit.unit_name };
}
