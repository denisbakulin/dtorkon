import { Box, Container, Stack } from '@mui/material';

import { SiteConfigPanel } from '../../../features/site-config/ui/site-config-panel';
import { DeploymentChecklist } from '../../../widgets/deployment-checklist/ui/deployment-checklist';
import { HeroSection } from '../../../widgets/hero-section/ui/hero-section';
import { PlatformHighlights } from '../../../widgets/platform-highlights/ui/platform-highlights';

function getRuntimeLocation() {
  if (typeof window === 'undefined') {
    return {
      host: 'localhost',
      protocol: 'HTTP',
    };
  }

  return {
    host: window.location.host,
    protocol: window.location.protocol.replace(':', '').toUpperCase(),
  };
}

export function HomePage() {
  const locationInfo = getRuntimeLocation();

  return (
    <Box component="main" sx={{ pb: 10, pt: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <HeroSection
            host={locationInfo.host}
            protocol={locationInfo.protocol}
          />

          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                lg: 'minmax(0, 1.4fr) minmax(320px, 0.9fr)',
              },
            }}
          >
            <SiteConfigPanel />
            <PlatformHighlights />
          </Box>

          <DeploymentChecklist />
        </Stack>
      </Container>
    </Box>
  );
}

