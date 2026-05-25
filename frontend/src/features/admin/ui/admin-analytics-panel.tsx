import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';

import type {
  AdminAnalyticsActivity,
  AdminAnalyticsOverview,
  StorageAnalytics,
} from '../../../shared/api/admin-contract';
import { formatDateLabel } from '../../../shared/lib/format-date';
import { BarChart, MetricCard } from './admin-analytics-shared';
import { AdminStorageAnalyticsSection } from './admin-storage-analytics-section';

export function AdminAnalyticsPanel({
  activity,
  isLoadingActivity,
  isLoadingOverview,
  isLoadingStorage,
  onStoragePageChange,
  overview,
  storage,
}: {
  activity: AdminAnalyticsActivity | null;
  isLoadingActivity: boolean;
  isLoadingOverview: boolean;
  isLoadingStorage: boolean;
  onStoragePageChange: (page: number) => void;
  overview: AdminAnalyticsOverview | null;
  storage: StorageAnalytics | null;
}) {
  if ((isLoadingOverview && !overview) || (isLoadingActivity && !activity)) {
    return (
      <Stack spacing={2}>
        <Skeleton height={120} variant="rounded" />
        <Skeleton height={280} variant="rounded" />
      </Stack>
    );
  }

  if (!overview || !activity) {
    return null;
  }

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6">Analytics</Typography>
            <Typography color="text.secondary" variant="body2">
              Summary metrics, publication activity, storage traffic and backend errors for the private admin area.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
            }}
          >
            <MetricCard label="Posts" value={overview.totalPosts} />
            <MetricCard label="Drafts" value={overview.draftPosts} />
            <MetricCard label="Published" value={overview.publishedPosts} />
            <MetricCard label="Words" value={overview.totalWords} />
            <MetricCard label="Assets" value={overview.totalAssets} />
            <MetricCard label="Attachments" value={overview.totalAttachments} />
            <MetricCard label="Ready transcripts" value={overview.transcriptReady} />
            <MetricCard label="Failed transcripts" value={overview.transcriptFailed} />
            <MetricCard label="Logged errors" value={overview.totalErrors} />
            <MetricCard
              label="Last error"
              value={overview.lastErrorAt ? formatDateLabel(overview.lastErrorAt, 'short') : 'none'}
            />
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
              <Typography variant="subtitle1">Activity over 14 days</Typography>
              <Typography color="text.secondary" variant="body2">
                Blue bars show published posts, dark bars show new uploads.
              </Typography>
            </Box>

            <Stack spacing={2.5}>
              <Box>
                <Typography sx={{ fontWeight: 600, mb: 1 }} variant="body2">
                  Publications
                </Typography>
                <BarChart
                  color="#2aabee"
                  items={activity.publicationActivity}
                  labelAccessor={(item) => item.label}
                  valueAccessor={(item) => item.posts}
                />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600, mb: 1 }} variant="body2">
                  Uploads
                </Typography>
                <BarChart
                  color="#1f2a36"
                  items={activity.uploadActivity}
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
              <Typography variant="subtitle1">Asset mix</Typography>
              <Typography color="text.secondary" variant="body2">
                Breakdown of assets by file type.
              </Typography>
            </Box>
            <Stack spacing={1.5}>
              {activity.assetBreakdown.map((item) => {
                const total = Math.max(1, overview.totalAssets);
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

      {isLoadingStorage && !storage ? <Skeleton height={320} variant="rounded" /> : null}
      {storage ? <AdminStorageAnalyticsSection onTopObjectsPageChange={onStoragePageChange} storage={storage} /> : null}
    </Stack>
  );
}
