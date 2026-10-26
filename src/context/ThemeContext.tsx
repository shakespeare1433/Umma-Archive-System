import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import { loadJson, saveJson, STORAGE_KEYS } from '../store/persist';

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = ColorScheme;

interface ThemeContextValue {
  theme: ColorScheme;
  preference: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

function isPreference(value: string): value is ThemePreference {
  return value === 'light' || value === 'dark';
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  preference: 'light',
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreference] = useState<ThemePreference>('light');

  useEffect(() => {
    loadJson<string>(STORAGE_KEYS.theme, 'light').then((saved) => {
      if (isPreference(saved)) {
        setPreference(saved);
        return;
      }
      if (saved === 'system') {
        const next: ThemePreference = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
        setPreference(next);
        void saveJson(STORAGE_KEYS.theme, next);
      }
    });
  }, []);

  const setTheme = (next: ThemePreference) => {
    setPreference(next);
    void saveJson(STORAGE_KEYS.theme, next);
  };

  const theme = preference;

  return (
    <ThemeContext.Provider value={{ theme, preference, setTheme }}>{children}</ThemeContext.Provider>
  );
};

export function useTheme() {
  return useContext(ThemeContext);
}

export function lecturerPalette(theme: ColorScheme) {
  const dark = theme === 'dark';
  return {
    dark,
    page: dark ? '#0F172A' : '#F4F7FC',
    card: dark ? '#1E293B' : '#FFFFFF',
    ink: dark ? '#F8FAFC' : '#1E2B58',
    body: dark ? '#E2E8F0' : '#1E293B',
    muted: dark ? '#94A3B8' : '#64748B',
    line: dark ? '#334155' : '#E2E8F0',
    field: dark ? '#0F172A' : '#F1F5F9',
    soft: dark ? '#334155' : '#E2E8F0',
  };
}
