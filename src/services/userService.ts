/**
 * User accounts are Supabase Auth users plus public.profiles.
 * Passwords are never stored in this app.
 */
export { listProfiles as loadUsers } from './authService';
