import { CssBaseline, ThemeProvider } from '@mui/material';
import { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { PhotoProvider } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';

import { useAuth, AuthProvider } from './providers/auth-provider';
import { buildAppTheme } from './providers/app-theme';
import { SiteProfileProvider, useSiteProfile } from './providers/site-profile-provider';
import { appRouter } from './router';
import './styles/global.css';

function AppWithProviders() {
  const { activeAccentPreset, activeThemePreset } = useAuth();
  const { siteProfile } = useSiteProfile();
  const theme = useMemo(
    () =>
      buildAppTheme(activeThemePreset, activeAccentPreset, {
        color: siteProfile?.backgroundColor ?? null,
        imageUrl: siteProfile?.backgroundAsset?.url ?? null,
      }),
    [activeAccentPreset, activeThemePreset, siteProfile?.backgroundAsset?.url, siteProfile?.backgroundColor],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PhotoProvider loop maskOpacity={0.55} speed={() => 260}>
        <RouterProvider router={appRouter} />
      </PhotoProvider>
    </ThemeProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <SiteProfileProvider>
        <AppWithProviders />
      </SiteProfileProvider>
    </AuthProvider>
  );
}
