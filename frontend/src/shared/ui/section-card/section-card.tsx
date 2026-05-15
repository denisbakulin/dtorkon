import { Paper, Stack, Typography } from '@mui/material';
import type { PropsWithChildren } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';

type SectionCardProps = PropsWithChildren<{
  description?: string;
  id?: string;
  sx?: SxProps<Theme>;
  title: string;
}>;

export function SectionCard({
  children,
  description,
  id,
  sx,
  title,
}: SectionCardProps) {
  return (
    <Paper id={id} sx={{ p: { xs: 3, md: 3.5 }, ...sx }}>
      <Stack spacing={2}>
        <Stack spacing={0.75}>
          <Typography variant="h4">{title}</Typography>
          {description && (
            <Typography color="text.secondary">{description}</Typography>
          )}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

