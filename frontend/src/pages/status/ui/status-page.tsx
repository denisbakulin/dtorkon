import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded';
import RouterRoundedIcon from '@mui/icons-material/RouterRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

import { getApiErrorMessage } from '../../../shared/api/api-error';
import { getRuntimeStatus } from '../../../shared/api/blog-api';
import type { RuntimeStatusResponse, StatusMonitor, StatusSource } from '../../../shared/api/blog-contract';
import { SiteShell } from '../../../shared/ui/site-shell/site-shell';

function formatBytes(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return '-';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let nextValue = value;
  let unitIndex = 0;
  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }

  return `${nextValue.toFixed(nextValue >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) {
    return '-';
  }

  return `${value.toFixed(digits)}%`;
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || Number.isNaN(seconds)) {
    return '-';
  }

  const totalSeconds = Math.max(Math.floor(seconds), 0);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function statusChipColor(status: string): 'default' | 'error' | 'success' | 'warning' {
  if (status === 'ok' || status === 'up' || status === 'online') {
    return 'success';
  }
  if (status === 'degraded' || status === 'maintenance') {
    return 'warning';
  }
  if (status === 'error' || status === 'down' || status === 'offline') {
    return 'error';
  }
  return 'default';
}

function renderSourceStatus(source: StatusSource) {
  if (!source.enabled) {
    return 'disabled';
  }

  return source.reachable ? 'online' : 'offline';
}

function MonitorRow({ monitor }: { monitor: StatusMonitor }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
    >
      <Stack spacing={0.25}>
        <Typography variant="subtitle2">{monitor.name}</Typography>
        {monitor.url ? (
          <Link href={monitor.url} rel="noreferrer" target="_blank" underline="hover">
            {monitor.url}
          </Link>
        ) : null}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {monitor.pingMs != null ? (
          <Typography color="text.secondary" variant="body2">
            {Math.round(monitor.pingMs)} ms
          </Typography>
        ) : null}
        <Chip color={statusChipColor(monitor.status)} label={monitor.status} size="small" variant="outlined" />
      </Stack>
    </Stack>
  );
}

export function StatusPage() {
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isDisposed = false;
    let activeController: AbortController | null = null;

    const loadStatus = async () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      try {
        const nextStatus = await getRuntimeStatus(controller.signal);
        if (!isDisposed && activeController === controller) {
          setRuntimeStatus(nextStatus);
          setErrorMessage(null);
        }
      } catch (error: unknown) {
        if (axios.isCancel(error) || isDisposed || activeController !== controller) {
          return;
        }

        setErrorMessage(getApiErrorMessage(error, 'Не получилось загрузить статус runtime и мониторинга.'));
      } finally {
        if (!isDisposed && activeController === controller) {
          setIsLoading(false);
          activeController = null;
        }
      }
    };

    void loadStatus();
    const intervalId = window.setInterval(() => {
      void loadStatus();
    }, 30000);

    return () => {
      isDisposed = true;
      activeController?.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  const hostMemoryPercent = useMemo(() => {
    if (runtimeStatus?.host?.memoryUsedBytes == null || runtimeStatus.host.memoryTotalBytes == null) {
      return null;
    }

    return (runtimeStatus.host.memoryUsedBytes / runtimeStatus.host.memoryTotalBytes) * 100;
  }, [runtimeStatus]);

  const hostDiskPercent = useMemo(() => {
    if (runtimeStatus?.host?.diskUsedBytes == null || runtimeStatus.host.diskTotalBytes == null) {
      return null;
    }

    return (runtimeStatus.host.diskUsedBytes / runtimeStatus.host.diskTotalBytes) * 100;
  }, [runtimeStatus]);

  return (
    <SiteShell>
      <Box component="main" sx={{ pb: 10, pt: { xs: 3, md: 5 } }}>
        <Container maxWidth="lg">
          <Stack spacing={3}>
            <Paper sx={{ overflow: 'hidden', p: { xs: 3, md: 4 } }}>
              <Stack spacing={2.5}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1.5}
                  sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
                >
                  <Stack spacing={0.75}>
                    <Typography sx={{ fontSize: { xs: '2.2rem', md: '3rem' }, fontWeight: 700, lineHeight: 1.05 }}>
                      Status
                    </Typography>
                    <Typography color="text.secondary" sx={{ maxWidth: 720 }}>
                      Сводка по backend, серверу и контейнерам. Страница агрегирует данные из самого API, `node_exporter`,
                      `cAdvisor` и, если настроено, публичной status page из `Uptime Kuma`.
                    </Typography>
                  </Stack>
                  <Chip
                    color={statusChipColor(runtimeStatus?.status ?? 'unknown')}
                    icon={<MonitorHeartRoundedIcon />}
                    label={runtimeStatus?.status ?? 'loading'}
                    sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                  />
                </Stack>

                {runtimeStatus ? (
                  <Typography color="text.secondary" variant="body2">
                    Last update: {new Date(runtimeStatus.generatedAt).toLocaleString()}
                  </Typography>
                ) : null}

                {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

                {isLoading && !runtimeStatus ? (
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <CircularProgress size={20} />
                    <Typography color="text.secondary">Загружаю текущие метрики...</Typography>
                  </Stack>
                ) : null}
              </Stack>
            </Paper>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))',
                  xl: 'repeat(4, minmax(0, 1fr))',
                },
              }}
            >
              {[
                {
                  title: 'Backend',
                  icon: <RouterRoundedIcon color="primary" />,
                  primary: runtimeStatus?.backendStatus === 'ok' ? 'Online' : 'Unavailable',
                  secondary: 'Базовый статус API.',
                },
                {
                  title: 'CPU',
                  icon: <MemoryRoundedIcon color="primary" />,
                  primary: formatPercent(runtimeStatus?.host?.cpuUsagePercent),
                  secondary:
                    runtimeStatus?.host?.load1 != null
                      ? `Load ${runtimeStatus.host.load1.toFixed(2)} / ${runtimeStatus.host.load5?.toFixed(2) ?? '-'} / ${runtimeStatus.host.load15?.toFixed(2) ?? '-'}`
                      : 'Node exporter пока не отдал CPU/load.',
                },
                {
                  title: 'Memory',
                  icon: <StorageRoundedIcon color="primary" />,
                  primary:
                    runtimeStatus?.host?.memoryUsedBytes != null && runtimeStatus.host.memoryTotalBytes != null
                      ? `${formatBytes(runtimeStatus.host.memoryUsedBytes)} / ${formatBytes(runtimeStatus.host.memoryTotalBytes)}`
                      : '-',
                  secondary:
                    hostMemoryPercent != null
                      ? `${formatPercent(hostMemoryPercent)} used`
                      : 'Node exporter пока не отдал память.',
                },
                {
                  title: 'Disk',
                  icon: <StorageRoundedIcon color="primary" />,
                  primary:
                    runtimeStatus?.host?.diskUsedBytes != null && runtimeStatus.host.diskTotalBytes != null
                      ? `${formatBytes(runtimeStatus.host.diskUsedBytes)} / ${formatBytes(runtimeStatus.host.diskTotalBytes)}`
                      : '-',
                  secondary: hostDiskPercent != null ? `${formatPercent(hostDiskPercent)} used` : 'Disk metrics unavailable.',
                },
              ].map((card) => (
                <Paper key={card.title} sx={{ p: 2.5 }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                      {card.icon}
                      <Typography variant="subtitle1">{card.title}</Typography>
                    </Stack>
                    <Typography sx={{ fontSize: '1.65rem', fontWeight: 700, lineHeight: 1.1 }}>{card.primary}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {card.secondary}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Box>

            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={2}>
                <Typography variant="h6">Monitoring sources</Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 1.5,
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'repeat(2, minmax(0, 1fr))',
                    },
                  }}
                >
                  {runtimeStatus?.sources.map((source) => (
                    <Paper key={source.name} sx={{ border: 1, borderColor: 'divider', p: 2, boxShadow: 'none' }} variant="outlined">
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2">{source.name}</Typography>
                          <Chip color={statusChipColor(renderSourceStatus(source))} label={renderSourceStatus(source)} size="small" variant="outlined" />
                        </Stack>
                        <Typography color="text.secondary" variant="body2">
                          {source.message || 'No message.'}
                        </Typography>
                        {source.url ? (
                          <Link href={source.url} rel="noreferrer" target="_blank" underline="hover">
                            {source.url}
                          </Link>
                        ) : null}
                      </Stack>
                    </Paper>
                  )) ?? null}
                </Box>
              </Stack>
            </Paper>

            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Typography variant="h6">Host overview</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Uptime: {formatDuration(runtimeStatus?.host?.uptimeSeconds)}
                  </Typography>
                </Stack>

                {runtimeStatus?.host ? (
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
                    <Paper sx={{ border: 1, borderColor: 'divider', p: 2, boxShadow: 'none' }} variant="outlined">
                      <Stack spacing={0.5}>
                        <Typography color="text.secondary" variant="body2">
                          CPU
                        </Typography>
                        <Typography variant="h6">{formatPercent(runtimeStatus.host.cpuUsagePercent)}</Typography>
                        <Typography color="text.secondary" variant="body2">
                          Load: {runtimeStatus.host.load1?.toFixed(2) ?? '-'} / {runtimeStatus.host.load5?.toFixed(2) ?? '-'} / {runtimeStatus.host.load15?.toFixed(2) ?? '-'}
                        </Typography>
                      </Stack>
                    </Paper>
                    <Paper sx={{ border: 1, borderColor: 'divider', p: 2, boxShadow: 'none' }} variant="outlined">
                      <Stack spacing={0.5}>
                        <Typography color="text.secondary" variant="body2">
                          Memory
                        </Typography>
                        <Typography variant="h6">
                          {formatBytes(runtimeStatus.host.memoryUsedBytes)} / {formatBytes(runtimeStatus.host.memoryTotalBytes)}
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                          Free: {formatBytes(runtimeStatus.host.memoryAvailableBytes)}
                        </Typography>
                      </Stack>
                    </Paper>
                    <Paper sx={{ border: 1, borderColor: 'divider', p: 2, boxShadow: 'none' }} variant="outlined">
                      <Stack spacing={0.5}>
                        <Typography color="text.secondary" variant="body2">
                          Disk
                        </Typography>
                        <Typography variant="h6">
                          {formatBytes(runtimeStatus.host.diskUsedBytes)} / {formatBytes(runtimeStatus.host.diskTotalBytes)}
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                          Free: {formatBytes(runtimeStatus.host.diskAvailableBytes)}
                        </Typography>
                      </Stack>
                    </Paper>
                  </Box>
                ) : (
                  <Alert severity="info">Host metrics появятся после подключения `node_exporter`.</Alert>
                )}
              </Stack>
            </Paper>

            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Typography variant="h6">Containers</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {runtimeStatus?.containers.length ?? 0} visible
                  </Typography>
                </Stack>

                {runtimeStatus && runtimeStatus.containers.length > 0 ? (
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 1.5,
                      gridTemplateColumns: {
                        xs: '1fr',
                        lg: 'repeat(2, minmax(0, 1fr))',
                      },
                    }}
                  >
                    {runtimeStatus.containers.map((container) => (
                      <Paper key={`${container.service}-${container.name}`} sx={{ border: 1, borderColor: 'divider', p: 2, boxShadow: 'none' }} variant="outlined">
                        <Stack spacing={1.25}>
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                          >
                            <Stack spacing={0.25}>
                              <Typography variant="subtitle2">{container.service}</Typography>
                              <Typography color="text.secondary" variant="body2">
                                {container.name}
                              </Typography>
                            </Stack>
                            <Chip color={statusChipColor(container.cpuUsagePercent != null ? 'ok' : 'unknown')} label={container.cpuUsagePercent != null ? 'live metrics' : 'warming up'} size="small" variant="outlined" />
                          </Stack>
                          <Box
                            sx={{
                              display: 'grid',
                              gap: 1.25,
                              gridTemplateColumns: {
                                xs: 'repeat(2, minmax(0, 1fr))',
                                sm: 'repeat(4, minmax(0, 1fr))',
                              },
                            }}
                          >
                            <Box>
                              <Typography color="text.secondary" variant="caption">
                                CPU
                              </Typography>
                              <Typography variant="body2">{formatPercent(container.cpuUsagePercent)}</Typography>
                            </Box>
                            <Box>
                              <Typography color="text.secondary" variant="caption">
                                RAM
                              </Typography>
                              <Typography variant="body2">{formatBytes(container.memoryWorkingSetBytes ?? container.memoryUsageBytes)}</Typography>
                            </Box>
                            <Box>
                              <Typography color="text.secondary" variant="caption">
                                FS
                              </Typography>
                              <Typography variant="body2">{formatBytes(container.filesystemUsageBytes)}</Typography>
                            </Box>
                            <Box>
                              <Typography color="text.secondary" variant="caption">
                                Network
                              </Typography>
                              <Typography variant="body2">
                                d {formatBytes(container.networkReceiveBytes)} / u {formatBytes(container.networkTransmitBytes)}
                              </Typography>
                            </Box>
                          </Box>
                        </Stack>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info">Контейнерные метрики появятся после подключения `cAdvisor`.</Alert>
                )}
              </Stack>
            </Paper>

            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Typography variant="h6">Uptime Kuma</Typography>
                  {runtimeStatus?.uptimeKuma ? (
                    <Chip
                      color={statusChipColor(runtimeStatus.uptimeKuma.downMonitors > 0 ? 'degraded' : 'ok')}
                      label={`${runtimeStatus.uptimeKuma.upMonitors}/${runtimeStatus.uptimeKuma.totalMonitors} up`}
                      size="small"
                      variant="outlined"
                    />
                  ) : null}
                </Stack>

                {runtimeStatus?.uptimeKuma ? (
                  <Stack spacing={1.5}>
                    <Stack spacing={0.4}>
                      <Typography variant="subtitle2">{runtimeStatus.uptimeKuma.pageTitle}</Typography>
                      <Link href={runtimeStatus.uptimeKuma.pageUrl} rel="noreferrer" target="_blank" underline="hover">
                        {runtimeStatus.uptimeKuma.pageUrl}
                      </Link>
                    </Stack>
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
                      <Paper sx={{ border: 1, borderColor: 'divider', p: 2, boxShadow: 'none' }} variant="outlined">
                        <Typography color="text.secondary" variant="body2">
                          Up
                        </Typography>
                        <Typography variant="h6">{runtimeStatus.uptimeKuma.upMonitors}</Typography>
                      </Paper>
                      <Paper sx={{ border: 1, borderColor: 'divider', p: 2, boxShadow: 'none' }} variant="outlined">
                        <Typography color="text.secondary" variant="body2">
                          Down
                        </Typography>
                        <Typography variant="h6">{runtimeStatus.uptimeKuma.downMonitors}</Typography>
                      </Paper>
                      <Paper sx={{ border: 1, borderColor: 'divider', p: 2, boxShadow: 'none' }} variant="outlined">
                        <Typography color="text.secondary" variant="body2">
                          Maintenance
                        </Typography>
                        <Typography variant="h6">{runtimeStatus.uptimeKuma.maintenanceMonitors}</Typography>
                      </Paper>
                    </Box>
                    <Stack spacing={1.5}>
                      {runtimeStatus.uptimeKuma.monitors.map((monitor) => (
                        <MonitorRow key={monitor.name} monitor={monitor} />
                      ))}
                    </Stack>
                  </Stack>
                ) : (
                  <Alert severity="info">
                    Подключите `UPTIME_KUMA_BASE_URL` и `UPTIME_KUMA_STATUS_SLUG`, если хотите смешать системные метрики с внешним uptime-мониторингом.
                  </Alert>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </SiteShell>
  );
}
