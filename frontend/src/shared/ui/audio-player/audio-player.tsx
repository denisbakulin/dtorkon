import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { alpha, Box, IconButton, Stack, Typography } from '@mui/material';
import { type KeyboardEventHandler, type PointerEventHandler, useEffect, useMemo, useState } from 'react';

import {
  type AudioCollection,
  getPersistentAudioSnapshot,
  playPersistentAudio,
  seekPersistentAudioByRatio,
  subscribePersistentAudio,
  togglePersistentAudio,
} from '../../lib/persistent-audio';

type AudioPlayerProps = {
  src: string;
  title?: string | null;
  subtitle?: string | null;
  trackId?: string | null;
  collection?: AudioCollection | null;
  waveformAction?: 'seek' | 'open';
  onOpenAlbum?: (() => void) | null;
};

export function AudioPlayer({
  src,
  subtitle,
  title,
  trackId,
  collection,
  waveformAction = 'seek',
  onOpenAlbum,
}: AudioPlayerProps) {
  const [snapshot, setSnapshot] = useState(() => getPersistentAudioSnapshot());

  const bars = useMemo(() => {
    const barCount = 50;
    let hash = 0;
    for (let i = 0; i < src.length; i += 1) {
      hash = (hash * 31 + src.charCodeAt(i)) >>> 0;
    }

    const next = () => {
      // xorshift32
      hash ^= hash << 13;
      hash ^= hash >>> 17;
      hash ^= hash << 5;
      return (hash >>> 0) / 0xffffffff;
    };

    const result: number[] = [];
    for (let i = 0; i < barCount; i += 1) {
      // Bias to mid heights with some variation (Telegram-ish waveform)
      const r = next();
      const shaped = Math.pow(r, 0.65);
      const h = 6 + Math.round(shaped * 18); // px
      result.push(h);
    }
    return result;
  }, [src]);

  const isActive = snapshot.src === src;
  const isPlaying = isActive && snapshot.isPlaying;
  const currentTime = isActive ? snapshot.currentTime : 0;
  const duration = isActive ? snapshot.duration : 0;

  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const formattedTime = useMemo(() => `${formatTime(currentTime)} / ${formatTime(duration)}`, [currentTime, duration]);

  useEffect(() => {
    return subscribePersistentAudio(setSnapshot);
  }, []);

  const togglePlay = () => {
    togglePersistentAudio({ src, title, subtitle, trackId, collection });
  };

  const seekToRatio = (ratio: number) => {
    if (isActive) {
      seekPersistentAudioByRatio(ratio);
    } else {
      // Start playback on first interaction, then seek when metadata loads.
      void playPersistentAudio({ src, title, subtitle, trackId, collection });
      seekPersistentAudioByRatio(ratio);
    }
  };

  const seekFromClientX = (clientX: number, element: HTMLDivElement) => {
    const rect = element.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = rect.width > 0 ? x / rect.width : 0;
    seekToRatio(ratio);
  };

  const releaseWaveformPointer = (event: Parameters<PointerEventHandler<HTMLDivElement>>[0]) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onWaveformPointerDown: PointerEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    if (waveformAction === 'open') {
      onOpenAlbum?.();
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromClientX(e.clientX, e.currentTarget);
  };

  const onWaveformPointerMove: PointerEventHandler<HTMLDivElement> = (e) => {
    if (waveformAction === 'open' || e.buttons !== 1) return;
    e.stopPropagation();
    seekFromClientX(e.clientX, e.currentTarget);
  };

  const onWaveformPointerUp: PointerEventHandler<HTMLDivElement> = (e) => {
    releaseWaveformPointer(e);
  };

  const onWaveformPointerCancel: PointerEventHandler<HTMLDivElement> = (e) => {
    releaseWaveformPointer(e);
  };

  const onWaveformKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (waveformAction === 'open') {
      onOpenAlbum?.();
      return;
    }
    togglePlay();
  };

  return (
    <Box>
      {(title || subtitle) && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, minWidth: 0 }}>
          <Box sx={{ minWidth: 0 }}>
            {title ? (
              <Typography sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} variant="body2">
                {title}
              </Typography>
            ) : null}
            {subtitle ? (
              <></>
            ) : null}
          </Box>
        </Stack>
      )}
      <Box
        sx={(t) => ({
          alignItems: 'center',
          bgcolor: t.palette.mode === 'dark' ? alpha(t.palette.warning.dark, 0.15) : alpha(t.palette.warning.light, 0.22),
          borderRadius: 2,
          display: 'flex',
          gap: 1.25,
          px: 1.25,
          py: 0.9,
          width: '100%',
        })}
      >
        
        <IconButton
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={(event) => {
            event.stopPropagation();
            togglePlay();
          }}
          size="small"
          sx={{
            bgcolor: 'transparent',
            color: 'text.primary',
            flex: '0 0 auto',
          }}
        >
          {isPlaying ? <PauseRoundedIcon fontSize="large" /> : <PlayArrowRoundedIcon fontSize="large" />}
        </IconButton>

        <Box
          aria-label="Audio waveform"
          onKeyDown={onWaveformKeyDown}
          onPointerCancel={onWaveformPointerCancel}
          onPointerDown={onWaveformPointerDown}
          onPointerMove={onWaveformPointerMove}
          onPointerUp={onWaveformPointerUp}
          role="button"
          tabIndex={0}
          sx={(t) => ({
            alignItems: 'center',
            cursor: 'pointer',
            display: 'flex',
            flex: 1,
            gap: '2px',
            height: 28,
            justifyContent: 'space-between',
            minWidth: 0,
            outline: 'none',
            position: 'relative',
            touchAction: 'none',
            userSelect: 'none',
            '&:focus-visible': {
              boxShadow: `0 0 0 2px ${alpha(t.palette.primary.main, 0.35)}`,
              borderRadius: 2,
            },
          })}
        >
          {bars.map((h, i) => {
            const filled = i / (bars.length - 1) <= progress;
            return (
              <Box
                key={`${i}-${h}`}
                sx={(t) => ({
                  bgcolor: filled ? alpha(t.palette.success.dark, 0.55) : alpha(t.palette.success.dark, 0.28),
                  borderRadius: 999,
                  flex: '1 1 0',
                  height: h,
                  maxWidth: 4,
                  minWidth: 0,
                })}
              />
            );
          })}
          <Box
            sx={{
              bgcolor: 'text.secondary',
              borderRadius: '50%',
              height: 12,
              left: `${progress * 100}%`,
              opacity: 0.9,
              position: 'absolute',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 12,
            }}
          />
        </Box>
        

        <Typography
          sx={{ flex: '0 0 auto', fontVariantNumeric: 'tabular-nums', minWidth: { xs: 86, sm: 92 }, textAlign: 'right' }}
          variant="body2"
        >
          {formattedTime}
        </Typography>
      </Box>
    </Box>
  );
}

function formatTime(totalSeconds: number) {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
