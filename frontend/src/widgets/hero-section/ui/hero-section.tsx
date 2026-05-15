import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import {
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

type HeroSectionProps = {
  host: string;
  protocol: string;
};

export function HeroSection({ host, protocol }: HeroSectionProps) {
  return (
    <Paper sx={{ overflow: 'hidden', p: { xs: 3, md: 4 } }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
        >
          <Stack spacing={1.5} sx={{ maxWidth: 720 }}>
            <Chip
              color="secondary"
              icon={<ShieldRoundedIcon />}
              label="Cloudflare DNS + Nginx static + Docker Compose"
              sx={{ alignSelf: 'flex-start' }}
            />
            <Typography variant="h1" sx={{ fontSize: { xs: '2.6rem', md: '4.25rem' } }}>
              Тестовый лендинг для проверки домена и HTTPS без лишнего бэкенда
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: { xs: '1rem', md: '1.1rem' }, maxWidth: 640 }}>
              Эта сборка нужна, чтобы быстро увидеть: DNS дошёл до сервера, сертификаты
              подключены, а Nginx корректно раздаёт статический React build.
            </Typography>
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              minWidth: { xs: '100%', md: 260 },
              p: 2.5,
              borderRadius: 5,
            }}
          >
            <Stack spacing={1}>
              <Typography variant="overline" color="text.secondary">
                Runtime snapshot
              </Typography>
              <Typography variant="h6">{host}</Typography>
              <Typography color="text.secondary">{protocol} delivery path</Typography>
            </Stack>
          </Paper>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            color="primary"
            href="/site-config.json"
            target="_blank"
            rel="noreferrer"
            variant="contained"
            endIcon={<OpenInNewRoundedIcon />}
          >
            Открыть JSON-конфиг
          </Button>
          <Button href="#deployment-checklist" variant="outlined">
            Посмотреть checklist запуска
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

