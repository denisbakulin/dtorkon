import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  Alert,
  Chip,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';

import { SectionCard } from '../../../shared/ui/section-card/section-card';
import { useSiteConfig } from '../model/use-site-config';
import type { SiteStatusTone } from '../types/site-config';

const chipColorMap: Record<SiteStatusTone, 'info' | 'success' | 'warning'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
};

function LoadingState() {
  return (
    <Stack spacing={1.5}>
      <Skeleton height={32} variant="rounded" />
      <Skeleton height={84} variant="rounded" />
      <Skeleton height={84} variant="rounded" />
      <Skeleton height={84} variant="rounded" />
    </Stack>
  );
}

export function SiteConfigPanel() {
  const { data, error, isLoading } = useSiteConfig();

  return (
    <SectionCard
      description="Небольшая статическая проверка того, что Axios читает контент с текущего origin."
      title="Site config probe"
    >
      {isLoading && <LoadingState />}

      {!isLoading && error && (
        <Alert icon={<WarningAmberRoundedIcon />} severity="warning">
          Не удалось прочитать `/site-config.json`: {error}
        </Alert>
      )}

      {!isLoading && data && (
        <Stack divider={<Divider flexItem />} spacing={2}>
          <Stack spacing={1}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
            >
              <Typography variant="h5">{data.projectName}</Typography>
              <Chip
                color="secondary"
                icon={<InfoOutlinedIcon />}
                label={data.environment}
                variant="outlined"
              />
            </Stack>
            <Typography color="text.secondary">{data.headline}</Typography>
          </Stack>

          <Stack spacing={1.5}>
            {data.statusItems.map((item) => (
              <Stack
                key={item.label}
                spacing={1}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Typography variant="subtitle1">{item.label}</Typography>
                  <Chip
                    color={chipColorMap[item.tone ?? 'info']}
                    label={item.tone ?? 'info'}
                    size="small"
                  />
                </Stack>
                <Typography color="text.secondary" variant="body2">
                  {item.value}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Stack spacing={1.25}>
            {data.notes.map((note) => (
              <Alert key={note} severity="info" variant="outlined">
                {note}
              </Alert>
            ))}
          </Stack>
        </Stack>
      )}
    </SectionCard>
  );
}
