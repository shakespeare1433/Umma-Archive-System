import { AppUser, UserRole } from '../types';
import { createEphemeralClient, getSupabase } from '../lib/supabase';

interface ProfileRow {
  id: string;
  username: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  avatar_url: string;
  role: UserRole;
  department: string;
  faculty: string;
  status: 'Active' | 'Suspended';
  created_at: string;
}

const RESERVED_USERNAME = 'admin';

function toUser(row: ProfileRow): AppUser {
  return {
    id: row.id,
    username: row.username,
    password: '',
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address ?? '',
    avatarUrl: row.avatar_url ?? '',
    role: row.role,
    department: row.department,
    faculty: row.faculty,
    status: row.status,
    createdAt: row.created_at,
  };
}

function message(error: { message: string }) {
  return error.message;
}

export async function listProfiles(): Promise<AppUser[]> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(message(error));
  return ((data ?? []) as ProfileRow[]).map(toUser);
}

export async function fetchProfile(userId: string): Promise<AppUser | null> {
  const { data, error } = await getSupabase().from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(message(error));
  return data ? toUser(data as ProfileRow) : null;
}

async function emailForIdentifier(identifier: string): Promise<string | null> {
  const { data, error } = await getSupabase().rpc('resolve_sign_in_email', {
    identifier: identifier.trim(),
  });
  if (error) throw new Error(message(error));
  return typeof data === 'string' && data ? data : null;
}

export async function signInAccount(
  identifier: string,
  password: string,
  role?: UserRole
): Promise<{ user: AppUser } | { error: string }> {
  const email = await emailForIdentifier(identifier);
  if (!email) return { error: 'No account found for that username or email.' };

  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: 'Incorrect password.' };

  const profile = await fetchProfile(data.user.id);
  if (!profile) {
    await getSupabase().auth.signOut();
    return { error: 'This account has no role assigned. Contact an administrator.' };
  }
  if (profile.status === 'Suspended') {
    await getSupabase().auth.signOut();
    return { error: 'This account has been suspended. Contact an administrator.' };
  }
  if (role && profile.role !== role) {
    await getSupabase().auth.signOut();
    return { error: `This account is registered as ${profile.role}, not ${role}.` };
  }
  if (profile.role !== 'Admin' && identifier.trim().toLowerCase() === RESERVED_USERNAME) {
    await getSupabase().auth.signOut();
    return { error: 'The ADMIN login is reserved for the administrator.' };
  }
  return { user: profile };
}

export async function signUpAccount(payload: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<{ user: AppUser } | { error: string }> {
  if (payload.role === 'Admin') {
    return { error: 'Administrator accounts cannot be created from sign up. Use the ADMIN login.' };
  }
  const email = payload.email.trim().toLowerCase();
  const username = email.split('@')[0];
  if (username.toLowerCase() === RESERVED_USERNAME) {
    return { error: 'That username is reserved for the administrator.' };
  }

  const department =
    payload.role === 'Examination Officer'
      ? 'Office of the Registrar (Examinations)'
      : 'Academic Staff';

  const { data, error } = await getSupabase().auth.signUp({
    email,
    password: payload.password,
    options: {
      data: {
        username,
        name: payload.fullName.trim(),
        role: payload.role,
        department,
        faculty: 'Faculty of Computing & IT',
      },
    },
  });
  if (error) return { error: message(error) };
  if (!data.user || !data.session) {
    return { error: 'Account created. Confirm the email in Supabase, then sign in.' };
  }

  const profile = await fetchProfile(data.user.id);
  if (!profile) return { error: 'Account created, but the profile is not available yet. Sign in again.' };
  if (profile.role === 'Admin') {
    await getSupabase().auth.signOut();
    return { error: 'Administrator accounts cannot be created from sign up.' };
  }
  return { user: profile };
}

export async function signOutAccount(): Promise<void> {
  await getSupabase().auth.signOut();
}

export async function updateOwnProfile(
  profile: Partial<Pick<AppUser, 'name' | 'email' | 'phone' | 'address' | 'department' | 'faculty' | 'avatarUrl'>>
): Promise<void> {
  const { data } = await getSupabase().auth.getUser();
  if (!data.user) throw new Error('You must be signed in.');
  const patch: Record<string, string> = {};
  if (profile.name !== undefined) patch.name = profile.name;
  if (profile.email !== undefined) patch.email = profile.email;
  if (profile.phone !== undefined) patch.phone = profile.phone;
  if (profile.address !== undefined) patch.address = profile.address;
  if (profile.department !== undefined) patch.department = profile.department;
  if (profile.faculty !== undefined) patch.faculty = profile.faculty;
  if (profile.avatarUrl !== undefined) patch.avatar_url = profile.avatarUrl;
  const { error } = await getSupabase().from('profiles').update(patch).eq('id', data.user.id);
  if (error) throw new Error(message(error));
  if (profile.email) {
    const { error: authError } = await getSupabase().auth.updateUser({ email: profile.email });
    if (authError) throw new Error(message(authError));
  }
}

export async function uploadAvatarFile(userId: string, base64: string): Promise<string> {
  const clean = base64.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await getSupabase().storage.from('avatars').upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(message(error));

  const listed = await getSupabase().storage.from('avatars').list(userId);
  const stale = (listed.data ?? [])
    .map((file) => `${userId}/${file.name}`)
    .filter((name) => name !== path);
  if (stale.length > 0) {
    await getSupabase().storage.from('avatars').remove(stale);
  }

  const { data } = getSupabase().storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

async function reauthenticate(password: string): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser();
  const email = data.user?.email;
  if (!email) return 'You must be signed in.';
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) return 'Current password is incorrect.';
  return null;
}

