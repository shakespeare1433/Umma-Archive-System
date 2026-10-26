import { SearchedUnitItem } from '../types';
import { getSupabase } from '../lib/supabase';

interface HistoryRow {
  id: string;
  user_id: string;
  code: string;
  title: string;
  category: string;
  time_text: string;
  is_today: boolean;
  icon_name: string;
  searched_at: string;
}

function fromRow(row: HistoryRow): SearchedUnitItem {
  return {
    id: row.id,
    userId: row.user_id,
    code: row.code,
    title: row.title,
    category: row.category,
    timeText: row.time_text,
    isToday: row.is_today,
    iconName: row.icon_name,
    searchedAt: row.searched_at,
  };
}

function message(error: { message: string }) {
  return error.message;
}

export async function listHistory(): Promise<SearchedUnitItem[]> {
  const { data, error } = await getSupabase()
    .from('search_history')
    .select('*')
    .order('searched_at', { ascending: false });
  if (error) throw new Error(message(error));
  return ((data ?? []) as HistoryRow[]).map(fromRow);
}

export async function insertHistory(item: Omit<SearchedUnitItem, 'id'>): Promise<SearchedUnitItem> {
  const { data, error } = await getSupabase()
    .from('search_history')
    .insert({
      user_id: item.userId,
      code: item.code,
      title: item.title,
      category: item.category,
      time_text: item.timeText,
      is_today: Boolean(item.isToday),
      icon_name: item.iconName,
      searched_at: item.searchedAt,
    })
    .select('*')
    .single();
  if (error) throw new Error(message(error));
  return fromRow(data as HistoryRow);
}

export async function clearOwnHistory(userId: string): Promise<void> {
  const { error } = await getSupabase().from('search_history').delete().eq('user_id', userId);
  if (error) throw new Error(message(error));
}
