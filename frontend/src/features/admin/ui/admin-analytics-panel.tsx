import { Alert, Box, Chip, Paper, Skeleton, Stack, Typography } from '@mui/material';

import type { AdminAnalytics, StorageTrafficPoint } from '../../../shared/api/admin-contract';
import { formatDateLabel } from '../../../shared/lib/format-date';

function formatCompactNumber(value: number | string) {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('ru-RU').format(value);
  }
  return value;
}

function formatBytes(value: number | null | undefined) {
  if (!value || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let current = value;
  let unitIndex = 0;

  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }

  const digits = current >= 100 || unitIndex === 0 ? 0 : current >= 10 ? 1 : 2;
  return `${current.toFixed(digits)} ${units[unitIndex]}`;
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ fontSize: '2rem', fontWeight: 700 }}>{formatCompactNumber(value)}</Typography>
    </Paper>
  );
}

function BarChart<T>({
  color,
  items,
  labelAccessor,
  valueAccessor,
}: {
  color: string;
  items: T[];
  labelAccessor: (item: T) => string;
  valueAccessor: (item: T) => number;
}) {
  const maxValue = Math.max(1, ...items.map((item) => valueAccessor(item)));

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end', minHeight: 168 }}>
      {items.map((item) => {
        const value = valueAccessor(item);
        return (
          <Stack key={labelAccessor(item)} spacing={0.75} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                bgcolor: color,
                borderRadius: 1,
                height: `${Math.max(8, (value / maxValue) * 120)}px`,
                transition: 'height 160ms ease',
                width: '100%',
              }}
            />
            <Typography color="text.secondary" sx={{ fontSize: '0.72rem' }}>
              {labelAccessor(item)}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}

function StorageStatusChip({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <Chip
      color={active ? 'primary' : 'default'}
      label={label}
      size="small"
      variant={active ? 'filled' : 'outlined'}
    />
  );
}

function RequestsChart({ items }: { items: StorageTrafficPoint[] }) {
  return <BarChart color="#1f2a36" items={items} labelAccessor={(item) => item.label} valueAccessor={(item) => item.requests} />;
}

function TrafficChart({
  color,
  items,
  valueKey,
}: {
  color: string;
  items: StorageTrafficPoint[];
  valueKey: 'incomingBytes' | 'outgoingBytes';
}) {
  return <BarChart color={color} items={items} labelAccessor={(item) => item.label} valueAccessor={(item) => item[valueKey]} />;
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

  const storage = analytics.storageAnalytics;

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6">Analytics</Typography>
            <Typography color="text.secondary" variant="body2">
              Сводка по публикациям, загрузкам, ошибкам и библиотеке медиа внутри приватной админки.
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
                <BarChart
                  color="#2aabee"
                  items={analytics.publicationActivity}
                  labelAccessor={(item) => item.label}
                  valueAccessor={(item) => item.posts}
                />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600, mb: 1 }} variant="body2">
                  Загрузки
                </Typography>
                <BarChart
                  color="#1f2a36"
                  items={analytics.uploadActivity}
                  labelAccessor={(item) => item.label}
                  valueAccessor={(item) => item.uploads}
                />
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

      <Paper sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6">Yandex Object Storage</Typography>
            <Typography color="text.secondary" variant="body2">
              Метрики бакета и access logs из Yandex Cloud API для оценки трафика и самых востребованных файлов.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <StorageStatusChip active={storage.enabled} label={storage.enabled ? 'Storage подключен' : 'Storage выключен'} />
            <StorageStatusChip active={storage.metricsConfigured} label="Cloud metrics API" />
            <StorageStatusChip active={storage.logsConfigured} label="Access logs" />
            {storage.bucketName ? <Chip label={`Bucket: ${storage.bucketName}`} size="small" variant="outlined" /> : null}
          </Stack>

          {storage.message ? <Alert severity="info">{storage.message}</Alert> : null}

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
            }}
          >
            <MetricCard label="Объектов" value={storage.objectCount ?? '—'} />
            <MetricCard label="Занято в бакете" value={storage.usedSizeBytes ? formatBytes(storage.usedSizeBytes) : '—'} />
            <MetricCard label="Входящий трафик 14д" value={formatBytes(storage.totalIncomingBytes)} />
            <MetricCard label="Исходящий трафик 14д" value={formatBytes(storage.totalOutgoingBytes)} />
            <MetricCard label="Запросов 14д" value={storage.totalRequests} />
            <MetricCard label="Read requests" value={storage.readRequests} />
            <MetricCard label="Write requests" value={storage.writeRequests} />
            <MetricCard
              label="Последний лог"
              value={storage.lastLogAt ? formatDateLabel(storage.lastLogAt, 'short') : '—'}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', xl: 'repeat(3, minmax(0, 1fr))' },
            }}
          >
            <Paper sx={{ p: 2.5 }} variant="outlined">
              <Stack spacing={1.5}>
                <Typography sx={{ fontWeight: 600 }} variant="body2">
                  Входящий трафик
                </Typography>
                <TrafficChart color="#2aabee" items={storage.trafficTimeline} valueKey="incomingBytes" />
              </Stack>
            </Paper>
            <Paper sx={{ p: 2.5 }} variant="outlined">
              <Stack spacing={1.5}>
                <Typography sx={{ fontWeight: 600 }} variant="body2">
                  Исходящий трафик
                </Typography>
                <TrafficChart color="#18a97a" items={storage.trafficTimeline} valueKey="outgoingBytes" />
              </Stack>
            </Paper>
            <Paper sx={{ p: 2.5 }} variant="outlined">
              <Stack spacing={1.5}>
                <Typography sx={{ fontWeight: 600 }} variant="body2">
                  Запросы
                </Typography>
                <RequestsChart items={storage.trafficTimeline} />
              </Stack>
            </Paper>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)' },
            }}
          >
            <Paper sx={{ p: 2.5 }} variant="outlined">
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">Чаще всего запрашивают</Typography>
                {storage.topObjects.length > 0 ? (
                  <Stack spacing={1.25}>
                    {storage.topObjects.map((item) => (
                      <Box key={item.objectKey} sx={{ borderBottom: '1px solid rgba(31, 42, 54, 0.08)', pb: 1.25 }}>
                        <Typography sx={{ fontWeight: 600 }} variant="body2">
                          {item.displayName}
                        </Typography>
                        <Typography color="text.secondary" sx={{ wordBreak: 'break-all' }} variant="caption">
                          {item.objectKey}
                        </Typography>
                        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', mt: 0.75 }}>
                          <Chip label={`${formatCompactNumber(item.requests)} req`} size="small" variant="outlined" />
                          <Chip label={`${formatBytes(item.outgoingBytes)} out`} size="small" variant="outlined" />
                          <Chip label={`${formatBytes(item.incomingBytes)} in`} size="small" variant="outlined" />
                          {item.lastRequestedAt ? (
                            <Chip
                              label={`last ${formatDateLabel(item.lastRequestedAt, 'short')}`}
                              size="small"
                              variant="outlined"
                            />
                          ) : null}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    Пока нет access logs с чтениями объектов за выбранное окно.
                  </Typography>
                )}
              </Stack>
            </Paper>

            <Paper sx={{ p: 2.5 }} variant="outlined">
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">Методы запросов</Typography>
                {storage.methodBreakdown.length > 0 ? (
                  <Stack spacing={1.1}>
                    {storage.methodBreakdown.map((item) => {
                      const percent = Math.round((item.requests / Math.max(storage.totalRequests, 1)) * 100);
                      return (
                        <Stack key={item.method} spacing={0.6}>
                          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2">{item.method}</Typography>
                            <Typography color="text.secondary" variant="body2">
                              {formatCompactNumber(item.requests)} • {percent}%
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
                                bgcolor: '#1f2a36',
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
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    Разбивка по методам появится после включения access logs.
                  </Typography>
                )}

                <Box sx={{ pt: 0.5 }}>
                  <Typography color="text.secondary" variant="caption">
                    Public read: {storage.publicReadEnabled === null ? '—' : storage.publicReadEnabled ? 'enabled' : 'disabled'}
                  </Typography>
                  <br />
                  <Typography color="text.secondary" variant="caption">
                    Public list: {storage.publicListEnabled === null ? '—' : storage.publicListEnabled ? 'enabled' : 'disabled'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}
