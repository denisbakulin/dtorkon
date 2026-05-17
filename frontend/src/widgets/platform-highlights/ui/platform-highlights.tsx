import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import LockClockRoundedIcon from '@mui/icons-material/LockClockRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import { Avatar, Paper, Stack, Typography } from '@mui/material';

import { SectionCard } from '../../../shared/ui/section-card/section-card';

const highlights = [
  {
    title: 'Static-first',
    description: 'Сайт собирается Vite и отдается Caddy напрямую из готового build.',
    icon: <RocketLaunchRoundedIcon />,
  },
  {
    title: 'DNS visible',
    description: 'По адресу страницы сразу видно, что домен смотрит на нужный хост.',
    icon: <CloudDoneRoundedIcon />,
  },
  {
    title: 'TLS ready',
    description: 'Caddy сам выпускает и продлевает сертификаты для доменов проекта.',
    icon: <LockClockRoundedIcon />,
  },
  {
    title: 'Extendable structure',
    description: 'Есть app / pages / widgets / features / shared без тяжёлой архитектуры.',
    icon: <LayersRoundedIcon />,
  },
];

export function PlatformHighlights() {
  return (
    <SectionCard
      description="Минимальная платформа, которую легко развивать дальше."
      title="Что уже заложено"
    >
      <Stack spacing={1.5}>
        {highlights.map((item) => (
          <Paper
            key={item.title}
            variant="outlined"
            sx={{ borderRadius: 1, p: 2 }}
          >
            <Stack direction="row" spacing={2}>
              <Avatar
                sx={{
                  bgcolor: 'rgba(124, 156, 255, 0.18)',
                  color: 'primary.light',
                }}
                variant="rounded"
              >
                {item.icon}
              </Avatar>
              <Stack spacing={0.5}>
                <Typography variant="subtitle1">{item.title}</Typography>
                <Typography color="text.secondary" variant="body2">
                  {item.description}
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </SectionCard>
  );
}
