import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../../app/providers/auth-provider';
import { getApiErrorMessage } from '../../../shared/api/api-error';
import { loginAdmin } from '../../../shared/api/admin-api';
import { getAdminOverviewPath } from '../../../shared/lib/admin-access';
import { SiteShell } from '../../../shared/ui/site-shell/site-shell';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, refreshSession, session } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await loginAdmin({ username, password });
      await refreshSession();
      navigate(getAdminOverviewPath());
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Не удалось войти в админку.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SiteShell>
      <Box component="main" sx={{ pb: 10, pt: { xs: 3, md: 5 } }}>
        <Container maxWidth="sm">
          <Stack spacing={3}>
            <Paper sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={2}>
                <Typography sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 700 }}>
                  Вход в /admin
                </Typography>
                <Typography color="text.secondary">
                  Закрытый вход в приватные панели, настройки сайта и служебные дашборды.
                </Typography>
                {isAuthenticated ? (
                  <Alert severity="success">
                    Активна admin-сессия для {session?.adminDisplayName ?? 'admin'}.
                  </Alert>
                ) : null}
              </Stack>
            </Paper>

            {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}

            <Paper sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={2}>
                <TextField
                  label="Логин"
                  onChange={(event) => setUsername(event.target.value)}
                  value={username}
                />
                <TextField
                  label="Пароль"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
                <Button
                  disabled={isSubmitting}
                  onClick={() => void handleLogin()}
                  startIcon={isSubmitting ? <CircularProgress color="inherit" size={18} /> : <SecurityRoundedIcon />}
                  variant="contained"
                >
                  {isSubmitting ? 'Входим...' : 'Войти'}
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </SiteShell>
  );
}
