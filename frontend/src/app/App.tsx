import { CssBaseline, ThemeProvider } from '@mui/material';

import { HomePage } from '../pages/home/ui/home-page';
import { appTheme } from './providers/app-theme';
import './styles/global.css';

export function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <HomePage />
    </ThemeProvider>
  );
}

