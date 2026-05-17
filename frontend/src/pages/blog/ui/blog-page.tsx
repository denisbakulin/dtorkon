import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Alert,
  Box,
  Button,
  Container,
  InputAdornment,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getApiErrorMessage } from '../../../shared/api/api-error';
import { getPublicPosts } from '../../../shared/api/blog-api';
import type { PublicPostListResponse } from '../../../shared/api/blog-contract';
import { PublicPostCard } from '../../../shared/ui/public-post-card/public-post-card';
import { SiteShell } from '../../../shared/ui/site-shell/site-shell';

const PAGE_SIZE = 9;

function parsePage(searchParams: URLSearchParams) {
  const rawValue = Number(searchParams.get('page') ?? '1');

  if (!Number.isFinite(rawValue) || rawValue < 1) {
    return 1;
  }

  return Math.trunc(rawValue);
}

function BlogGridSkeleton() {
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
      {Array.from({ length: 4 }, (_, index) => (
        <Paper key={index} sx={{ overflow: 'hidden', p: 2.25 }}>
          <Stack spacing={1.5}>
            <Skeleton height={180} variant="rounded" />
            <Skeleton width="36%" />
            <Skeleton height={34} width="78%" />
            <Skeleton />
            <Skeleton width="88%" />
            <Skeleton width="40%" />
          </Stack>
        </Paper>
      ))}
    </Box>
  );
}

export function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<PublicPostListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');

  const page = useMemo(() => parsePage(searchParams), [searchParams]);
  const searchQuery = useMemo(() => (searchParams.get('q') ?? '').trim(), [searchParams]);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setErrorMessage(null);

    getPublicPosts({
      page,
      pageSize: PAGE_SIZE,
      q: searchQuery || undefined,
      signal: controller.signal,
    })
      .then((response) => {
        if (!controller.signal.aborted) {
          setData(response);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }

        setErrorMessage(
          getApiErrorMessage(
            error,
            'Не получилось загрузить публикации. Попробуй обновить страницу.',
          ),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [page, searchQuery]);

  const featuredPost = data?.items[0] ?? null;
  const secondaryPosts = data?.items.slice(featuredPost ? 1 : 0) ?? [];

  return (
    <SiteShell>
      <Box component="main" sx={{ pb: 10, pt: { xs: 3, md: 5 } }}>
        <Container maxWidth="lg">
          <Stack spacing={3}>
            <Paper sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={1.5}>
                <Typography sx={{ fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 700 }}>
                  Блог
                </Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 720 }}>
                  Публичная витрина материалов работает с реальным API и теперь поддерживает поиск по `q`.
                </Typography>
                <TextField
                  label="Поиск по заголовку, описанию и тексту"
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      startTransition(() => {
                        const nextSearchParams = new URLSearchParams(searchParams);
                        if (searchInput.trim()) {
                          nextSearchParams.set('q', searchInput.trim());
                        } else {
                          nextSearchParams.delete('q');
                        }
                        nextSearchParams.delete('page');
                        setSearchParams(nextSearchParams);
                      });
                    }
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRoundedIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  value={searchInput}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                  <Button
                    onClick={() => {
                      startTransition(() => {
                        const nextSearchParams = new URLSearchParams(searchParams);
                        if (searchInput.trim()) {
                          nextSearchParams.set('q', searchInput.trim());
                        } else {
                          nextSearchParams.delete('q');
                        }
                        nextSearchParams.delete('page');
                        setSearchParams(nextSearchParams);
                      });
                    }}
                    variant="contained"
                  >
                    Искать
                  </Button>
                  {searchQuery ? (
                    <Button
                      onClick={() => {
                        setSearchInput('');
                        startTransition(() => {
                          const nextSearchParams = new URLSearchParams(searchParams);
                          nextSearchParams.delete('q');
                          nextSearchParams.delete('page');
                          setSearchParams(nextSearchParams);
                        });
                      }}
                      variant="outlined"
                    >
                      Сбросить
                    </Button>
                  ) : null}
                </Stack>
                {data ? (
                  <Typography color="text.secondary" variant="body2">
                    Найдено публикаций: {data.pagination.totalItems}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>

            {errorMessage && !data ? (
              <Alert
                action={
                  <Button
                    color="inherit"
                    onClick={() => window.location.reload()}
                    size="small"
                    startIcon={<RefreshRoundedIcon />}
                  >
                    Обновить
                  </Button>
                }
                severity="warning"
              >
                {errorMessage}
              </Alert>
            ) : null}

            {isLoading && !data ? <BlogGridSkeleton /> : null}

            {!isLoading && data && data.items.length === 0 ? (
              <Paper sx={{ p: 4 }}>
                <Stack spacing={1}>
                  <Typography variant="h6">Ничего не найдено</Typography>
                  <Typography color="text.secondary">
                    Попробуй изменить запрос или сбросить фильтр поиска.
                  </Typography>
                </Stack>
              </Paper>
            ) : null}

            {featuredPost ? (
              <Stack spacing={2.5}>
                <PublicPostCard featured post={featuredPost} />

                {secondaryPosts.length > 0 ? (
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
                    {secondaryPosts.map((post) => (
                      <PublicPostCard key={post.id} post={post} />
                    ))}
                  </Box>
                ) : null}
              </Stack>
            ) : null}

            {data && data.pagination.totalPages > 1 ? (
              <Stack direction="row" sx={{ justifyContent: 'center', pt: 1 }}>
                <Pagination
                  color="primary"
                  count={data.pagination.totalPages}
                  disabled={isPending}
                  onChange={(_, nextPage) => {
                    startTransition(() => {
                      const nextSearchParams = new URLSearchParams(searchParams);
                      if (nextPage === 1) {
                        nextSearchParams.delete('page');
                      } else {
                        nextSearchParams.set('page', String(nextPage));
                      }
                      setSearchParams(nextSearchParams);
                    });
                  }}
                  page={page}
                />
              </Stack>
            ) : null}
          </Stack>
        </Container>
      </Box>
    </SiteShell>
  );
}
