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

async function insertNotification(input: {
  userId?: string | null;
  audience: AppNotification['audience'];
  title: string;
  body: string;
  requestId?: string | null;
}): Promise<boolean> {
  const { error } = await getSupabase().from('notifications').insert({
    user_id: input.userId ?? null,
    audience: input.audience,
    title: input.title,
    body: input.body,
    request_id: input.requestId ?? null,
  });
  if (error) {
    console.warn('Notification not saved:', error.message);
    return false;
  }
  return true;
}

function adminMirrorTitle(audience: AppNotification['audience'], title: string): string {
  if (audience === 'officer' || audience === 'user' || audience === 'lecturer') {
    if (/^lecturer:/i.test(title) || /^officer:/i.test(title) || /^admin:/i.test(title)) {
      return title;
    }
    if (audience === 'officer') return `Lecturer: ${title}`;
    return `Officer: ${title}`;
  }
  return title;
}

/** Create a role notification and always mirror activity to Admin. */
export async function createNotification(input: {
  userId?: string | null;
  audience: AppNotification['audience'];
  title: string;
  body: string;
  requestId?: string | null;
  /** Skip the automatic Admin copy (rare). */
  skipAdminMirror?: boolean;
}): Promise<boolean> {
  const primary = await insertNotification(input);
  if (!primary) return false;

  if (input.skipAdminMirror || input.audience === 'admin') return true;

  await insertNotification({
    audience: 'admin',
    title: adminMirrorTitle(input.audience, input.title),
    body: input.body,
    requestId: input.requestId,
  });
  return true;
}
