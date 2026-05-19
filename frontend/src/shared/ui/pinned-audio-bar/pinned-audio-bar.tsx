import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import NavigateBeforeRoundedIcon from '@mui/icons-material/NavigateBeforeRounded';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import { alpha, Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import {
  clearPersistentAudio,
  cyclePersistentAudioPlaybackRate,
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
  const playbackRateLabel = useMemo(() => formatPlaybackRate(snapshot.playbackRate), [snapshot.playbackRate]);
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
  const trackPositionLabel = useMemo(() => {
    const tracks = snapshot.collection?.tracks ?? [];
    if (tracks.length <= 1) return null;

    const trackIndex = tracks.findIndex((track) => track.id === snapshot.trackId || track.src === snapshot.src);
    return trackIndex >= 0 ? `${trackIndex + 1}/${tracks.length}` : null;
  }, [snapshot.collection, snapshot.src, snapshot.trackId]);

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
        <Stack spacing={0.75} sx={{ width: '100%' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                <Typography
                  sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  variant="body2"
                >
                  {safeTitle}
                </Typography>
                <Tooltip title="Скорость воспроизведения">
                  <Box
                    aria-label={`Скорость воспроизведения ${playbackRateLabel}`}
                    component="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      cyclePersistentAudioPlaybackRate();
                    }}
                    sx={(t) => ({
                      border: `1px solid ${alpha(t.palette.divider, 0.72)}`,
                      borderRadius: 999,
                      bgcolor: alpha(t.palette.background.paper, t.palette.mode === 'dark' ? 0.2 : 0.55),
                      color: 'text.secondary',
                      cursor: 'pointer',
                      flex: '0 0 auto',
                      font: 'inherit',
                      fontSize: 12,
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.35,
                      px: 0.75,
                      py: 0.1,
                      '&:hover': {
                        bgcolor: alpha(t.palette.primary.main, 0.1),
                        color: 'primary.main',
                      },
                    })}
                    type="button"
                  >
                    {playbackRateLabel}
                  </Box>
                </Tooltip>
              </Stack>
              {safeSubtitle ? (
                <Typography
                  color="text.secondary"
                  sx={{ display: { xs: 'none', sm: 'block' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  variant="caption"
                >
                  {safeSubtitle}
                </Typography>
              ) : null}
            </Box>
            <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', flex: '0 0 auto' }}>
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

          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', width: '100%' }}>
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
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <AudioPlayer
                collection={snapshot.collection}
                src={snapshot.src}
                title={null}
                trackId={snapshot.trackId}
                waveformAction="seek"
              />
            </Box>
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
          </Stack>
        </Stack>
      </Box>
      <AudioCollectionDialog onClose={() => setIsAlbumOpen(false)} open={isAlbumOpen} />
    </>
  );
}

function formatPlaybackRate(rate: number) {
  return `${Number.isInteger(rate) ? rate.toFixed(0) : rate.toFixed(2).replace(/0$/, '')}x`;
}
