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
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 'none',
        color: 'inherit',
        display: 'block',
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 14px 28px rgba(45, 62, 80, 0.08)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack
        component={RouterLink}
        spacing={featured ? 2 : 1.5}
        sx={{
          color: 'inherit',
          display: 'flex',
          p: featured ? { xs: 2.25, md: 3 } : { xs: 2, md: 2.25 },
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
              borderRadius: 1,
              display: 'block',
              objectFit: 'cover',
              width: '100%',
            }}
          />
        ) : null}

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {featured ? <Chip color="primary" label="Новое" size="small" /> : null}
          <Typography color="text.secondary" variant="body2">
            {formatDateLabel(post.publishedAt)}
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
            {post.excerpt || 'Published article available for reading.'}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
          <Typography color="primary.main" variant="body2">
            Открыть статью
          </Typography>
          <ArrowOutwardRoundedIcon color="primary" fontSize="small" />
        </Stack>
      </Stack>

      {isAuthenticated ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            pb: featured ? { xs: 2.25, md: 3 } : { xs: 2, md: 2.25 },
            px: featured ? { xs: 2.25, md: 3 } : { xs: 2, md: 2.25 },
          }}
        >
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
