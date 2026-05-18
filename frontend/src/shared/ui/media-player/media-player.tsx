import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Plyr } from 'plyr-react';
import 'plyr/dist/plyr.css';

import type { AttachmentKind, PublicAsset } from '../../api/blog-contract';
import type { AudioCollection } from '../../lib/persistent-audio';
import { triggerBrowserDownload } from '../../lib/download';
import { AudioPlayer } from '../audio-player/audio-player';

type MediaPlayerProps = {
  asset: Pick<PublicAsset, 'mimeType' | 'originalName' | 'transcriptStatus' | 'transcriptText' | 'url'>;
  kind: Extract<AttachmentKind, 'audio' | 'video'>;
  audioCollection?: AudioCollection | null;
  audioSubtitle?: string | null;
  audioTitle?: string | null;
  audioTrackId?: string | null;
  compact?: boolean;
  showTranscript?: boolean;
};

export function MediaPlayer({ asset, kind, audioCollection = null, audioSubtitle, audioTitle, audioTrackId, compact = true, showTranscript = false }: MediaPlayerProps) {
  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'flex-end', mb: 1 }}>
        <Tooltip title="Скачать">
          <IconButton
            aria-label="Скачать"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              triggerBrowserDownload(asset.url, asset.originalName);
            }}
            size="small"
          >
            <DownloadRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      {kind === 'audio' ? (
        <AudioPlayer
          collection={audioCollection}
          src={asset.url}
          subtitle={compact ? null : audioSubtitle}
          title={audioTitle || asset.originalName}
          trackId={audioTrackId}
        />
      ) : (
        <Plyr
          options={{
            controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
          }}
          source={{
            type: kind,
            title: asset.originalName,
            sources: [{ src: asset.url, type: asset.mimeType }],
          }}
        />
      )}
      {showTranscript && asset.transcriptStatus === 'ready' && asset.transcriptText ? (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            mt: 1.25,
            p: 1.25,
          }}
        >
          <Typography sx={{ fontWeight: 600 }} variant="body2">
            Transcript
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }} variant="body2">
            {asset.transcriptText}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
