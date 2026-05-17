import { Box } from '@mui/material';
import type { PropsWithChildren } from 'react';
import { useLocation } from 'react-router-dom';

import { isAdminHost } from '../../lib/admin-access';
import { SiteHeader } from '../site-header/site-header';
import { PinnedAudioBar } from '../pinned-audio-bar/pinned-audio-bar';

export function SiteShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const hideHeader =
    isAdminHost() ||
    location.pathname === '/login' ||
    location.pathname.startsWith('/admin');

  return (
    <Box>
      {!hideHeader ? <SiteHeader /> : null}
      {!hideHeader ? <PinnedAudioBar /> : null}
      {children}
    </Box>
  );
}
