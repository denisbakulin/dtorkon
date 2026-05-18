import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../../../app/providers/auth-provider';
import type { PublicPostListItem } from '../../api/blog-contract';
import { getAdminEditPostPath } from '../../lib/admin-access';
import { formatDateLabel } from '../../lib/format-date';

type PublicPostCardProps = {
  post: PublicPostListItem;
  featured?: boolean;
};

export function PublicPostCard({ post, featured = false }: PublicPostCardProps) {
  const { isAuthenticated } = useAuth();

  return (
    <Paper
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
    >
      <Stack
        component={RouterLink}
        spacing={featured ? 2 : 1.5}
        sx={{
          color: 'inherit',
          display: 'block',
          p: featured ? 3 : 2.25,
          textDecoration: 'none',
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

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {featured ? <Chip color="primary" label="Fresh post" /> : null}
          <Typography color="text.secondary">{formatDateLabel(post.publishedAt)}</Typography>
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
            {post.excerpt || 'Published article available for reading.'}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
          <Typography color="primary.main" variant="body2">
            Open article
          </Typography>
          <ArrowOutwardRoundedIcon color="primary" fontSize="small" />
        </Stack>
      </Stack>

      {isAuthenticated ? (
        <Stack direction="row" spacing={1} sx={{ px: featured ? 3 : 2.25, pb: featured ? 3 : 2.25 }}>
          <Button
            component={RouterLink}
            onClick={(event) => event.stopPropagation()}
            startIcon={<EditRoundedIcon />}
            to={getAdminEditPostPath(post.id)}
            variant="outlined"
          >
            Edit
          </Button>
        </Stack>
      ) : null}
    </Paper>
  );
}
