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
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import axios from 'axios';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { getApiErrorMessage } from '../../../shared/api/api-error';
import { getRuntimeStatus } from '../../../shared/api/blog-api';
import type { ContainerStatus, RuntimeStatusResponse, StatusMonitor } from '../../../shared/api/blog-contract';
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
  if (status === 'ok' || status === 'up') {
    return 'success';
  }
  if (status === 'degraded' || status === 'maintenance') {
    return 'warning';
  }
  if (status === 'error' || status === 'down') {
    return 'error';
  }
  return 'default';
}

function DashboardMetric({
  title,
  icon,
  primary,
  secondary,
  value,
}: {
  title: string;
  icon: ReactNode;
  primary: string;
  secondary: string;
  value: number | null;
}) {
  const normalizedValue = value == null || Number.isNaN(value) ? 0 : Math.max(0, Math.min(value, 100));

  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          {icon}
          <Typography variant="subtitle1">{title}</Typography>
        </Stack>
        <Typography sx={{ fontSize: '1.65rem', fontWeight: 700, lineHeight: 1.1 }}>{primary}</Typography>
        <LinearProgress
          sx={{ borderRadius: 999, height: 10 }}
          value={normalizedValue}
          variant={value == null ? 'indeterminate' : 'determinate'}
        />
        <Typography color="text.secondary" variant="body2">
          {secondary}
        </Typography>
      </Stack>
    </Paper>
  );
}

function ContainerDashboardCard({ container, maxMemoryBytes }: { container: ContainerStatus; maxMemoryBytes: number }) {
  const cpuValue = container.cpuUsagePercent ?? null;
  const memoryBytes = container.memoryWorkingSetBytes ?? container.memoryUsageBytes ?? 0;
  const memoryValue = maxMemoryBytes > 0 ? (memoryBytes / maxMemoryBytes) * 100 : null;

  return (
    <Paper sx={{ border: 1, borderColor: 'divider', p: 2, boxShadow: 'none' }} variant="outlined">
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle2">{container.service}</Typography>
            <Typography color="text.secondary" variant="body2">
              CPU {formatPercent(container.cpuUsagePercent)} • RAM {formatBytes(memoryBytes)}
            </Typography>
          </Stack>
          <Chip
            color={statusChipColor(container.cpuUsagePercent != null ? 'ok' : 'default')}
            label={container.cpuUsagePercent != null ? 'live' : 'warmup'}
            size="small"
            variant="outlined"
          />
        </Stack>

        <Stack spacing={0.75}>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
            <Typography color="text.secondary" variant="caption">
              CPU
            </Typography>
            <Typography variant="caption">{formatPercent(cpuValue)}</Typography>
          </Stack>
          <LinearProgress
            sx={{ borderRadius: 999, height: 8 }}
            value={cpuValue == null ? 0 : Math.max(0, Math.min(cpuValue, 100))}
            variant={cpuValue == null ? 'indeterminate' : 'determinate'}
          />
        </Stack>

        <Stack spacing={0.75}>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
            <Typography color="text.secondary" variant="caption">
              Memory share
            </Typography>
            <Typography variant="caption">{memoryValue == null ? '-' : formatPercent(memoryValue)}</Typography>
          </Stack>
          <LinearProgress
            color="secondary"
            sx={{ borderRadius: 999, height: 8 }}
            value={memoryValue == null ? 0 : Math.max(0, Math.min(memoryValue, 100))}
            variant={memoryValue == null ? 'indeterminate' : 'determinate'}
          />
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 1.25,
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
            },
          }}
        >
          <Box>
            <Typography color="text.secondary" variant="caption">
              Filesystem
            </Typography>
            <Typography variant="body2">{formatBytes(container.filesystemUsageBytes)}</Typography>
          </Box>
          <Box>
            <Typography color="text.secondary" variant="caption">
              Downloaded
            </Typography>
            <Typography variant="body2">{formatBytes(container.networkReceiveBytes)}</Typography>
          </Box>
          <Box>
            <Typography color="text.secondary" variant="caption">
              Uploaded
            </Typography>
            <Typography variant="body2">{formatBytes(container.networkTransmitBytes)}</Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}

