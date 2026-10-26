/**
 * Creates or updates the single administrator in Supabase Auth.
 *
 * Required environment (never commit these):
 *   EXPO_PUBLIC_SUPABASE_URL or SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_PASSWORD
 *
 * The password is read from the environment only. It is not printed or written into the database as plain text.
 * Username is always ADMIN.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const ADMIN_USERNAME = 'ADMIN';
const ADMIN_EMAIL = 'Maryam123@gmail.com';

function loadEnvFile() {
  const file = path.join(process.cwd(), '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

loadEnvFile();

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.ADMIN_PASSWORD;

if (!url || !serviceKey) {
  fail('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env. Do not put the service role key in the app.');
}
if (!password || password === '[PUT YOUR PASSWORD HERE]') {
  fail('Set ADMIN_PASSWORD in .env to the administrator password. Do not commit that file.');
}
if (password.length < 8) {
  fail('ADMIN_PASSWORD must be at least 8 characters.');
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) fail(listError.message);

const existing = listed.users.find((user) => user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
let userId = existing?.id;

// The profile trigger runs before GoTrue stores the Admin role. Creating the
// user with username ADMIN at that moment is rejected, so the role is applied after.
const profileFields = {
  username: ADMIN_USERNAME,
  name: 'Administrator',
  role: 'Admin',
  department: 'ICT Directorate',
  faculty: 'Central Administration',
};

if (userId) {
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    app_metadata: { role: 'Admin' },
    user_metadata: profileFields,
  });
  if (error) fail(error.message);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password,
    email_confirm: true,
    user_metadata: {
      username: 'maryam123',
      name: 'Administrator',
      department: 'ICT Directorate',
      faculty: 'Central Administration',
    },
  });
  if (error) fail(error.message);
  userId = data.user?.id;
  if (userId) {
    const { error: promoteError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role: 'Admin' },
      user_metadata: profileFields,
    });
    if (promoteError) fail(promoteError.message);
  }
}

if (!userId) fail('The administrator user was not created.');

const { error: profileError } = await admin.from('profiles').upsert(
  {
    id: userId,
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    name: 'Administrator',
    phone: '',
    role: 'Admin',
    department: 'ICT Directorate',
    faculty: 'Central Administration',
    status: 'Active',
  },
  { onConflict: 'id' }
);
if (profileError) fail(profileError.message);

console.log('Administrator ready. Sign in with username ADMIN. The password was not printed.');
