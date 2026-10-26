import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppUser, UserRole } from '../types';
import {
  changeOwnPassword,
  createStaffAccount,
  fetchProfile,
  listProfiles,
  replaceOwnLogin,
  sendPasswordReset,
  setStaffPassword,
  signInAccount,
  signOutAccount,
  signUpAccount,
  updateOwnProfile,
  updateStaffProfile,
} from '../services/authService';
import { isSupabaseConfigured } from '../lib/supabase';
import { loadFlag, saveFlag, STORAGE_KEYS } from '../store/persist';

interface AuthContextType {
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  startAtLogin: boolean;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
  selectedRole: UserRole | null;
  setSelectedRole: (role: UserRole) => void;
  user: AppUser | null;
  users: AppUser[];
  login: (identifier: string, password: string, role?: UserRole) => Promise<string | null>;
  signup: (payload: {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
  }) => Promise<string | null>;
  logout: () => Promise<void>;
  updateUserProfile: (
    profile: Partial<Pick<AppUser, 'name' | 'email' | 'phone' | 'address' | 'department' | 'faculty' | 'avatarUrl'>>
  ) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<string | null>;
  replaceLogin: (currentPassword: string, username: string, password: string) => Promise<string | null>;
  requestPasswordReset: (
    identifier: string,
    password: string
  ) => Promise<{ ok: boolean; message: string }>;
  upsertUser: (user: AppUser) => Promise<string | null>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [startAtLogin, setStartAtLogin] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    const boot = async () => {
      const onboarded = await loadFlag(STORAGE_KEYS.onboarding);
      setHasCompletedOnboarding(onboarded);
      if (isSupabaseConfigured()) {
        await signOutAccount();
      }
      setIsBootstrapping(false);
    };
    boot();
  }, []);

  const completeOnboarding = async () => {
    setHasCompletedOnboarding(true);
    await saveFlag(STORAGE_KEYS.onboarding, true);
  };

  const refreshUsers = async () => {
    if (!isSupabaseConfigured()) return;
    const loaded = await listProfiles();
    setUsers(loaded.map((account) => ({ ...account, password: '' })));
  };

  const login = async (identifier: string, password: string, role?: UserRole) => {
    try {
      const result = await signInAccount(identifier, password, role);
      if ('error' in result) return result.error;
      setUser({ ...result.user, password: '' });
      setSelectedRole(result.user.role);
      if (result.user.role === 'Admin') {
        const loaded = await listProfiles();
        setUsers(loaded.map((account) => ({ ...account, password: '' })));
      } else {
        setUsers([{ ...result.user, password: '' }]);
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Sign in failed.';
    }
  };

  const signup = async (payload: {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
  }) => {
    try {
      const result = await signUpAccount(payload);
      if ('error' in result) return result.error;
      setUser({ ...result.user, password: '' });
      setSelectedRole(result.user.role);
      setUsers([{ ...result.user, password: '' }]);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Sign up failed.';
    }
  };

  const logout = async () => {
    setStartAtLogin(true);
    setUser(null);
    setUsers([]);
    if (isSupabaseConfigured()) await signOutAccount();
  };

  const updateUserProfile = async (
    profile: Partial<Pick<AppUser, 'name' | 'email' | 'phone' | 'address' | 'department' | 'faculty' | 'avatarUrl'>>
  ) => {
    if (!user) return;
    await updateOwnProfile(profile);
    const refreshed = await fetchProfile(user.id);
    if (!refreshed) return;
    const next = { ...refreshed, password: '' };
    setUser(next);
    setUsers((current) => current.map((account) => (account.id === next.id ? next : account)));
  };

  const changePassword = async (current: string, nextPass: string) => {
    return changeOwnPassword(current, nextPass);
  };

  const replaceLogin = async (currentPassword: string, username: string, password: string) => {
    const result = await replaceOwnLogin(currentPassword, username, password);
    if (typeof result === 'string') return result;
    const next = { ...result, password: '' };
    setUser(next);
    setUsers((current) => current.map((account) => (account.id === next.id ? next : account)));
    return null;
  };

  const requestPasswordReset = async (identifier: string, password: string) =>
    sendPasswordReset(identifier, password);

  const upsertUser = async (nextUser: AppUser) => {
    const existing = users.some((account) => account.id === nextUser.id && !nextUser.id.startsWith('user-'));
    try {
      if (!existing) {
        const created = await createStaffAccount({
          username: nextUser.username,
          email: nextUser.email,
          password: nextUser.password,
          name: nextUser.name,
          role: nextUser.role,
          phone: nextUser.phone,
          address: nextUser.address,
          department: nextUser.department,
          faculty: nextUser.faculty,
        });
        if ('error' in created) return created.error;
        await refreshUsers();
        return null;
      }

      const profileError = await updateStaffProfile({ ...nextUser, password: '' });
      if (profileError) return profileError;
      if (nextUser.password.trim()) {
        const passwordError = await setStaffPassword(nextUser.id, nextUser.password, nextUser.email);
        if (passwordError) return passwordError;
      }
      await refreshUsers();
      if (user?.id === nextUser.id) {
        const refreshed = await fetchProfile(nextUser.id);
        if (refreshed) setUser({ ...refreshed, password: '' });
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'The account could not be saved.';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isBootstrapping,
        isAuthenticated: !!user,
        startAtLogin,
        hasCompletedOnboarding,
        completeOnboarding,
        selectedRole,
        setSelectedRole,
        user,
        users,
        login,
        signup,
        logout,
        updateUserProfile,
        changePassword,
        replaceLogin,
        requestPasswordReset,
        upsertUser,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
