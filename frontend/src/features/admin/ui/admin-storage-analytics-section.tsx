import { Alert, Box, Chip, Pagination, Paper, Stack, Typography } from '@mui/material';

import type { StorageAnalytics, StorageTrafficPoint } from '../../../shared/api/admin-contract';
import { formatDateLabel } from '../../../shared/lib/format-date';
import { BarChart, MetricCard, formatBytes, formatCompactNumber } from './admin-analytics-shared';

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
  return (
    <BarChart
      color="#1f2a36"
      items={items}
      labelAccessor={(item) => item.label}
      valueAccessor={(item) => item.requests}
    />
  );
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
  return (
    <BarChart
      color={color}
      items={items}
      labelAccessor={(item) => item.label}
      valueAccessor={(item) => item[valueKey]}
    />
  );
}

function getStorageAlertSeverity(storage: StorageAnalytics): 'info' | 'warning' | 'success' {
  if (!storage.enabled || !storage.metricsConfigured || !storage.logsConfigured) {
    return 'info';
  }
  if (storage.message?.includes('temporarily unavailable') || storage.message?.includes('fallback')) {
    return 'warning';
  }
  return 'success';
}

function getTrafficSummary(storage: StorageAnalytics) {
  if (storage.metricsConfigured && storage.logsConfigured) {
    return 'Трафик в байтах приходит из Yandex Monitoring API, а счётчики запросов — из access logs.';
  }
  if (storage.metricsConfigured) {
    return 'Сейчас доступны байтовые метрики из Yandex Monitoring API. Разбивка по запросам появится после подключения access logs.';
  }
  if (storage.logsConfigured) {
    return 'Сейчас трафик и request counters рассчитаны по access logs без данных Monitoring API.';
  }
  return 'Подключите Monitoring API или access logs, чтобы увидеть сетевую активность бакета.';
}

export function AdminStorageAnalyticsSection({
  onTopObjectsPageChange,
  storage,
}: {
  onTopObjectsPageChange?: (page: number) => void;
  storage: StorageAnalytics;
}) {
  return (
    <Paper sx={{ p: { xs: 3, md: 4 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6">Yandex Object Storage</Typography>
          <Typography color="text.secondary" variant="body2">
            Метрики бакета, access logs и состояние публичного доступа для приватной админки.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <StorageStatusChip active={storage.enabled} label={storage.enabled ? 'Storage подключен' : 'Storage выключен'} />
          <StorageStatusChip active={storage.metricsConfigured} label="Monitoring API" />
          <StorageStatusChip active={storage.logsConfigured} label="Access logs" />
          {storage.bucketName ? <Chip label={`Bucket: ${storage.bucketName}`} size="small" variant="outlined" /> : null}
          {storage.logBucketName ? (
            <Chip label={`Log bucket: ${storage.logBucketName}`} size="small" variant="outlined" />
          ) : null}
        </Stack>

        <Alert severity={getStorageAlertSeverity(storage)}>
          <Stack spacing={0.75}>
            <Typography variant="body2">{getTrafficSummary(storage)}</Typography>
            {storage.message ? <Typography variant="body2">{storage.message}</Typography> : null}
          </Stack>
        </Alert>

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
                  {storage.topObjects.map((item, index) => (
                    <Box
                      key={item.objectKey}
                      sx={{
                        borderBottom:
                          index === storage.topObjects.length - 1 ? 'none' : '1px solid rgba(31, 42, 54, 0.08)',
                        pb: 1.25,
                      }}
                    >
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
                  {storage.topObjectsPagination && storage.topObjectsPagination.totalPages > 1 ? (
                    <Pagination
                      count={storage.topObjectsPagination.totalPages}
                      onChange={(_, page) => onTopObjectsPageChange?.(page)}
                      page={storage.topObjectsPagination.page}
                      shape="rounded"
                      size="small"
                    />
                  ) : null}
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
  );
}
