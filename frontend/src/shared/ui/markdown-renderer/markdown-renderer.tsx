import { Box, Link, Typography, alpha } from '@mui/material';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import { Link as RouterLink } from 'react-router-dom';
import remarkGfm from 'remark-gfm';

import type { AudioCollection } from '../../lib/persistent-audio';
import { isAudioUrl, isVideoUrl } from '../../lib/media';
import { LightboxImage } from '../lightbox-image/lightbox-image';
import { MediaPlayer } from '../media-player/media-player';

type MarkdownRendererProps = {
  audioCollection?: AudioCollection | null;
  content: string;
  imageGalleryIndexBySrc?: Record<string, number>;
  onImageOpen?: (index: number) => void;
};

function createMarkdownComponents({
  audioCollection,
  imageGalleryIndexBySrc,
  onImageOpen,
}: Pick<MarkdownRendererProps, 'audioCollection' | 'imageGalleryIndexBySrc' | 'onImageOpen'>): Components {
  return {
    h1: ({ children }) => (
      <Typography component="h1" sx={{ fontSize: { xs: '2rem', md: '2.6rem' }, fontWeight: 700, lineHeight: 1.1, mb: 2.5 }}>
        {children}
      </Typography>
    ),
    h2: ({ children }) => (
      <Typography component="h2" sx={{ fontSize: { xs: '1.5rem', md: '1.9rem' }, fontWeight: 700, lineHeight: 1.2, mb: 1.75, mt: 4 }}>
        {children}
      </Typography>
    ),
    h3: ({ children }) => (
      <Typography component="h3" sx={{ fontSize: { xs: '1.2rem', md: '1.4rem' }, fontWeight: 700, lineHeight: 1.25, mb: 1.25, mt: 3 }}>
        {children}
      </Typography>
    ),
    p: ({ children }) => (
      <Typography color="text.primary" component="p" sx={{ fontSize: '1.02rem', lineHeight: 1.85, mb: 2 }}>
        {children}
      </Typography>
    ),
    ul: ({ children }) => (
      <Box component="ul" sx={{ lineHeight: 1.8, m: 0, mb: 2, pl: 3.25 }}>
        {children}
      </Box>
    ),
    ol: ({ children }) => (
      <Box component="ol" sx={{ lineHeight: 1.8, m: 0, mb: 2, pl: 3.25 }}>
        {children}
      </Box>
    ),
    li: ({ children }) => (
      <Typography component="li" sx={{ color: 'text.primary', mb: 0.75 }}>
        {children}
      </Typography>
    ),
    blockquote: ({ children }) => (
      <Box
        sx={{
          borderLeft: (theme) => `3px solid ${alpha(theme.palette.primary.main, 0.5)}`,
          color: 'text.secondary',
          mb: 2.5,
          pl: 2,
          py: 0.25,
        }}
      >
        {children}
      </Box>
    ),
    a: ({ children, href }) => {
      if (href && isAudioUrl(href)) {
        const track = audioCollection?.tracks.find((item) => item.src === href);
        return (
          <Box component="span" sx={{ display: 'block', my: 2.5 }}>
            <MediaPlayer
              asset={{
                mimeType: 'audio/mpeg',
                originalName: typeof children === 'string' ? children : 'Audio',
                transcriptStatus: 'idle',
                transcriptText: null,
                url: href,
              }}
              audioCollection={audioCollection}
              audioSubtitle={track?.subtitle || null}
              audioTitle={track?.title || (typeof children === 'string' ? children : 'Audio')}
              audioTrackId={track?.id || href}
              kind="audio"
            />
          </Box>
        );
      }

      if (href && isVideoUrl(href)) {
        return (
          <Box component="span" sx={{ display: 'block', my: 2.5 }}>
            <MediaPlayer
              asset={{
                mimeType: 'video/mp4',
                originalName: typeof children === 'string' ? children : 'Video',
                transcriptStatus: 'idle',
                transcriptText: null,
                url: href,
              }}
              kind="video"
            />
          </Box>
        );
      }

      if (href?.startsWith('/')) {
        return (
          <Link component={RouterLink} to={href} underline="hover">
            {children}
          </Link>
        );
      }

      return (
        <Link href={href} rel="noreferrer" target="_blank" underline="hover">
          {children}
        </Link>
      );
    },
    img: ({ alt, src }) => {
      if (!src) {
        return null;
      }

      const imageIndex = imageGalleryIndexBySrc?.[src] ?? null;

      return (
        <Box component="span" sx={{ display: 'block', my: 2.5 }}>
          <LightboxImage alt={alt} onOpen={imageIndex !== null && onImageOpen ? () => onImageOpen(imageIndex) : null} src={src} />
        </Box>
      );
    },
    code: ({ children }) => (
      <Box
        component="code"
        sx={{
          bgcolor: alpha('#7fa1c4', 0.14),
          borderRadius: 1,
          fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
          fontSize: '0.92em',
          px: 0.7,
          py: 0.3,
        }}
      >
        {children}
      </Box>
    ),
    pre: ({ children }) => (
      <Box
        component="pre"
        sx={{
          bgcolor: '#10263d',
          borderRadius: 1,
          color: '#eff6ff',
          fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
          fontSize: '0.92rem',
          mb: 2.5,
          overflowX: 'auto',
          p: 2,
        }}
      >
        {children}
      </Box>
    ),
  };
}

export function MarkdownRenderer({ audioCollection, content, imageGalleryIndexBySrc, onImageOpen }: MarkdownRendererProps) {
  return (
    <Box sx={{ color: 'text.primary' }}>
      <ReactMarkdown components={createMarkdownComponents({ audioCollection, imageGalleryIndexBySrc, onImageOpen })} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </Box>
  );
}
