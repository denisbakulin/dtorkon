import { Box } from '@mui/material';
import type { PropsWithChildren } from 'react';
import { useLocation } from 'react-router-dom';

import { SiteHeader } from '../site-header/site-header';
import { PinnedAudioBar } from '../pinned-audio-bar/pinned-audio-bar';

type SiteShellProps = PropsWithChildren<{
  lockViewport?: boolean;
}>;

export function SiteShell({ children, lockViewport = false }: SiteShellProps) {
  const location = useLocation();
  const hideHeader = location.pathname.startsWith('/admin');

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: lockViewport ? undefined : '100dvh',
        height: lockViewport ? '100dvh' : undefined,
        overflow: lockViewport ? 'hidden' : undefined,
      }}
    >
      {!hideHeader ? <SiteHeader /> : null}
      {!hideHeader ? <PinnedAudioBar /> : null}
      <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>{children}</Box>
    </Box>
  );
}
