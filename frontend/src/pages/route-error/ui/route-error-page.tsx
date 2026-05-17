import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink, isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { SiteShell } from '../../../shared/ui/site-shell/site-shell';

function getErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected route error';
}

export function RouteErrorPage() {
  const error = useRouteError();

  return (
    <SiteShell>
      <Box component="main" sx={{ pb: 10, pt: { xs: 4, md: 6 } }}>
        <Container maxWidth="md">
          <Paper sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2}>
              <Typography sx={{ fontSize: { xs: '1.9rem', md: '2.5rem' }, fontWeight: 700 }}>
                Page failed to load
              </Typography>
              <Typography color="text.secondary">
                The route threw an error while loading. In development this often happens after a failed dynamic import and is usually fixed by a full refresh.
              </Typography>
              <Paper
                sx={{
                  bgcolor: 'rgba(15, 23, 42, 0.04)',
                  border: '1px solid',
                  borderColor: 'divider',
                  p: 2,
                }}
                variant="outlined"
              >
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', wordBreak: 'break-word' }} variant="body2">
                  {getErrorMessage(error)}
                </Typography>
              </Paper>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <Button
                  onClick={() => window.location.reload()}
                  startIcon={<RefreshRoundedIcon />}
                  variant="contained"
                >
                  Reload page
                </Button>
                <Button component={RouterLink} to="/" variant="outlined">
                  Go home
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </SiteShell>
  );
}
