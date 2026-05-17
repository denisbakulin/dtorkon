import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';

import type { AdminAnalytics, AdminErrorEvent } from '../../../shared/api/admin-contract';

type ErrorGroupBy = 'none' | 'level' | 'code' | 'requestPath';
type ErrorSortBy = 'newest' | 'oldest' | 'level' | 'code';
type ErrorLevelFilter = 'all' | 'warning' | 'error';

type ErrorGroup = {
  items: AdminErrorEvent[];
  key: string;
  label: string;
};

const panelSurfaceSx = {
  bgcolor: 'rgba(247, 251, 255, 0.82)',
  p: 2,
};

function normalizeGroupLabel(event: AdminErrorEvent, groupBy: ErrorGroupBy) {
  if (groupBy === 'level') {
    return event.level;
  }
  if (groupBy === 'code') {
    return event.code;
  }
  if (groupBy === 'requestPath') {
    return event.requestPath || 'No request path';
  }
  return 'All errors';
}

function compareErrorEvents(left: AdminErrorEvent, right: AdminErrorEvent, sortBy: ErrorSortBy) {
  if (sortBy === 'oldest') {
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  }
  if (sortBy === 'level') {
    if (left.level !== right.level) {
      return left.level === 'error' ? -1 : 1;
    }
  }
  if (sortBy === 'code') {
    const codeComparison = left.code.localeCompare(right.code);
    if (codeComparison !== 0) {
      return codeComparison;
    }
  }

  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function ErrorEventCard({ event }: { event: AdminErrorEvent }) {
  return (
    <Paper sx={panelSurfaceSx}>
      <Stack spacing={1.25}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              color={event.level === 'error' ? 'warning' : 'default'}
              label={event.level}
              size="small"
              variant="outlined"
            />
            <Chip label={event.code} size="small" variant="outlined" />
            {event.statusCode ? <Chip label={`HTTP ${event.statusCode}`} size="small" variant="outlined" /> : null}
          </Stack>
          <Typography color="text.secondary" variant="caption">
            {new Date(event.createdAt).toLocaleString('ru-RU')}
          </Typography>
        </Stack>

        <Typography sx={{ fontWeight: 700 }}>{event.message}</Typography>

        {event.requestMethod || event.requestPath ? (
          <Typography color="text.secondary" variant="body2">
            Request: {[event.requestMethod, event.requestPath].filter(Boolean).join(' ')}
          </Typography>
        ) : null}

        {event.pageUrl ? (
          <Link href={event.pageUrl} rel="noreferrer" target="_blank" underline="hover">
            {event.pageUrl}
          </Link>
        ) : null}

        {event.detailsJson ? (
          <Box
            component="pre"
            sx={{
              bgcolor: 'rgba(15, 23, 42, 0.04)',
              borderRadius: 1,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.75rem',
              m: 0,
              maxHeight: 220,
              overflow: 'auto',
              p: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {event.detailsJson}
          </Box>
        ) : null}

        {event.stackTrace ? (
          <Box
            component="pre"
            sx={{
              bgcolor: 'rgba(15, 23, 42, 0.06)',
              borderRadius: 1,
              color: 'text.secondary',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              m: 0,
              maxHeight: 240,
              overflow: 'auto',
              p: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {event.stackTrace}
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}

export function AdminErrorEventsPanel({
  analytics,
  isLoading,
}: {
  analytics: AdminAnalytics | null;
  isLoading: boolean;
}) {
  const [groupBy, setGroupBy] = useState<ErrorGroupBy>('level');
  const [sortBy, setSortBy] = useState<ErrorSortBy>('newest');
  const [levelFilter, setLevelFilter] = useState<ErrorLevelFilter>('all');

  const groupedErrors = useMemo<ErrorGroup[]>(() => {
    const items = [...(analytics?.recentErrors ?? [])]
      .filter((event) => (levelFilter === 'all' ? true : event.level === levelFilter))
      .sort((left: AdminErrorEvent, right: AdminErrorEvent) => compareErrorEvents(left, right, sortBy));

    if (groupBy === 'none') {
      return [
        {
          items,
          key: 'all',
          label: 'All errors',
        },
      ];
    }

    const groups = new Map<string, AdminErrorEvent[]>();
    for (const event of items) {
      const label = normalizeGroupLabel(event, groupBy);
      const existing = groups.get(label);
      if (existing) {
        existing.push(event);
      } else {
        groups.set(label, [event]);
      }
    }

    return Array.from(groups.entries())
      .map(([label, groupItems]) => ({
        items: groupItems,
        key: label,
        label,
      }))
      .sort((left: ErrorGroup, right: ErrorGroup) => {
        if (sortBy === 'oldest') {
          const leftTime = new Date(left.items[0]?.createdAt ?? 0).getTime();
          const rightTime = new Date(right.items[0]?.createdAt ?? 0).getTime();
          return leftTime - rightTime;
        }

        return right.items.length - left.items.length || left.label.localeCompare(right.label);
      });
  }, [analytics?.recentErrors, groupBy, levelFilter, sortBy]);

  if (isLoading && !analytics) {
    return (
      <Stack spacing={2}>
        <Skeleton height={140} variant="rounded" />
        <Skeleton height={320} variant="rounded" />
      </Stack>
    );
  }

  if (!analytics) {
    return null;
  }

  const visibleErrorsCount = groupedErrors.reduce((count, group) => count + group.items.length, 0);

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6">Error events</Typography>
            <Typography color="text.secondary" variant="body2">
              Recent backend exceptions and validation problems saved in SQLite.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Chip label={`Visible ${visibleErrorsCount}`} variant="outlined" />
            <Chip label={`Total logged ${analytics.totalErrors}`} variant="outlined" />
            {analytics.lastErrorAt ? (
              <Chip label={`Last ${new Date(analytics.lastErrorAt).toLocaleString('ru-RU')}`} variant="outlined" />
            ) : null}
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' },
            }}
          >
            <FormControl size="small">
              <InputLabel id="admin-errors-sort-label">Sort</InputLabel>
              <Select
                label="Sort"
                labelId="admin-errors-sort-label"
                onChange={(event) => setSortBy(event.target.value as ErrorSortBy)}
                value={sortBy}
              >
                <MenuItem value="newest">Newest first</MenuItem>
                <MenuItem value="oldest">Oldest first</MenuItem>
                <MenuItem value="level">Severity first</MenuItem>
                <MenuItem value="code">Code</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small">
              <InputLabel id="admin-errors-group-label">Group</InputLabel>
              <Select
                label="Group"
                labelId="admin-errors-group-label"
                onChange={(event) => setGroupBy(event.target.value as ErrorGroupBy)}
                value={groupBy}
              >
                <MenuItem value="level">By severity</MenuItem>
                <MenuItem value="code">By code</MenuItem>
                <MenuItem value="requestPath">By request path</MenuItem>
                <MenuItem value="none">No grouping</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small">
              <InputLabel id="admin-errors-level-label">Severity</InputLabel>
              <Select
                label="Severity"
                labelId="admin-errors-level-label"
                onChange={(event) => setLevelFilter(event.target.value as ErrorLevelFilter)}
                value={levelFilter}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="error">Errors only</MenuItem>
                <MenuItem value="warning">Warnings only</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Stack>
      </Paper>

      {visibleErrorsCount === 0 ? (
        <Paper sx={{ p: { xs: 3, md: 4 } }}>
          <Typography color="text.secondary" variant="body2">
            No errors match the current filters.
          </Typography>
        </Paper>
      ) : (
        groupedErrors.map((group) => (
          <Paper key={group.key} sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2}>
              {groupBy !== 'none' ? (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="subtitle1">{group.label}</Typography>
                  <Chip label={`${group.items.length} items`} size="small" variant="outlined" />
                </Stack>
              ) : null}

              <Stack spacing={1.5}>
                {group.items.map((event) => (
                  <ErrorEventCard event={event} key={event.id} />
                ))}
              </Stack>
            </Stack>
          </Paper>
        ))
      )}
    </Stack>
  );
}
