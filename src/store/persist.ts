import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  users: 'umma.users',
  session: 'umma.session',
  records: 'umma.records',
  requests: 'umma.requests',
  history: 'umma.history',
  settings: 'umma.settings',
  onboarding: 'umma.onboardingComplete',
  theme: 'umma.theme',
};

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadFlag(key: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(key);
  return raw === 'true';
}

export async function saveFlag(key: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key, value ? 'true' : 'false');
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
