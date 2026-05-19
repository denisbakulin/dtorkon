import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import Forward10RoundedIcon from '@mui/icons-material/Forward10Rounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import NavigateBeforeRoundedIcon from '@mui/icons-material/NavigateBeforeRounded';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import Replay10RoundedIcon from '@mui/icons-material/Replay10Rounded';
import { alpha, Box, Chip, IconButton, Slider, Stack, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import {
  clearPersistentAudio,
  getPersistentAudioSnapshot,
  playNextPersistentAudio,
  playPreviousPersistentAudio,
  seekPersistentAudioByDelta,
  seekPersistentAudioByRatio,
  subscribePersistentAudio,
  togglePersistentAudio,
} from '../../lib/persistent-audio';
import { AudioCollectionDialog } from '../audio-collection-dialog/audio-collection-dialog';

export function PinnedAudioBar() {
  const [snapshot, setSnapshot] = useState(() => getPersistentAudioSnapshot());
  const [isAlbumOpen, setIsAlbumOpen] = useState(false);

  useEffect(() => subscribePersistentAudio(setSnapshot), []);

  const hasTrack = !!snapshot.src;

  const safeTitle = useMemo(() => snapshot.title || 'Audio', [snapshot.title]);
  const safeSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (snapshot.subtitle) {
      parts.push(snapshot.subtitle);
    }
    if (snapshot.collection?.contextLabel) {
      parts.push(snapshot.collection.contextLabel);
    }
    if (snapshot.collection?.title && snapshot.collection.title !== snapshot.title) {
      parts.push(snapshot.collection.title);
    }
    if (snapshot.collection?.tracks.length && snapshot.collection.tracks.length > 1) {
      parts.push(`${snapshot.collection.tracks.length} трека`);
    }
    return parts.join(' · ') || null;
  }, [snapshot.collection, snapshot.subtitle, snapshot.title]);

  const trackIndex = useMemo(() => {
    if (!snapshot.collection) return -1;
    return snapshot.collection.tracks.findIndex((track) => track.id === snapshot.trackId || track.src === snapshot.src);
  }, [snapshot.collection, snapshot.src, snapshot.trackId]);

  const trackCount = snapshot.collection?.tracks.length ?? 0;
  const trackLabel = trackIndex >= 0 && trackCount > 1 ? `${trackIndex + 1}/${trackCount}` : null;
  const canGoPrevious = trackIndex > 0;
  const canGoNext = trackIndex >= 0 && trackIndex < trackCount - 1;
  const duration = snapshot.duration || 0;
  const currentTime = snapshot.currentTime || 0;
  const progressValue = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;

  if (!hasTrack || !snapshot.src) return null;

  const togglePlay = () => {
    togglePersistentAudio({
      collection: snapshot.collection,
      src: snapshot.src!,
      subtitle: snapshot.subtitle,
      title: snapshot.title,
      trackId: snapshot.trackId,
    });
  };

  const seekToPercent = (_event: Event, value: number | number[]) => {
    const nextValue = Array.isArray(value) ? value[0] : value;
    seekPersistentAudioByRatio(nextValue / 100);
  };

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
          bgcolor: alpha(t.palette.background.paper, t.palette.mode === 'dark' ? 0.78 : 0.9),
          backdropFilter: 'blur(24px) saturate(180%)',
          boxShadow:
            t.palette.mode === 'dark'
              ? '0 18px 36px rgba(2, 6, 23, 0.34)'
              : '0 18px 36px rgba(91, 114, 138, 0.12)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        })}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 1.1, md: 1.75 }}
          sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flex: '1 1 300px', minWidth: 0 }}>
            <Box
              onClick={() => setIsAlbumOpen(true)}
              sx={(t) => ({
                alignItems: 'center',
                background:
                  t.palette.mode === 'dark'
                    ? `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.44)}, ${alpha('#020617', 0.24)})`
                    : `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.32)}, ${alpha(t.palette.background.paper, 0.78)})`,
                border: `1px solid ${alpha(t.palette.primary.main, 0.22)}`,
                borderRadius: 2,
                color: 'primary.main',
                cursor: 'pointer',
                display: 'flex',
                flex: '0 0 auto',
                height: 46,
                justifyContent: 'center',
                width: 46,
              })}
            >
              <LibraryMusicRoundedIcon />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                <Typography
                  sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  variant="body2"
                >
                  {safeTitle}
                </Typography>
                {trackLabel ? <Chip label={trackLabel} size="small" variant="outlined" /> : null}
              </Stack>
              {safeSubtitle ? (
                <Typography
                  color="text.secondary"
                  sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  variant="caption"
                >
                  {safeSubtitle}
                </Typography>
              ) : null}
            </Box>
          </Stack>

          <Stack spacing={0.35} sx={{ flex: '1.4 1 420px', minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 42 }} variant="caption">
                {formatTime(currentTime)}
              </Typography>
              <Slider
                aria-label="Перемотать аудио"
                disabled={duration <= 0}
                min={0}
                onChange={seekToPercent}
                size="small"
                sx={{
                  color: 'primary.main',
                  flex: 1,
                  minWidth: 0,
                  '& .MuiSlider-rail': { opacity: 0.22 },
                  '& .MuiSlider-thumb': {
                    height: 14,
                    width: 14,
                  },
                }}
                value={progressValue}
              />
              <Typography color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 42, textAlign: 'right' }} variant="caption">
                {formatTime(duration)}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
              <Tooltip title="Предыдущий трек">
                <span>
                  <IconButton disabled={!canGoPrevious} onClick={() => playPreviousPersistentAudio()} size="small">
                    <NavigateBeforeRoundedIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Назад на 10 секунд">
                <span>
                  <IconButton disabled={duration <= 0} onClick={() => seekPersistentAudioByDelta(-10)} size="small">
                    <Replay10RoundedIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <IconButton
                aria-label={snapshot.isPlaying ? 'Пауза' : 'Воспроизвести'}
                onClick={togglePlay}
                size="small"
                sx={(t) => ({
                  bgcolor: 'primary.main',
                  color: t.palette.primary.contrastText,
                  mx: 0.5,
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                })}
              >
                {snapshot.isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
              </IconButton>
              <Tooltip title="Вперёд на 10 секунд">
                <span>
                  <IconButton disabled={duration <= 0} onClick={() => seekPersistentAudioByDelta(10)} size="small">
                    <Forward10RoundedIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Следующий трек">
                <span>
                  <IconButton disabled={!canGoNext} onClick={() => playNextPersistentAudio()} size="small">
                    <NavigateNextRoundedIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: { xs: 'flex-end', md: 'center' } }}>
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

function formatTime(totalSeconds: number) {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
