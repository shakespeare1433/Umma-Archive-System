import { AppNotification } from '../types';
import { getSupabase } from '../lib/supabase';

interface NotificationRow {
  id: string;
  user_id: string | null;
  audience: AppNotification['audience'];
  title: string;
  body: string;
  request_id: string | null;
  created_at: string;
  read_at: string | null;
}

function fromRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    audience: row.audience,
    title: row.title,
    body: row.body,
    requestId: row.request_id,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export async function listNotifications(): Promise<AppNotification[]> {
  const { data, error } = await getSupabase()
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as NotificationRow[]).map(fromRow);
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await getSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw new Error(error.message);
}

export async function clearNotifications(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await getSupabase().from('notifications').delete().in('id', ids);
  if (error) throw new Error(error.message);
}