export async function changeOwnPassword(current: string, nextPass: string): Promise<string | null> {
  if (nextPass.length < 8) return 'New password must be at least 8 characters.';
  const authError = await reauthenticate(current);
  if (authError) return authError;
  const { error } = await getSupabase().auth.updateUser({ password: nextPass });
  if (error) return message(error);
  return null;
}

export async function replaceOwnLogin(
  currentPassword: string,
  username: string,
  password: string
): Promise<AppUser | string> {
  const nextUsername = username.trim();
  if (!nextUsername) return 'Enter a username.';
  if (nextUsername.toLowerCase() === RESERVED_USERNAME) {
    return 'That username is reserved for the administrator.';
  }
  if (password.length < 8) return 'New password must be at least 8 characters.';
  const authError = await reauthenticate(currentPassword);
  if (authError) return authError;

  const { data } = await getSupabase().auth.getUser();
  if (!data.user) return 'You must be signed in.';

  const { error: nameError } = await getSupabase()
    .from('profiles')
    .update({ username: nextUsername })
    .eq('id', data.user.id);
  if (nameError) return message(nameError);

  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) return message(error);

  const profile = await fetchProfile(data.user.id);
  if (!profile) return 'Profile could not be reloaded.';
  return profile;
}

export async function sendPasswordReset(
  identifier: string,
  password: string
): Promise<{ ok: boolean; message: string }> {
  try {
    if (password.trim().length < 8) {
      return { ok: false, message: 'New password must be at least 8 characters.' };
    }
    const { data, error } = await getSupabase().functions.invoke('forgot-password', {
      body: { identifier: identifier.trim(), password },
    });
    const payload = data as { ok?: boolean; message?: string; error?: string } | null;
    if (error) {
      return {
        ok: false,
        message: typeof payload?.error === 'string' ? payload.error : error.message,
      };
    }
    if (payload?.error) return { ok: false, message: String(payload.error) };
    return {
      ok: true,
      message: payload?.message || 'Your new password is ready. Sign in with it.',
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Could not create a new password.',
    };
  }
}

export async function updateStaffProfile(user: AppUser): Promise<string | null> {
  if (user.role === 'Admin' && user.username.toLowerCase() !== RESERVED_USERNAME) {
    return 'Only the ADMIN account can hold the administrator role.';
  }
  const { error } = await getSupabase()
    .from('profiles')
    .update({
      username: user.username,
      email: user.email,
      name: user.name,
      phone: user.phone,
      address: user.address,
      role: user.role === 'Admin' ? 'Admin' : user.role,
      department: user.department,
      faculty: user.faculty,
      status: user.status,
    })
    .eq('id', user.id);
  if (error) return message(error);
  return null;
}

export async function createStaffAccount(input: {
  username: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
  address?: string;
  department?: string;
  faculty?: string;
}): Promise<{ user: AppUser } | { error: string }> {
  if (input.role === 'Admin' || input.username.trim().toLowerCase() === RESERVED_USERNAME) {
    return { error: 'The administrator account is reserved and cannot be created here.' };
  }

  const invoked = await getSupabase().functions.invoke('admin-accounts', {
    body: { action: 'create', ...input, username: input.username.trim(), email: input.email.trim().toLowerCase() },
  });

  const payload = invoked.data as { error?: string } | null;

  if (!invoked.error && payload && !payload.error) {
    const users = await listProfiles();
    const created = users.find((user) => user.email.toLowerCase() === input.email.trim().toLowerCase());
    if (created) return { user: created };
  }

  const functionMissing = invoked.error
    ? /not found|404|failed to send|relay/i.test(invoked.error.message)
    : false;
  if (invoked.error && !functionMissing) {
    const detail = payload?.error;
    return { error: typeof detail === 'string' ? detail : invoked.error.message };
  }

  const ephemeral = createEphemeralClient();
  const { data, error } = await ephemeral.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        username: input.username.trim(),
        name: input.name,
        role: input.role,
        phone: input.phone ?? '',
        address: input.address ?? '',
        department: input.department ?? input.role,
        faculty: input.faculty ?? '',
      },
    },
  });
  if (error) return { error: message(error) };
  if (!data.user) return { error: 'The account could not be created.' };

  const users = await listProfiles();
  const created = users.find((user) => user.id === data.user?.id);
  if (!created) {
    return {
      error:
        'The account was created in Supabase Auth. Confirm email is disabled, or deploy the admin-accounts function, then refresh.',
    };
  }
  return { user: created };
}

export async function setStaffPassword(userId: string, password: string, email?: string): Promise<string | null> {
  if (password.length < 8) return 'New password must be at least 8 characters.';
  const { data, error } = await getSupabase().functions.invoke('admin-accounts', {
    body: { action: 'set-password', userId, password, email },
  });
  if (error) {
    return 'Replacing another person\'s password requires the admin-accounts Supabase function.';
  }
  if (data?.error) return String(data.error);
  return null;
}