function MonitorRow({ monitor }: { monitor: StatusMonitor }) {
  return (
    <Paper sx={{ border: 1, borderColor: 'divider', p: 2, boxShadow: 'none' }} variant="outlined">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle2">{monitor.name}</Typography>
          <Typography color="text.secondary" variant="body2">
            {monitor.pingMs != null ? `${Math.round(monitor.pingMs)} ms` : 'Ping unavailable'}
          </Typography>
        </Stack>
        <Chip color={statusChipColor(monitor.status)} label={monitor.status} size="small" variant="outlined" />
      </Stack>
    </Paper>
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

        setErrorMessage(getApiErrorMessage(error, 'Не получилось загрузить дашборд метрик.'));
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

  const containerMaxMemoryBytes = useMemo(() => {
    const values = runtimeStatus?.containers.map((container) => container.memoryWorkingSetBytes ?? container.memoryUsageBytes ?? 0) ?? [];
    return values.length > 0 ? Math.max(...values) : 0;
  }, [runtimeStatus]);

  const topContainers = useMemo(() => {
    return [...(runtimeStatus?.containers ?? [])]
      .sort((left, right) => (right.memoryWorkingSetBytes ?? right.memoryUsageBytes ?? 0) - (left.memoryWorkingSetBytes ?? left.memoryUsageBytes ?? 0))
      .slice(0, 6);
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
                      Короткий дашборд по backend, серверу и контейнерам без служебных ссылок и технического шума.
                    </Typography>
                  </Stack>
                  <Chip
                    color={statusChipColor(runtimeStatus?.status ?? 'default')}
                    icon={<MonitorHeartRoundedIcon />}
                    label={runtimeStatus?.status ?? 'loading'}
                    sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                  />
                </Stack>

                {runtimeStatus ? (
                  <Typography color="text.secondary" variant="body2">
                    Обновлено: {new Date(runtimeStatus.generatedAt).toLocaleString()}
                  </Typography>
                ) : null}

                {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

                {isLoading && !runtimeStatus ? (
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <CircularProgress size={20} />
                    <Typography color="text.secondary">Загружаю метрики...</Typography>
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
              <DashboardMetric
                icon={<RouterRoundedIcon color="primary" />}
                primary={runtimeStatus?.backendStatus === 'ok' ? 'Online' : 'Unavailable'}
                secondary="Базовое состояние API."
                title="Backend"
                value={runtimeStatus?.backendStatus === 'ok' ? 100 : 0}
              />
              <DashboardMetric
                icon={<MemoryRoundedIcon color="primary" />}
                primary={formatPercent(runtimeStatus?.host?.cpuUsagePercent)}
                secondary={
                  runtimeStatus?.host?.load1 != null
                    ? `Load ${runtimeStatus.host.load1.toFixed(2)} / ${runtimeStatus.host.load5?.toFixed(2) ?? '-'} / ${runtimeStatus.host.load15?.toFixed(2) ?? '-'}`
                    : 'CPU и load появятся после node_exporter.'
                }
                title="CPU"
                value={runtimeStatus?.host?.cpuUsagePercent ?? null}
              />
              <DashboardMetric
                icon={<StorageRoundedIcon color="primary" />}
                primary={
                  runtimeStatus?.host?.memoryUsedBytes != null && runtimeStatus.host.memoryTotalBytes != null
                    ? `${formatBytes(runtimeStatus.host.memoryUsedBytes)} / ${formatBytes(runtimeStatus.host.memoryTotalBytes)}`
                    : '-'
                }
                secondary={hostMemoryPercent != null ? `${formatPercent(hostMemoryPercent)} used` : 'Память появится после node_exporter.'}
                title="Memory"
                value={hostMemoryPercent}
              />
              <DashboardMetric
                icon={<StorageRoundedIcon color="primary" />}
                primary={
                  runtimeStatus?.host?.diskUsedBytes != null && runtimeStatus.host.diskTotalBytes != null
                    ? `${formatBytes(runtimeStatus.host.diskUsedBytes)} / ${formatBytes(runtimeStatus.host.diskTotalBytes)}`
                    : '-'
                }
                secondary={hostDiskPercent != null ? `${formatPercent(hostDiskPercent)} used` : 'Диск появится после node_exporter.'}
                title="Disk"
                value={hostDiskPercent}
              />
            </Box>

            <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Typography variant="h6">Host dashboard</Typography>
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
                    <DashboardMetric
                      icon={<MemoryRoundedIcon color="primary" />}
                      primary={formatPercent(runtimeStatus.host.cpuUsagePercent)}
                      secondary={`Load ${runtimeStatus.host.load1?.toFixed(2) ?? '-'} / ${runtimeStatus.host.load5?.toFixed(2) ?? '-'} / ${runtimeStatus.host.load15?.toFixed(2) ?? '-'}`}
                      title="CPU load"
                      value={runtimeStatus.host.cpuUsagePercent}
                    />
                    <DashboardMetric
                      icon={<StorageRoundedIcon color="primary" />}
                      primary={`${formatBytes(runtimeStatus.host.memoryUsedBytes)} / ${formatBytes(runtimeStatus.host.memoryTotalBytes)}`}
                      secondary={`Free ${formatBytes(runtimeStatus.host.memoryAvailableBytes)}`}
                      title="Memory usage"
                      value={hostMemoryPercent}
                    />
                    <DashboardMetric
                      icon={<StorageRoundedIcon color="primary" />}
                      primary={`${formatBytes(runtimeStatus.host.diskUsedBytes)} / ${formatBytes(runtimeStatus.host.diskTotalBytes)}`}
                      secondary={`Free ${formatBytes(runtimeStatus.host.diskAvailableBytes)}`}
                      title="Disk usage"
                      value={hostDiskPercent}
                    />
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
                  <Typography variant="h6">Container dashboard</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {runtimeStatus?.containers.length ?? 0} containers
                  </Typography>
                </Stack>

                {topContainers.length > 0 ? (
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
                    {topContainers.map((container) => (
                      <ContainerDashboardCard
                        container={container}
                        key={`${container.service}-${container.name}`}
                        maxMemoryBytes={containerMaxMemoryBytes}
                      />
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
                  <Typography variant="h6">External checks</Typography>
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
                      <DashboardMetric
                        icon={<MonitorHeartRoundedIcon color="primary" />}
                        primary={String(runtimeStatus.uptimeKuma.upMonitors)}
                        secondary="Мониторы в зелёном состоянии."
                        title="Up"
                        value={
                          runtimeStatus.uptimeKuma.totalMonitors > 0
                            ? (runtimeStatus.uptimeKuma.upMonitors / runtimeStatus.uptimeKuma.totalMonitors) * 100
                            : 0
                        }
                      />
                      <DashboardMetric
                        icon={<MonitorHeartRoundedIcon color="primary" />}
                        primary={String(runtimeStatus.uptimeKuma.downMonitors)}
                        secondary="Проблемные внешние проверки."
                        title="Down"
                        value={
                          runtimeStatus.uptimeKuma.totalMonitors > 0
                            ? (runtimeStatus.uptimeKuma.downMonitors / runtimeStatus.uptimeKuma.totalMonitors) * 100
                            : 0
                        }
                      />
                      <DashboardMetric
                        icon={<MonitorHeartRoundedIcon color="primary" />}
                        primary={String(runtimeStatus.uptimeKuma.maintenanceMonitors)}
                        secondary="Мониторы в maintenance."
                        title="Maintenance"
                        value={
                          runtimeStatus.uptimeKuma.totalMonitors > 0
                            ? (runtimeStatus.uptimeKuma.maintenanceMonitors / runtimeStatus.uptimeKuma.totalMonitors) * 100
                            : 0
                        }
                      />
                    </Box>

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
                      {runtimeStatus.uptimeKuma.monitors.map((monitor) => (
                        <MonitorRow key={monitor.name} monitor={monitor} />
                      ))}
                    </Box>
                  </Stack>
                ) : (
                  <Alert severity="info">Внешние проверки появятся после подключения `Uptime Kuma`.</Alert>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </SiteShell>
  );
}
