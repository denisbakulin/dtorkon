import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { getApiErrorStatus } from '../../shared/api/api-error';
import { getAdminSession, logoutAdmin } from '../../shared/api/admin-api';
import type { AdminSession } from '../../shared/api/admin-contract';
import type { AccentPreset, ThemePreset } from './app-theme';

const THEME_STORAGE_KEY = 'dtorkon_theme_preset';
const ACCENT_STORAGE_KEY = 'dtorkon_accent_preset';

type GuestPreferences = {
  themePreset: ThemePreset;
  accentPreset: AccentPreset;
};

type AuthContextValue = {
  session: AdminSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  guestPreferences: GuestPreferences;
  activeThemePreset: ThemePreset;
  activeAccentPreset: AccentPreset;
  refreshSession: () => Promise<void>;
  applyGuestPreferences: (preferences: Partial<GuestPreferences>) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeAccentPreset(value: string | null): AccentPreset {
  if (value === 'mono' || value === 'ember' || value === 'sky') {
    return value;
  }
  return 'sky';
}

function readStoredPreferences(): GuestPreferences {
  if (typeof window === 'undefined') {
    return { themePreset: 'light', accentPreset: 'sky' };
  }

  const themePreset = (window.localStorage.getItem(THEME_STORAGE_KEY) as ThemePreset | null) ?? 'light';
  const accentPreset = normalizeAccentPreset(window.localStorage.getItem(ACCENT_STORAGE_KEY));
  return { themePreset, accentPreset };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guestPreferences, setGuestPreferences] = useState<GuestPreferences>(readStoredPreferences);

  const refreshSession = async () => {
    try {
      const nextSession = await getAdminSession();
      setSession(nextSession);
    } catch (error: unknown) {
      if (getApiErrorStatus(error) === 401) {
        setSession(null);
        return;
      }
      throw error;
    }
  };

  useEffect(() => {
    let isMounted = true;

    getAdminSession()
      .then((nextSession) => {
        if (isMounted) {
          setSession(nextSession);
        }
      })
      .catch((error: unknown) => {
        if (isMounted && getApiErrorStatus(error) === 401) {
          setSession(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const applyGuestPreferences = (preferences: Partial<GuestPreferences>) => {
    setGuestPreferences((current) => {
      const next = {
        ...current,
        ...preferences,
        accentPreset: preferences.accentPreset
          ? normalizeAccentPreset(preferences.accentPreset)
          : current.accentPreset,
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_STORAGE_KEY, next.themePreset);
        window.localStorage.setItem(ACCENT_STORAGE_KEY, next.accentPreset);
      }
      return next;
    });
  };

  const logout = async () => {
    await logoutAdmin();
    setSession(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isAuthenticated: !!session,
      isAdmin: !!session,
      guestPreferences,
      activeThemePreset: guestPreferences.themePreset,
      activeAccentPreset: guestPreferences.accentPreset,
      refreshSession,
      applyGuestPreferences,
      logout,
    }),
    [guestPreferences, isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
