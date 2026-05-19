import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { alpha, Box, IconButton, Stack, Typography } from '@mui/material';
import { type KeyboardEventHandler, type PointerEventHandler, useEffect, useId, useMemo, useState } from 'react';

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
  const waveformId = useId();

  const bars = useMemo(() => {
    const barCount = 72;
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
  const waveformClipId = useMemo(() => `audio-wave-${waveformId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [waveformId]);
  const waveformPath = useMemo(() => createWaveformPath(bars), [bars]);

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
          position: 'relative',
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
            height: 28,
            minWidth: 0,
            outline: 'none',
            position: 'relative',
            touchAction: 'none',
            userSelect: 'none',
            '--audio-wave-empty': alpha(t.palette.success.dark, t.palette.mode === 'dark' ? 0.32 : 0.26),
            '--audio-wave-filled': alpha(t.palette.success.dark, t.palette.mode === 'dark' ? 0.74 : 0.58),
            '&:focus-visible': {
              boxShadow: `0 0 0 2px ${alpha(t.palette.primary.main, 0.35)}`,
              borderRadius: 2,
            },
          })}
        >
          <Box
            aria-hidden="true"
            component="svg"
            preserveAspectRatio="none"
            sx={{ display: 'block', height: 28, overflow: 'visible', width: '100%' }}
            viewBox="0 0 100 28"
          >
            <defs>
              <clipPath id={waveformClipId}>
                <rect height="28" width={progress * 100} x="0" y="0" />
              </clipPath>
            </defs>
            <path d={waveformPath} fill="var(--audio-wave-empty)" />
            <path clipPath={`url(#${waveformClipId})`} d={waveformPath} fill="var(--audio-wave-filled)" />
          </Box>
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
          sx={(t) => ({
            bgcolor: alpha(t.palette.background.paper, t.palette.mode === 'dark' ? 0.42 : 0.62),
            borderRadius: 999,
            bottom: 4,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.35,
            px: 0.75,
            pointerEvents: 'none',
            position: 'absolute',
            right: 8,
          })}
          variant="caption"
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

function createWaveformPath(samples: number[]) {
  const width = 100;
  const center = 14;
  const maxSample = 24;
  const maxAmplitude = 10;

  const points = samples.map((sample, index) => {
    const x = samples.length > 1 ? (index / (samples.length - 1)) * width : 0;
    const amplitude = Math.max(3, Math.min(maxAmplitude, (sample / maxSample) * maxAmplitude));
    return { amplitude, x };
  });

  const top = points.map(({ amplitude, x }) => ({ x, y: center - amplitude }));
  const bottom = points.map(({ amplitude, x }) => ({ x, y: center + amplitude })).reverse();

  return `${createSmoothPath(top, true)} ${createSmoothPath(bottom, false)} Z`;
}

function createSmoothPath(points: Array<{ x: number; y: number }>, moveToStart: boolean) {
  if (points.length === 0) return '';

  let path = `${moveToStart ? 'M' : 'L'} ${formatPoint(points[0].x)} ${formatPoint(points[0].y)}`;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const midX = (previous.x + point.x) / 2;
    const midY = (previous.y + point.y) / 2;
    path += ` Q ${formatPoint(previous.x)} ${formatPoint(previous.y)} ${formatPoint(midX)} ${formatPoint(midY)}`;
  }

  const last = points[points.length - 1];
  return `${path} L ${formatPoint(last.x)} ${formatPoint(last.y)}`;
}

function formatPoint(value: number) {
  return Number(value.toFixed(2));
}
