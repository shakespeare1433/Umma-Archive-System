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
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anon || !service) return json({ error: 'Supabase environment is missing.' }, 500);

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (profile?.role !== 'Admin') return json({ error: 'Administrator only.' }, 403);

    const body = await req.json();
    if (body.action === 'create') {
      const username = String(body.username ?? '').trim();
      const role = String(body.role ?? '');
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!email || !email.includes('@')) return json({ error: 'A valid email is required.' }, 400);
      if (!username) return json({ error: 'A username is required.' }, 400);
      if (role === 'Admin' || username.toLowerCase() === 'admin') {
        return json({ error: 'The administrator account is reserved.' }, 400);
      }
      if (!['Lecturer', 'Examination Officer'].includes(role)) {
        return json({ error: 'Role must be Lecturer or Examination Officer.' }, 400);
      }
      const password = String(body.password ?? '');
      if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);

      const department = String(body.department ?? '').trim();
      const faculty = String(body.faculty ?? '').trim();
      const address = String(body.address ?? '').trim();
      const phone = String(body.phone ?? '').trim();
      const name = String(body.name ?? '').trim();

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          name,
          role,
          phone,
          address,
          department,
          faculty,
        },
      });
      if (error) return json({ error: error.message }, 400);
      const userId = data.user?.id;
      if (!userId) return json({ error: 'The account could not be created.' }, 400);

      const { error: profileError } = await admin.from('profiles').upsert(
        {
          id: userId,
          username,
          email,
          name,
          phone,
          address,
          role,
          department,
          faculty,
          status: 'Active',
        },
        { onConflict: 'id' }
      );
      if (profileError) return json({ error: profileError.message }, 400);
      return json({ id: userId }, 200);
    }

    if (body.action === 'set-password') {
      const password = String(body.password ?? '');
      if (!body.userId || password.length < 8) {
        return json({ error: 'Password must be at least 8 characters.' }, 400);
      }
      const email = body.email ? String(body.email).trim().toLowerCase() : undefined;
      const { error } = await admin.auth.admin.updateUserById(String(body.userId), {
        password,
        email,
        email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);
      if (email) {
        const { error: profileError } = await admin.from('profiles').update({ email }).eq('id', String(body.userId));
        if (profileError) return json({ error: profileError.message }, 400);
      }
      return json({ ok: true }, 200);
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Request failed.' }, 500);
  }
});
