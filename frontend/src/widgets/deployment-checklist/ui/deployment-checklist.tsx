import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { Chip, List, ListItem, ListItemIcon, ListItemText, Stack } from '@mui/material';

import { SectionCard } from '../../../shared/ui/section-card/section-card';

const checklist = [
  'Скопируйте .env.example в .env и укажите PUBLIC_DOMAIN, PUBLIC_APP_ORIGIN, ADMIN_APP_ORIGIN и LETSENCRYPT_EMAIL.',
  'Запустите docker compose up -d --build, чтобы собрать фронтенд и поднять Caddy.',
  'Убедитесь, что домен уже смотрит на VPS и что порты 80/443 открыты.',
  'Откройте публичный домен и проверьте, что сайт, /admin и HTTPS работают на одном origin.',
];

export function DeploymentChecklist() {
  return (
    <SectionCard
      description="Короткая последовательность для первого запуска на сервере."
      id="deployment-checklist"
      title="Deployment checklist"
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Chip label="React + Vite" variant="outlined" />
          <Chip label="MUI" variant="outlined" />
          <Chip label="Axios" variant="outlined" />
          <Chip label="Caddy + TLS" variant="outlined" />
          <Chip label="Docker Compose" variant="outlined" />
        </Stack>

        <List disablePadding>
          {checklist.map((item) => (
            <ListItem disableGutters key={item} sx={{ alignItems: 'flex-start' }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <DoneRoundedIcon color="secondary" />
              </ListItemIcon>
              <ListItemText primary={item} />
            </ListItem>
          ))}
        </List>
      </Stack>
    </SectionCard>
  );
}
