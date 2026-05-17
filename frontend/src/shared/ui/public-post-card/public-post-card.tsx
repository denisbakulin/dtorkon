import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import type { PublicPostListItem } from '../../api/blog-contract';
import { formatDateLabel } from '../../lib/format-date';

type PublicPostCardProps = {
  post: PublicPostListItem;
  featured?: boolean;
};

export function PublicPostCard({
  post,
  featured = false,
}: PublicPostCardProps) {
  return (
    <Paper
      component={RouterLink}
      sx={{
        color: 'inherit',
        display: 'block',
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          boxShadow: '0 16px 34px rgba(89, 114, 139, 0.14)',
          transform: 'translateY(-3px)',
        },
      }}
      to={`/posts/${post.slug}`}
    >
      {post.coverAsset ? (
        <Box
          alt={post.coverAsset.originalName}
          component="img"
          src={post.coverAsset.url}
          sx={{
            aspectRatio: featured ? '16 / 8.5' : '16 / 10',
            display: 'block',
            objectFit: 'cover',
            width: '100%',
          }}
        />
      ) : null}

      <Stack spacing={featured ? 2 : 1.5} sx={{ p: featured ? 3 : 2.25 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          {featured ? <Chip color="primary" label="Свежая публикация"/> : null}
          <Typography color="text.secondary">
            {formatDateLabel(post.publishedAt, )}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography
            sx={{
              fontSize: featured ? { xs: '1.5rem', md: '2rem' } : '1.1rem',
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            {post.title}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              lineClamp: featured ? 3 : 2,
              lineHeight: 1.7,
              overflow: 'hidden',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: featured ? 3 : 2,
            }}
            variant="body2"
          >
            {post.excerpt || 'Материал уже опубликован и доступен для чтения.'}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
          <Typography color="primary.main" variant="body2">
            Открыть статью
          </Typography>
          <ArrowOutwardRoundedIcon color="primary" fontSize="small" />
        </Stack>
      </Stack>
    </Paper>
  );
}
