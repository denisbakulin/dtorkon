import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getSiteProfile } from '../../shared/api/blog-api';
import type { SiteProfile } from '../../shared/api/blog-contract';
import { getApiErrorMessage } from '../../shared/api/api-error';

type SiteProfileContextValue = {
  siteProfile: SiteProfile | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setSiteProfile: (profile: SiteProfile) => void;
};

const SiteProfileContext = createContext<SiteProfileContextValue | null>(null);

export function SiteProfileProvider({ children }: PropsWithChildren) {
  const [siteProfile, setSiteProfileState] = useState<SiteProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const controller = new AbortController();

    try {
      setError(null);
      const nextProfile = await getSiteProfile(controller.signal);
      setSiteProfileState(nextProfile);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Unable to load site profile.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<SiteProfileContextValue>(
    () => ({
      siteProfile,
      isLoading,
      error,
      refresh,
      setSiteProfile: (profile) => setSiteProfileState(profile),
    }),
    [error, isLoading, refresh, siteProfile],
  );

  return <SiteProfileContext.Provider value={value}>{children}</SiteProfileContext.Provider>;
}

export function useSiteProfile() {
  const context = useContext(SiteProfileContext);
  if (!context) {
    throw new Error('useSiteProfile must be used inside SiteProfileProvider');
  }
  return context;
}

