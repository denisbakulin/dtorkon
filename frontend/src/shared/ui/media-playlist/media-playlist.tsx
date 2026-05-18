import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';

import type { PublicAttachment } from '../../api/blog-contract';
import { prettifyMediaName } from '../../lib/media';
import type { AudioCollection } from '../../lib/persistent-audio';
import { playPersistentAudio } from '../../lib/persistent-audio';
import { MediaPlayer } from '../media-player/media-player';

type MediaPlaylistProps = {
  attachments: PublicAttachment[];
  showTitle?: boolean;
  audioCollectionContextLabel?: string | null;
  audioCollectionSubtitle?: string | null;
  audioCollectionTitle?: string | null;
};

type MediaAttachment = PublicAttachment & { kind: 'audio' | 'video' };

function isMediaAttachment(attachment: PublicAttachment): attachment is MediaAttachment {
  return attachment.kind === 'audio' || attachment.kind === 'video';
}

export function MediaPlaylist({
  attachments,
  showTitle = true,
  audioCollectionContextLabel = 'Пост',
  audioCollectionSubtitle = null,
  audioCollectionTitle = 'Аудио из поста',
}: MediaPlaylistProps) {
  const mediaAttachments = useMemo(
    () => attachments.filter(isMediaAttachment),
    [attachments],
  );
  const audioCollection = useMemo<AudioCollection | null>(() => {
    const audioAttachments = attachments.filter((attachment) => attachment.kind === 'audio');
    if (audioAttachments.length === 0) {
      return null;
    }

    return {
      id: `post-attachments:${audioAttachments.map((attachment) => attachment.id).join('|')}`,
      title: audioCollectionTitle,
      subtitle: audioCollectionSubtitle,
      contextLabel: audioCollectionContextLabel,
      tracks: audioAttachments.map((attachment) => ({
        id: attachment.id,
        src: attachment.asset.url,
        title: attachment.title?.trim() || prettifyMediaName(attachment.asset.originalName),
        subtitle: null,
      })),
    };
  }, [attachments, audioCollectionContextLabel, audioCollectionSubtitle, audioCollectionTitle]);

  const [activeId, setActiveId] = useState<string>(() => mediaAttachments[0]?.id ?? '');

  const activeAttachment = useMemo(
    () => mediaAttachments.find((attachment) => attachment.id === activeId) ?? mediaAttachments[0] ?? null,
    [activeId, mediaAttachments],
  );

  if (mediaAttachments.length === 0) return null;

  return (
    <Stack spacing={1.5}>
      {mediaAttachments.length > 1 ? (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.25,
            overflow: 'hidden',
          }}
        >
          <List dense disablePadding>
            {mediaAttachments.map((attachment) => {
              const isActive = attachment.id === (activeAttachment?.id ?? '');
              const primary = attachment.title?.trim() || prettifyMediaName(attachment.asset.originalName);
              const icon = attachment.kind === 'audio' ? <GraphicEqRoundedIcon color="primary" /> : <MovieRoundedIcon color="primary" />;
              return (
                <ListItemButton
                  key={attachment.id}
                  onClick={() => {
                    setActiveId(attachment.id);
                    if (attachment.kind === 'audio') {
                      void playPersistentAudio({
                        collection: audioCollection,
                        src: attachment.asset.url,
                        title: primary,
                        trackId: attachment.id,
                      });
                    }
                  }}
                  selected={isActive}
                  sx={{
                    alignItems: 'center',
                    py: 1,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 42 }}>{icon}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: isActive ? 700 : 600 }} variant="body2">
                        {primary}
                      </Typography>
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      ) : null}

      {activeAttachment ? (
        <Stack spacing={1}>
          {showTitle && mediaAttachments.length === 1 ? (
            <Typography sx={{ fontWeight: 600 }} variant="body2">
              {activeAttachment.title?.trim() || prettifyMediaName(activeAttachment.asset.originalName)}
            </Typography>
          ) : null}

          <MediaPlayer
            asset={activeAttachment.asset}
            audioCollection={activeAttachment.kind === 'audio' ? audioCollection : null}
            audioTitle={activeAttachment.title?.trim() || prettifyMediaName(activeAttachment.asset.originalName)}
            audioTrackId={activeAttachment.kind === 'audio' ? activeAttachment.id : null}
            kind={activeAttachment.kind}
          />
        </Stack>
      ) : null}
    </Stack>
  );
}
