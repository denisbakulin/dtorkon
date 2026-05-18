import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { alpha, Box, IconButton, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import {
  clearPersistentAudio,
  getPersistentAudioSnapshot,
  subscribePersistentAudio,
} from '../../lib/persistent-audio';
import { AudioCollectionDialog } from '../audio-collection-dialog/audio-collection-dialog';
import { AudioPlayer } from '../audio-player/audio-player';

export function PinnedAudioBar() {
  const [snapshot, setSnapshot] = useState(() => getPersistentAudioSnapshot());
  const [isAlbumOpen, setIsAlbumOpen] = useState(false);

  useEffect(() => subscribePersistentAudio(setSnapshot), []);

  const hasTrack = !!snapshot.src;

  const safeTitle = useMemo(() => snapshot.title || 'Audio', [snapshot.title]);
  const safeSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (snapshot.collection?.contextLabel) {
      parts.push(snapshot.collection.contextLabel);
    }
    if (snapshot.collection?.tracks.length && snapshot.collection.tracks.length > 1) {
      parts.push(`${snapshot.collection.tracks.length} трека`);
    } else if (snapshot.collection?.title && snapshot.collection.title !== snapshot.title) {
      parts.push(snapshot.collection.title);
    } else if (snapshot.subtitle) {
      parts.push(snapshot.subtitle);
    }
    return parts.join(' · ') || null;
  }, [snapshot.collection, snapshot.subtitle, snapshot.title]);

  if (!hasTrack || !snapshot.src) return null;

  return (
    <>
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
          <Box
            onClick={() => setIsAlbumOpen(true)}
            sx={{ cursor: 'pointer', flex: 1, minWidth: 0 }}
          >
            <AudioPlayer
              collection={snapshot.collection}
              onOpenAlbum={() => setIsAlbumOpen(true)}
              src={snapshot.src}
              subtitle={safeSubtitle}
              title={safeTitle}
              trackId={snapshot.trackId}
              waveformAction="open"
            />
            
          </Box>
          <IconButton
            aria-label="Close player"
            onClick={(event) => {
              event.stopPropagation();
              clearPersistentAudio();
            }}
            size="small"
            sx={{ mt: 0.25 }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>
      <AudioCollectionDialog onClose={() => setIsAlbumOpen(false)} open={isAlbumOpen} />
    </>
  );
}
