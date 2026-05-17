import { Alert, Box, Button, Container, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { getApiErrorMessage, getApiErrorStatus } from '../../../shared/api/api-error';
import { getPublicMedia } from '../../../shared/api/blog-api';
import type { AttachmentKind, PublicMediaItem, PublicMediaResponse } from '../../../shared/api/blog-contract';
import { formatDateLabel } from '../../../shared/lib/format-date';
import { prettifyMediaName } from '../../../shared/lib/media';
import { SiteShell } from '../../../shared/ui/site-shell/site-shell';
import { LightboxImage } from '../../../shared/ui/lightbox-image/lightbox-image';
import { MediaPlayer } from '../../../shared/ui/media-player/media-player';

const kinds: { label: string; value: AttachmentKind }[] = [
  { label: 'Фото', value: 'image' },
  { label: 'Аудио', value: 'audio' },
  { label: 'Видео', value: 'video' },
  { label: 'Файлы', value: 'file' },
];

function groupByDate(items: PublicMediaItem[]) {
  const buckets = new Map<string, PublicMediaItem[]>();
  for (const item of items) {
    const key = formatDateLabel(item.publishedAt);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      buckets.set(key, [item]);
    }
  }
  return Array.from(buckets.entries());
}

export function MediaPage() {
  const [activeKind, setActiveKind] = useState<AttachmentKind>('image');
  const [data, setData] = useState<PublicMediaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage(null);

    getPublicMedia({ page: 1, pageSize: 48, kind: activeKind, signal: controller.signal })
      .then(setData)
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) return;
        const status = getApiErrorStatus(error);
        if (status === 404) {
          setData({ items: [], pagination: { page: 1, pageSize: 48, totalItems: 0, totalPages: 0 } });
          return;
        }
        setErrorMessage(getApiErrorMessage(error, 'Не получилось загрузить медиа.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [activeKind]);

  const grouped = useMemo(() => groupByDate(data?.items ?? []), [data?.items]);

  return (
    <SiteShell>
      <Box component="main" sx={{ pb: 10, pt: { xs: 0, md: 5 } }}>
        <Container disableGutters maxWidth={false} sx={{ px: { xs: 0, sm: 3, md: 4, lg: 6, xl: 8 } }}>
          <Stack spacing={2.5}>
            <Stack spacing={0.75} sx={{ px: { xs: 2, sm: 0 } }}>
              <Typography variant="h4">Медиа</Typography>
              <Typography color="text.secondary" variant="body2">
                Все вложения из опубликованных постов, сгруппированные по типу и дате.
              </Typography>
            </Stack>

            <Paper sx={{ borderRadius: { xs: 0, md: 2 }, overflow: 'hidden' }} variant="outlined">
              <Tabs
                onChange={(_, value) => setActiveKind(value)}
                value={activeKind}
                variant="scrollable"
                scrollButtons="auto"
              >
                {kinds.map((kind) => (
                  <Tab key={kind.value} label={kind.label} value={kind.value} />
                ))}
              </Tabs>
            </Paper>

            {errorMessage ? (
              <Alert severity="warning" sx={{ mx: { xs: 2, sm: 0 } }}>
                {errorMessage}
              </Alert>
            ) : null}

            {!isLoading && (data?.items?.length ?? 0) === 0 ? (
              <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: { xs: 0, md: 2 } }}>
                <Stack spacing={1}>
                  <Typography sx={{ fontWeight: 700 }}>Пока пусто</Typography>
                  <Typography color="text.secondary" variant="body2">
                    В опубликованных постах нет вложений этого типа.
                  </Typography>
                  <Button component={RouterLink} sx={{ alignSelf: 'flex-start' }} to="/blog" variant="text">
                    Перейти в блог
                  </Button>
                </Stack>
              </Paper>
            ) : null}

            {grouped.map(([dateLabel, items]) => (
              <Stack key={dateLabel} spacing={1.25}>
                <Typography sx={{ fontWeight: 800, px: { xs: 2, sm: 0 } }} variant="subtitle2">
                  {dateLabel}
                </Typography>

                {activeKind === 'image' ? (
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 1.5,
                      gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                      px: { xs: 2, sm: 0 },
                    }}
                  >
                    {items.map((item) => (
                      <Paper key={item.id} sx={{ overflow: 'hidden' }} variant="outlined">
                        <LightboxImage
                          alt={item.title || item.asset.originalName}
                          src={item.asset.url}
                          sx={{ aspectRatio: '1 / 1', display: 'block', objectFit: 'cover', width: '100%' }}
                        />
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Stack spacing={1.5} sx={{ px: { xs: 2, sm: 0 } }}>
                    {items.map((item) => (
                      <Paper key={item.id} sx={{ p: 2, borderRadius: { xs: 0, md: 2 } }} variant="outlined">
                        <Stack spacing={1}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>
                              {item.title?.trim() || prettifyMediaName(item.asset.originalName)}
                            </Typography>
                            <Button
                              component={RouterLink}
                              size="small"
                              to={`/posts/${item.postSlug}`}
                              variant="text"
                            >
                              Открыть пост
                            </Button>
                          </Stack>
                          {item.kind === 'audio' || item.kind === 'video' ? (
                            <MediaPlayer asset={item.asset} kind={item.kind} />
                          ) : (
                            <Button
                              href={item.asset.url}
                              rel="noreferrer"
                              target="_blank"
                              variant="outlined"
                            >
                              Скачать файл
                            </Button>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Stack>
            ))}
          </Stack>
        </Container>
      </Box>
    </SiteShell>
  );
}

