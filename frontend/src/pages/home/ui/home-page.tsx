import AlternateEmailRoundedIcon from '@mui/icons-material/AlternateEmailRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import WorkspacesRoundedIcon from '@mui/icons-material/WorkspacesRounded';
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { getApiErrorMessage } from '../../../shared/api/api-error';
import { getPublicPosts, getSiteProfile } from '../../../shared/api/blog-api';
import type { PublicPostListItem, SiteProfile } from '../../../shared/api/blog-contract';
import { PublicPostCard } from '../../../shared/ui/public-post-card/public-post-card';
import { SiteShell } from '../../../shared/ui/site-shell/site-shell';

function HomeHeroSkeleton() {
  return (
    <Paper sx={{ border: 1, borderColor: 'divider', boxShadow: 'none', overflow: 'hidden', p: { xs: 3, md: 4 } }}>
      <Stack spacing={3}>
        <Stack spacing={1.5}>
          <Skeleton height={68} width="52%" />
          <Skeleton width="88%" />
          <Skeleton width="72%" />
        </Stack>
      </Stack>
    </Paper>
  );
}

function HomeQuickLinksSkeleton() {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          md: 'repeat(2, minmax(0, 1fr))',
        },
      }}
    >
      {Array.from({ length: 3 }, (_, index) => (
        <Paper key={index} sx={{ border: 1, borderColor: 'divider', boxShadow: 'none', p: 2.5 }}>
          <Stack spacing={2}>
            <Skeleton height={24} variant="circular" width={24} />
            <Stack spacing={0.75}>
              <Skeleton width="34%" />
              <Skeleton width="84%" />
              <Skeleton width="68%" />
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Box>
  );
}

function HomeLatestPostsSkeleton() {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          md: 'repeat(3, minmax(0, 1fr))',
        },
      }}
    >
      {Array.from({ length: 3 }, (_, index) => (
        <Paper key={index} sx={{ border: 1, borderColor: 'divider', boxShadow: 'none', p: 2.25 }}>
          <Stack spacing={1.5}>
            <Skeleton height={160} variant="rounded" />
            <Skeleton width="38%" />
            <Skeleton height={30} width="76%" />
            <Skeleton />
            <Skeleton width="85%" />
          </Stack>
        </Paper>
      ))}
    </Box>
  );
}

export function HomePage() {
  const [latestPosts, setLatestPosts] = useState<PublicPostListItem[]>([]);
  const [siteProfile, setSiteProfile] = useState<SiteProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getPublicPosts({ page: 1, pageSize: 3, signal: controller.signal }),
      getSiteProfile(controller.signal),
    ])
      .then(([postsResponse, siteProfileResponse]) => {
        if (!controller.signal.aborted) {
          setLatestPosts(postsResponse.items);
          setSiteProfile(siteProfileResponse);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }

        setErrorMessage(
          getApiErrorMessage(
            error,
            'Не получилось полностью загрузить главную страницу.',
          ),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <SiteShell>
      <Box component="main" sx={{ pb: 10, pt: { xs: 2.5, md: 4 } }}>
        <Container maxWidth="lg">
          <Stack spacing={{ xs: 2.5, md: 3 }}>
            {isLoading ? (
              <>
                <HomeHeroSkeleton />
                <HomeQuickLinksSkeleton />
              </>
            ) : (
              <>
                <Paper
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    boxShadow: 'none',
                    overflow: 'hidden',
                    p: { xs: 3, md: 4.5 },
                  }}
                >
                  <Stack spacing={3}>
                    <Stack spacing={1.5}>
                      <Typography
                        sx={{
                          fontSize: { xs: '2.25rem', md: '3.45rem' },
                          fontWeight: 800,
                          lineHeight: 1.03,
                          maxWidth: 760,
                        }}
                        variant="h1"
                      >
                        {siteProfile?.authorName || 'dtorkon'}
                      </Typography>
                      <Typography color="text.secondary" sx={{ fontSize: { md: '1.05rem' }, lineHeight: 1.75, maxWidth: 680 }}>
                        {siteProfile?.authorBio || 'Мини-блог с публичной витриной, поиском по постам и отдельной закрытой админкой.'}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>

                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'repeat(3, minmax(0, 1fr))',
                    },
                  }}
                >
                  {[
                    {
                      title: 'Проекты',
                      description: 'Витрина рабочих проектов с GitHub, скриншотами и коротким обзором.',
                      icon: <WorkspacesRoundedIcon color="primary" />,
                      to: '/projects',
                    },
                    {
                      title: 'Блог',
                      description: 'Публичная лента статей и поиск по публикациям.',
                      icon: <ArticleRoundedIcon color="primary" />,
                      to: '/blog',
                    },
                    {
                      title: 'Связь',
                      description: 'Контакты и ссылки на площадки автора.',
                      icon: <AlternateEmailRoundedIcon color="primary" />,
                      to: '/contact',
                    },
                  ].map((card) => (
                    <Paper
                      component={RouterLink}
                      key={card.title}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        boxShadow: 'none',
                        color: 'inherit',
                        p: 2.5,
                        textDecoration: 'none',
                        transition: 'border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: '0 14px 28px rgba(45, 62, 80, 0.08)',
                          transform: 'translateY(-2px)',
                        },
                      }}
                      to={card.to}
                    >
                      <Stack spacing={2}>
                        <Box
                          sx={{
                            alignItems: 'center',
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                            display: 'inline-flex',
                            height: 38,
                            justifyContent: 'center',
                            width: 38,
                          }}
                        >
                          {card.icon}
                        </Box>
                        <Stack spacing={0.75}>
                          <Typography variant="h6">{card.title}</Typography>
                          <Typography color="text.secondary" variant="body2">
                            {card.description}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Box>
              </>
            )}

            <Paper sx={{ border: 1, borderColor: 'divider', boxShadow: 'none', p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Typography variant="h6">Последние публикации</Typography>
                  <Button component={RouterLink} to="/blog" variant="text">
                    Весь блог
                  </Button>
                </Stack>
                <Divider />

                {errorMessage ? <Alert severity="info">{errorMessage}</Alert> : null}

                {isLoading ? <HomeLatestPostsSkeleton /> : null}

                {!isLoading && latestPosts.length === 0 ? (
                  <Typography color="text.secondary">
                    Первая опубликованная запись появится здесь автоматически.
                  </Typography>
                ) : null}

                {latestPosts.length > 0 ? (
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 2,
                      gridTemplateColumns: {
                        xs: '1fr',
                        md: 'repeat(3, minmax(0, 1fr))',
                      },
                    }}
                  >
                    {latestPosts.map((post) => (
                      <PublicPostCard key={post.id} post={post} />
                    ))}
                  </Box>
                ) : null}
              </Stack>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </SiteShell>
  );
}
