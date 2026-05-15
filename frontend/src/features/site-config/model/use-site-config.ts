import { useEffect, useState } from 'react';

import { getSiteConfig } from '../api/get-site-config';
import type { SiteConfig } from '../types/site-config';

type UseSiteConfigState = {
  data: SiteConfig | null;
  error: string | null;
  isLoading: boolean;
};

const initialState: UseSiteConfigState = {
  data: null,
  error: null,
  isLoading: true,
};

export function useSiteConfig() {
  const [state, setState] = useState<UseSiteConfigState>(initialState);

  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      try {
        const data = await getSiteConfig();

        if (!isMounted) {
          return;
        }

        setState({
          data,
          error: null,
          isLoading: false,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setState({
          data: null,
          error:
            error instanceof Error
              ? error.message
              : 'Не удалось загрузить статический site-config.json',
          isLoading: false,
        });
      }
    }

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}

