import { Box, Typography } from '@mui/material';
import { Plyr } from 'plyr-react';
import 'plyr/dist/plyr.css';

import type { AttachmentKind, PublicAsset } from '../../api/blog-contract';
import { AudioPlayer } from '../audio-player/audio-player';

type MediaPlayerProps = {
  asset: Pick<PublicAsset, 'mimeType' | 'originalName' | 'transcriptStatus' | 'transcriptText' | 'url'>;
  kind: Extract<AttachmentKind, 'audio' | 'video'>;
};

export function MediaPlayer({ asset, kind }: MediaPlayerProps) {
  return (
    <Box sx={{ width: '100%' }}>
      {kind === 'audio' ? (
        <AudioPlayer src={asset.url} />
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
      {asset.transcriptStatus === 'ready' && asset.transcriptText ? (
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
