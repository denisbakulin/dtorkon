import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { alpha, Box, IconButton, Stack, Typography } from '@mui/material';
import { type KeyboardEventHandler, type MouseEventHandler, useEffect, useMemo, useRef, useState } from 'react';

type AudioPlayerProps = {
  src: string;
  title?: string | null;
  subtitle?: string | null;
};

export function AudioPlayer({ src, subtitle, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const bars = useMemo(() => {
    const barCount = 64;
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

  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const formattedTime = useMemo(() => formatTime(duration || 0), [duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncDuration = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
      // Some browsers update duration after playback starts (e.g. for webm).
      syncDuration();
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', syncDuration);
    audio.addEventListener('durationchange', syncDuration);
    audio.addEventListener('canplay', syncDuration);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', syncDuration);
      audio.removeEventListener('durationchange', syncDuration);
      audio.removeEventListener('canplay', syncDuration);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  useEffect(() => {
    // If src changes, reset state.
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.load();
  }, [src]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        // Ignore autoplay / gesture errors
      }
    } else {
      audio.pause();
    }
  };

  const seekByRatio = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, ratio * audio.duration));
  };

  const onWaveformClick: MouseEventHandler<HTMLDivElement> = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = rect.width > 0 ? x / rect.width : 0;
    seekByRatio(ratio);
  };

  const onWaveformKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
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
              <Typography color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} variant="caption">
                {subtitle}
              </Typography>
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
          onClick={togglePlay}
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
          onClick={onWaveformClick}
          onKeyDown={onWaveformKeyDown}
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
            outline: 'none',
            position: 'relative',
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
                  minWidth: 2,
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

        <Typography sx={{ flex: '0 0 auto', fontVariantNumeric: 'tabular-nums' }} variant="body2">
          {formattedTime}
        </Typography>

        <audio preload="metadata" ref={audioRef} src={src} />
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
