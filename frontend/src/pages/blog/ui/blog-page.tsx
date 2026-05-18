import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Alert,
  Box,
  Button,
  Container,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../../app/providers/auth-provider';
import { getApiErrorMessage } from '../../../shared/api/api-error';
import { getPublicPosts } from '../../../shared/api/blog-api';
import type { PaginationInfo, PublicPostListItem } from '../../../shared/api/blog-contract';
import { getAdminCreatePostPath } from '../../../shared/lib/admin-access';
import { PublicPostCard } from '../../../shared/ui/public-post-card/public-post-card';
import { SiteShell } from '../../../shared/ui/site-shell/site-shell';

const PAGE_SIZE = 12;

function BlogListSkeleton() {
  return (
    <Stack spacing={2}>
      {Array.from({ length: 6 }, (_, index) => (
        <Paper key={index} sx={{ overflow: 'hidden', p: 2.25 }}>
          <Stack spacing={1.5}>
            <Skeleton height={160} variant="rounded" />
            <Skeleton width="40%" />
            <Skeleton height={30} width="82%" />
            <Skeleton />
            <Skeleton width="72%" />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

export function BlogPage() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<PublicPostListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [nextPage, setNextPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');

  const searchQuery = useMemo(() => (searchParams.get('q') ?? '').trim(), [searchParams]);
  const hasOlderPosts = pagination ? nextPage <= pagination.totalPages : false;

  const feedRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollRestoreRef = useRef<{ prevScrollHeight: number; prevScrollTop: number } | null>(null);
  const shouldScrollToBottomRef = useRef(true);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setIsLoadingOlder(false);
    setErrorMessage(null);
    setItems([]);
    setPagination(null);
    setNextPage(1);
    shouldScrollToBottomRef.current = true;

    getPublicPosts({
      page: 1,
      pageSize: PAGE_SIZE,
      q: searchQuery || undefined,
      signal: controller.signal,
    })
      .then((response) => {
        if (!controller.signal.aborted) {
          setItems([...response.items].reverse());
          setPagination(response.pagination);
          setNextPage(response.pagination.page + 1);
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
  }, [searchQuery]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) {
      return;
    }

    if (shouldScrollToBottomRef.current && items.length > 0) {
      feed.scrollTop = feed.scrollHeight;
      shouldScrollToBottomRef.current = false;
      return;
    }

    const scrollRestore = scrollRestoreRef.current;
    if (scrollRestore) {
      const nextScrollHeight = feed.scrollHeight;
      const delta = nextScrollHeight - scrollRestore.prevScrollHeight;
      feed.scrollTop = scrollRestore.prevScrollTop + delta;
      scrollRestoreRef.current = null;
    }
  }, [items]);

  useEffect(() => {
    const feed = feedRef.current;
    const sentinel = topSentinelRef.current;
    if (!feed || !sentinel) {
      return;
    }

    if (!hasOlderPosts || isLoadingOlder || isLoading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }

        if (!pagination || nextPage > pagination.totalPages) {
          return;
        }

        setIsLoadingOlder(true);
        scrollRestoreRef.current = {
          prevScrollHeight: feed.scrollHeight,
          prevScrollTop: feed.scrollTop,
        };

        getPublicPosts({
          page: nextPage,
          pageSize: PAGE_SIZE,
          q: searchQuery || undefined,
        })
          .then((response) => {
            const normalizedItems = [...response.items].reverse();
            setItems((prev) => [...normalizedItems, ...prev]);
            setPagination(response.pagination);
            setNextPage(response.pagination.page + 1);
            setErrorMessage(null);
          })
          .catch((error: unknown) => {
            setErrorMessage(
              getApiErrorMessage(error, 'Не получилось загрузить старые публикации. Попробуй повторить.'),
            );
            scrollRestoreRef.current = null;
          })
          .finally(() => {
            setIsLoadingOlder(false);
          });
      },
      {
        root: feed,
        rootMargin: '0px',
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasOlderPosts, isLoading, isLoadingOlder, nextPage, pagination, searchQuery]);

  return (
    <SiteShell lockViewport>
      <Box
        component="main"
        sx={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          pb: 10,
          pt: { xs: 3, md: 5 },
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ flex: 1, minHeight: 0 }}
          >
            <Paper
              sx={{
                p: 2.5,
                width: { xs: '100%', md: 360 },
                flexShrink: 0,
              }}
            >
              <Stack spacing={1.5}>
                <Typography sx={{ fontSize: { xs: '1.75rem', md: '2rem' }, fontWeight: 700 }}>Блог</Typography>
                <Typography color="text.secondary" variant="body2">
                  Последние посты внизу. Прокрути вверх, чтобы подгрузить старые.
                </Typography>
                <TextField
                  label="Поиск"
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
                  {isAuthenticated ? (
                    <Button component={RouterLink} to={getAdminCreatePostPath()} variant="outlined">
                      Новый пост
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => {
                      startTransition(() => {
                        const nextSearchParams = new URLSearchParams(searchParams);
                        if (searchInput.trim()) {
                          nextSearchParams.set('q', searchInput.trim());
                        } else {
                          nextSearchParams.delete('q');
                        }
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
                          setSearchParams(nextSearchParams);
                        });
                      }}
                      variant="outlined"
                    >
                      Сбросить
                    </Button>
                  ) : null}
                </Stack>
                {pagination ? (
                  <Typography color="text.secondary" variant="body2">
                    Найдено публикаций: {pagination.totalItems}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>

            <Paper
              sx={{
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
                minHeight: 0,
                minWidth: 0,
                overflow: 'hidden',
                p: 1.25,
              }}
            >
              {errorMessage && items.length === 0 ? (
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
                  sx={{ mb: 2 }}
                >
                  {errorMessage}
                </Alert>
              ) : null}

              {isLoading && items.length === 0 ? <BlogListSkeleton /> : null}

              {!isLoading && pagination && items.length === 0 ? (
                <Box sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="h6">Ничего не найдено</Typography>
                    <Typography color="text.secondary">
                      Попробуй изменить запрос или сбросить фильтр поиска.
                    </Typography>
                  </Stack>
                </Box>
              ) : null}

              {items.length > 0 ? (
                <Box
                  ref={feedRef}
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    px: { xs: 1, md: 1.5 },
                    py: 1.25,
                  }}
                >
                  <Stack spacing={2}>
                    <Box
                      ref={topSentinelRef}
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        pt: 0.5,
                      }}
                    >
                      {hasOlderPosts ? (
                        <Typography color="text.secondary" variant="body2">
                          {isLoadingOlder ? 'Загружаю старые публикации…' : 'Прокрути вверх, чтобы загрузить ещё'}
                        </Typography>
                      ) : (
                        <Typography color="text.secondary" variant="body2">
                          Это начало ленты
                        </Typography>
                      )}
                    </Box>

                    {items.map((post, index) => (
                      <PublicPostCard key={post.id} featured={index === items.length - 1} post={post} />
                    ))}

                    {errorMessage && items.length > 0 ? (
                      <Alert
                        action={
                          <Button
                            color="inherit"
                            disabled={!hasOlderPosts || isLoadingOlder || isPending}
                            onClick={() => {
                              const feed = feedRef.current;
                              if (!feed || !hasOlderPosts || isLoadingOlder) {
                                return;
                              }

                              setIsLoadingOlder(true);
                              scrollRestoreRef.current = {
                                prevScrollHeight: feed.scrollHeight,
                                prevScrollTop: feed.scrollTop,
                              };

                              getPublicPosts({
                                page: nextPage,
                                pageSize: PAGE_SIZE,
                                q: searchQuery || undefined,
                              })
                                .then((response) => {
                                  const normalizedItems = [...response.items].reverse();
                                  setItems((prev) => [...normalizedItems, ...prev]);
                                  setPagination(response.pagination);
                                  setNextPage(response.pagination.page + 1);
                                  setErrorMessage(null);
                                })
                                .catch((error: unknown) => {
                                  setErrorMessage(
                                    getApiErrorMessage(
                                      error,
                                      'Не получилось загрузить старые публикации. Попробуй повторить.',
                                    ),
                                  );
                                  scrollRestoreRef.current = null;
                                })
                                .finally(() => {
                                  setIsLoadingOlder(false);
                                });
                            }}
                            size="small"
                          >
                            Повторить
                          </Button>
                        }
                        severity="warning"
                      >
                        {errorMessage}
                      </Alert>
                    ) : null}
                  </Stack>
                </Box>
              ) : null}
            </Paper>
          </Stack>
        </Container>
      </Box>
    </SiteShell>
  );
}
