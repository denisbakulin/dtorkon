import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

type RouteStubPageProps = {
  title: string;
  description: string;
  routeLabel: string;
  details?: string[];
};

export function RouteStubPage({
  title,
  description,
  routeLabel,
  details = [],
}: RouteStubPageProps) {
  return (
    <Box component="main" sx={{ pb: 10, pt: { xs: 4, md: 6 } }}>
      <Container maxWidth="md">
        <Paper sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={3}>
            <Stack spacing={1.5}>
              <Chip
                color="primary"
                label={routeLabel}
                sx={{ alignSelf: 'flex-start' }}
              />
              <Typography
                variant="h3"
                sx={{ fontSize: { xs: '2rem', md: '2.75rem' } }}
              >
                {title}
              </Typography>
              <Typography color="text.secondary">
                {description}
              </Typography>
            </Stack>

            {details.length > 0 ? (
              <Stack spacing={1.25}>
                {details.map((detail) => (
                  <Paper
                    key={detail}
                    sx={{
                      borderRadius: 1,
                      px: 2,
                      py: 1.5,
                    }}
                    variant="outlined"
                  >
                    <Typography color="text.secondary" variant="body2">
                      {detail}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            ) : null}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                component={RouterLink}
                startIcon={<ArrowBackRoundedIcon />}
                to="/"
                variant="contained"
              >
                Вернуться на главную
              </Button>
              <Button
                component={RouterLink}
                to="/blog"
                variant="outlined"
              >
                Открыть блог
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
