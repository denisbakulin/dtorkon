import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { Alert, Box, Button, Container, Paper, Skeleton, Stack, Typography } from '@mui/material';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<PublicPostListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [nextPage, setNextPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchQuery = useMemo(() => (searchParams.get('q') ?? '').trim(), [searchParams]);
  const hasOlderPosts = pagination ? nextPage <= pagination.totalPages : false;

  const feedRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollRestoreRef = useRef<{ prevScrollHeight: number; prevScrollTop: number } | null>(null);
  const shouldScrollToBottomRef = useRef(true);

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

  const handleRetryOlder = () => {
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
  };

  return (
    <SiteShell lockViewport>
      <Box
        component="main"
        sx={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          pb: 0,
          pt: 0,
        }}
      >
        <Container
          disableGutters
          maxWidth={false}
          sx={{
            display: 'flex',
            flex: 1,
            justifyContent: 'center',
            minHeight: 0,
            px: { xs: 0, sm: 2, md: 3, lg: 4 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flex: { xs: 1, lg: '0 1 50%' },
              flexDirection: 'column',
              maxWidth: { xs: '100%', lg: '50%' },
              minHeight: 0,
              minWidth: 0,
              overflow: 'hidden',
              width: { xs: '100%', lg: '50%' },
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
                sx={{ mb: 2, mx: { xs: 2, sm: 0 } }}
              >
                {errorMessage}
              </Alert>
            ) : null}

            {isLoading && items.length === 0 ? <BlogListSkeleton /> : null}

            {!isLoading && pagination && items.length === 0 ? (
              <Box sx={{ p: 2, px: { xs: 2, sm: 0 } }}>
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
                  px: { xs: 0, md: 1 },
                  py: { xs: 0.75, md: 1.25 },
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
                          disabled={!hasOlderPosts || isLoadingOlder || isLoading}
                          onClick={handleRetryOlder}
                          size="small"
                        >
                          Повторить
                        </Button>
                      }
                      severity="warning"
                      sx={{ mx: { xs: 2, sm: 0 } }}
                    >
                      {errorMessage}
                    </Alert>
                  ) : null}
                </Stack>
              </Box>
            ) : null}

            {isAuthenticated ? (
              <Box sx={{ px: { xs: 2, sm: 0 }, pt: 1.25 }}>
                <Button component={RouterLink} to={getAdminCreatePostPath()} variant="outlined">
                  Новый пост
                </Button>
              </Box>
            ) : null}
          </Box>
        </Container>
      </Box>
    </SiteShell>
  );
}
