import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import NavigateBeforeRoundedIcon from '@mui/icons-material/NavigateBeforeRounded';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import { alpha, Box, IconButton, Stack, Tooltip } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import {
  clearPersistentAudio,
  getPersistentAudioSnapshot,
  hasPersistentAudioNextTrack,
  hasPersistentAudioPreviousTrack,
  playNextPersistentAudio,
  playPreviousPersistentAudio,
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

  const canGoPrevious = hasPersistentAudioPreviousTrack();
  const canGoNext = hasPersistentAudioNextTrack();

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
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <AudioPlayer
              collection={snapshot.collection}
              src={snapshot.src}
              subtitle={safeSubtitle}
              title={safeTitle}
              trackId={snapshot.trackId}
              waveformAction="seek"
            />
          </Box>
          <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', mt: 3.25 }}>
            <Tooltip title="Предыдущий трек">
              <span>
                <IconButton
                  aria-label="Предыдущий трек"
                  disabled={!canGoPrevious}
                  onClick={() => playPreviousPersistentAudio()}
                  size="small"
                >
                  <NavigateBeforeRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Следующий трек">
              <span>
                <IconButton
                  aria-label="Следующий трек"
                  disabled={!canGoNext}
                  onClick={() => playNextPersistentAudio()}
                  size="small"
                >
                  <NavigateNextRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Открыть альбом">
              <IconButton aria-label="Открыть альбом" onClick={() => setIsAlbumOpen(true)} size="small">
                <LibraryMusicRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Закрыть плеер">
              <IconButton
                aria-label="Close player"
                onClick={(event) => {
                  event.stopPropagation();
                  clearPersistentAudio();
                }}
                size="small"
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>
      <AudioCollectionDialog onClose={() => setIsAlbumOpen(false)} open={isAlbumOpen} />
    </>
  );
}
