import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import NavigateBeforeRoundedIcon from '@mui/icons-material/NavigateBeforeRounded';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { alpha, Box, Dialog, IconButton, List, ListItemButton, Stack, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import {
  getPersistentAudioSnapshot,
  hasPersistentAudioNextTrack,
  hasPersistentAudioPreviousTrack,
  playNextPersistentAudio,
  playPersistentAudio,
  playPreviousPersistentAudio,
  subscribePersistentAudio,
} from '../../lib/persistent-audio';
import { triggerBrowserDownload } from '../../lib/download';
import { AudioPlayer } from '../audio-player/audio-player';

type AudioCollectionDialogProps = {
  onClose: () => void;
  open: boolean;
};

export function AudioCollectionDialog({ onClose, open }: AudioCollectionDialogProps) {
  const [snapshot, setSnapshot] = useState(() => getPersistentAudioSnapshot());

  useEffect(() => subscribePersistentAudio(setSnapshot), []);

  const collection = snapshot.collection;
  const tracks = collection?.tracks ?? [];
  const activeTrackIndex = useMemo(
    () => tracks.findIndex((track) => track.id === snapshot.trackId || track.src === snapshot.src),
    [snapshot.src, snapshot.trackId, tracks],
  );
  const activeTrack = activeTrackIndex >= 0 ? tracks[activeTrackIndex] : null;
  const canGoPrevious = hasPersistentAudioPreviousTrack();
  const canGoNext = hasPersistentAudioNextTrack();

  if (!open || !snapshot.src || !activeTrack) {
    return null;
  }

  const headerTitle = collection?.title || snapshot.title || 'Аудио';
  const headerSubtitle = [collection?.contextLabel, collection?.subtitle].filter(Boolean).join(' · ') || null;

  return (
    <Dialog
      fullScreen
      onClose={onClose}
      open={open}
      slotProps={{
        paper: {
          sx: (theme) => ({
            backgroundColor: theme.palette.background.default,
            backgroundImage:
              theme.palette.mode === 'dark'
                ? `radial-gradient(circle at top, ${alpha(theme.palette.primary.main, 0.22)}, transparent 34%), linear-gradient(180deg, ${theme.palette.background.default} 0%, ${theme.palette.background.default} 100%)`
                : `radial-gradient(circle at top, ${alpha(theme.palette.primary.main, 0.14)}, transparent 34%), linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
          }),
        },
      }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: 'flex-start',
            borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.9)}`,
            px: { xs: 2, sm: 3 },
            py: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: '1.3rem', sm: '1.55rem' }, fontWeight: 700 }}>
              {headerTitle}
            </Typography>
            {headerSubtitle ? (
              <Typography color="text.secondary" sx={{ mt: 0.25 }} variant="body2">
                {headerSubtitle}
              </Typography>
            ) : null}
          </Box>
          <IconButton aria-label="Закрыть альбом" onClick={onClose}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>

        <Stack spacing={2.5} sx={{ flex: 1, overflow: 'auto', px: { xs: 2, sm: 3 }, py: 2.5 }}>
          <Stack
            sx={{
              backgroundColor: 'background.paper',
              border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.09)}`,
              borderRadius: 3,
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 18px 40px rgba(2, 6, 23, 0.32)'
                  : '0 18px 40px rgba(68, 105, 148, 0.08)',
              p: { xs: 2, sm: 2.5 },
            }}
            spacing={2}
          >
  

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <IconButton aria-label="Предыдущий трек" disabled={!canGoPrevious} onClick={() => playPreviousPersistentAudio()}>
                <NavigateBeforeRoundedIcon />
              </IconButton>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <AudioPlayer
                  collection={collection}
                  src={activeTrack.src}
                  subtitle={activeTrack.subtitle}
                  title={activeTrack.title}
                  trackId={activeTrack.id}
                />
              </Box>
              <IconButton aria-label="Следующий трек" disabled={!canGoNext} onClick={() => playNextPersistentAudio()}>
                <NavigateNextRoundedIcon />
              </IconButton>
            </Stack>
          </Stack>

          <Stack spacing={1}>
            <Typography sx={{ fontWeight: 700 }} variant="subtitle2">
              Треки
            </Typography>
            <List disablePadding sx={{ display: 'grid', gap: 1 }}>
              {tracks.map((track, index) => {
                const isActive = track.id === activeTrack.id;
                return (
                  <ListItemButton
                    key={track.id}
                    onClick={() => {
                      void playPersistentAudio({
                        collection,
                        src: track.src,
                        title: track.title,
                        subtitle: track.subtitle,
                        trackId: track.id,
                      });
                    }}
                    selected={isActive}
                    sx={(theme) => ({
                      alignItems: 'center',
                      backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.background.paper, 0.86),
                      border: `1px solid ${isActive ? alpha(theme.palette.primary.main, 0.22) : alpha(theme.palette.divider, 0.75)}`,
                      borderRadius: 2,
                      gap: 1.5,
                      px: 1.5,
                      py: 1.25,
                    })}
                  >
                    <Box
                      sx={(theme) => ({
                        alignItems: 'center',
                        backgroundColor: alpha(theme.palette.primary.main, isActive ? 0.14 : 0.08),
                        borderRadius: '50%',
                        color: 'text.primary',
                        display: 'flex',
                        flex: '0 0 auto',
                        height: 36,
                        justifyContent: 'center',
                        width: 36,
                      })}
                    >
                      {isActive && snapshot.isPlaying ? <PauseRoundedIcon fontSize="small" /> : <PlayArrowRoundedIcon fontSize="small" />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: isActive ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} variant="body2">
                        {track.title || `Трек ${index + 1}`}
                      </Typography>
                      {track.subtitle ? (
                        <Typography color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} variant="caption">
                      {track.subtitle}
                    </Typography>
                  ) : null}
                </Box>
                <Tooltip title="Скачать">
                  <IconButton
                    aria-label="Скачать"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      triggerBrowserDownload(track.src, getAudioFilename(track, index));
                    }}
                    size="small"
                  >
                    <DownloadRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ListItemButton>
            );
          })}
            </List>
          </Stack>
        </Stack>
      </Stack>
    </Dialog>
  );
}

function getAudioFilename(track: { src: string; title: string | null }, index: number) {
  const src = track.src || '';
  const pathname = src.split('?')[0] || '';
  const lastSegment = pathname.split('/').filter(Boolean).pop() || '';
  const inferredExt = lastSegment.includes('.') ? `.${lastSegment.split('.').pop()}` : '';

  const base = (track.title || '').trim() || `track-${index + 1}`;
  const safeBase = base.replace(/[\\/:*?"<>|]/g, '_');

  return `${safeBase}${inferredExt}`;
}
