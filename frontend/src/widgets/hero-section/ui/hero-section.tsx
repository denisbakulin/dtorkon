import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import {
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function HeroSection() {
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
              label="Мини-блог"
              sx={{ alignSelf: 'flex-start' }}
            />
            <Typography variant="h1" sx={{ fontSize: { xs: '2.6rem', md: '4.25rem' } }}>
              dtorkon
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: { xs: '1rem', md: '1.1rem' }, maxWidth: 640 }}>
              Публичная витрина и заметки. Минималистичный интерфейс на MUI и аккуратная подача контента.
            </Typography>
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            color="primary"
            component={RouterLink}
            to="/blog"
            variant="contained"
          >
            Читать блог
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
