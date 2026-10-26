// @ts-nocheck — Deno edge function, not part of the Expo TypeScript program.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !service) return json({ error: 'Supabase environment is missing.' }, 500);

    const body = await req.json();
    const identifier = String(body.identifier ?? '').trim();
    const password = String(body.password ?? '');

    if (!identifier) return json({ error: 'Enter your email or username.' }, 400);
    if (password.length < 8) return json({ error: 'New password must be at least 8 characters.' }, 400);

    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const key = identifier.toLowerCase();
    const { data: byEmail } = await admin
      .from('profiles')
      .select('id, username, email, role, status')
      .eq('email', key)
      .maybeSingle();
    const { data: byUsername } = byEmail
      ? { data: null }
      : await admin.from('profiles').select('id, username, email, role, status').eq('username', identifier).maybeSingle();

    const profile = byEmail ?? byUsername;
    if (!profile) return json({ error: 'No account found for that username or email.' }, 404);
    if (profile.role === 'Admin' || String(profile.username).toLowerCase() === 'admin') {
      return json({ error: 'The administrator password cannot be reset here.' }, 403);
    }
    if (profile.status === 'Suspended') {
      return json({ error: 'This account is suspended. Contact the administrator.' }, 403);
    }

    const { error } = await admin.auth.admin.updateUserById(profile.id, {
      password,
      email_confirm: true,
    });
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true, message: 'Your new password is ready. Sign in with it.' }, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Request failed.' }, 500);
  }
});
