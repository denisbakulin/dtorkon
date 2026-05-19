import { Box } from '@mui/material';
import type { PropsWithChildren } from 'react';

import { SiteHeader } from '../site-header/site-header';
import { PinnedAudioBar } from '../pinned-audio-bar/pinned-audio-bar';

type SiteShellProps = PropsWithChildren<{
  lockViewport?: boolean;
}>;

export function SiteShell({ children, lockViewport = false }: SiteShellProps) {
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
      <SiteHeader />
      <PinnedAudioBar />
      <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>{children}</Box>
    </Box>
  );
}
