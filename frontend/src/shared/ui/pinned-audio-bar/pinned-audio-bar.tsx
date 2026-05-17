import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { alpha, Box, IconButton, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import {
  getPersistentAudioSnapshot,
  clearPersistentAudio,
  subscribePersistentAudio,
} from '../../lib/persistent-audio';
import { AudioPlayer } from '../audio-player/audio-player';

export function PinnedAudioBar() {
  const [snapshot, setSnapshot] = useState(() => getPersistentAudioSnapshot());

  useEffect(() => subscribePersistentAudio(setSnapshot), []);

  const hasTrack = !!snapshot.src;

  const safeTitle = useMemo(() => snapshot.title || 'Audio', [snapshot.title]);
  const safeSubtitle = useMemo(() => snapshot.subtitle || null, [snapshot.subtitle]);

  if (!hasTrack || !snapshot.src) return null;

  return (
    <Box
      sx={(t) => ({
        position: 'sticky',
        top: { xs: 64, md: 74 },
        zIndex: t.zIndex.appBar - 1,
        px: { xs: 2, sm: 3, md: 4, lg: 6, xl: 8 },
        py: 1.25,
        borderBottom: `1px solid ${alpha(t.palette.divider, t.palette.mode === 'dark' ? 0.7 : 0.92)}`,
        bgcolor: alpha(t.palette.background.paper, t.palette.mode === 'dark' ? 0.62 : 0.78),
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      })}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }} variant="body2">
            Сейчас играет
          </Typography>
          <AudioPlayer src={snapshot.src} subtitle={safeSubtitle} title={safeTitle} />
        </Box>
        <IconButton
          aria-label="Close player"
          onClick={() => {
            clearPersistentAudio();
          }}
          size="small"
          sx={{ mt: 0.25 }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}
