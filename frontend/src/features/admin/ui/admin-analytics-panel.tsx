import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';

import type { AdminAnalytics } from '../../../shared/api/admin-contract';
import { formatDateLabel } from '../../../shared/lib/format-date';

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ fontSize: '2rem', fontWeight: 700 }}>{value}</Typography>
    </Paper>
  );
}

function ActivityChart({
  bars,
  color,
  valueKey,
}: {
  bars: AdminAnalytics['publicationActivity'];
  color: string;
  valueKey: 'posts' | 'uploads';
}) {
  const maxValue = Math.max(1, ...bars.map((item) => item[valueKey]));

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end', minHeight: 168 }}>
      {bars.map((item) => (
        <Stack key={`${valueKey}-${item.label}`} spacing={0.75} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              bgcolor: color,
              borderRadius: 1,
              height: `${Math.max(8, (item[valueKey] / maxValue) * 120)}px`,
              transition: 'height 160ms ease',
              width: '100%',
            }}
          />
          <Typography color="text.secondary" sx={{ fontSize: '0.72rem' }}>
            {item.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function AdminAnalyticsPanel({
  analytics,
  isLoading,
}: {
  analytics: AdminAnalytics | null;
  isLoading: boolean;
}) {
  if (isLoading && !analytics) {
    return (
      <Stack spacing={2}>
        <Skeleton height={120} variant="rounded" />
        <Skeleton height={280} variant="rounded" />
      </Stack>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6">Analytics</Typography>
            <Typography color="text.secondary" variant="body2">
              Локальный обзор по публикациям, загрузкам и состоянию медиа внутри закрытой админки.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
            }}
          >
            <MetricCard label="Постов" value={analytics.totalPosts} />
            <MetricCard label="Черновиков" value={analytics.draftPosts} />
            <MetricCard label="Опубликовано" value={analytics.publishedPosts} />
            <MetricCard label="Слов в базе" value={analytics.totalWords} />
            <MetricCard label="Медиа assets" value={analytics.totalAssets} />
            <MetricCard label="Вложений" value={analytics.totalAttachments} />
            <MetricCard label="Транскриптов ready" value={analytics.transcriptReady} />
            <MetricCard label="Транскриптов failed" value={analytics.transcriptFailed} />
            <MetricCard label="Logged errors" value={analytics.totalErrors} />
            <MetricCard label="Last error" value={analytics.lastErrorAt ? formatDateLabel(analytics.lastErrorAt, 'short') : 'none'} />
          </Box>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.3fr) minmax(320px, 0.7fr)' },
        }}
      >
        <Paper sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="subtitle1">Активность за 14 дней</Typography>
              <Typography color="text.secondary" variant="body2">
                Синие столбцы показывают опубликованные посты, тёмные — новые загрузки.
              </Typography>
            </Box>

            <Stack spacing={2.5}>
              <Box>
                <Typography sx={{ fontWeight: 600, mb: 1 }} variant="body2">
                  Публикации
                </Typography>
                <ActivityChart bars={analytics.publicationActivity} color="#2aabee" valueKey="posts" />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600, mb: 1 }} variant="body2">
                  Загрузки
                </Typography>
                <ActivityChart bars={analytics.uploadActivity} color="#1f2a36" valueKey="uploads" />
              </Box>
            </Stack>
          </Stack>
        </Paper>

        <Paper sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1">Структура библиотеки</Typography>
              <Typography color="text.secondary" variant="body2">
                Разбивка assets по типам файлов.
              </Typography>
            </Box>
            <Stack spacing={1.5}>
              {analytics.assetBreakdown.map((item) => {
                const total = Math.max(1, analytics.totalAssets);
                const percent = Math.round((item.value / total) * 100);

                return (
                  <Stack key={item.label} spacing={0.6}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{item.label}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {item.value} • {percent}%
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        bgcolor: 'rgba(31, 42, 54, 0.08)',
                        borderRadius: 1,
                        height: 10,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          bgcolor: 'primary.main',
                          borderRadius: 1,
                          height: '100%',
                          width: `${percent}%`,
                        }}
                      />
                    </Box>
                  </Stack>
                );
              })}
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}
