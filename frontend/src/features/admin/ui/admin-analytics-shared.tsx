import { Box, Paper, Stack, Typography } from '@mui/material';

export function formatCompactNumber(value: number | string) {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('ru-RU').format(value);
  }
  return value;
}

export function formatBytes(value: number | null | undefined) {
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

export function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ fontSize: '2rem', fontWeight: 700 }}>{formatCompactNumber(value)}</Typography>
    </Paper>
  );
}

export function BarChart<T>({
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
