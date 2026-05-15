import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { Chip, List, ListItem, ListItemIcon, ListItemText, Stack } from '@mui/material';

import { SectionCard } from '../../../shared/ui/section-card/section-card';

const checklist = [
  'Скопируйте .env.example в .env и укажите DOMAIN_NAME и LETSENCRYPT_EMAIL.',
  'Запустите docker compose up -d --build, чтобы собрать фронтенд и поднять Nginx.',
  'После того как DNS начнет резолвиться на сервер, выполните первичную выдачу сертификата через certbot.',
  'Откройте домен в браузере и убедитесь, что страница доступна уже через HTTPS.',
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
          <Chip label="Nginx + TLS" variant="outlined" />
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

