import { alpha, createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7c9cff',
      light: '#a6b9ff',
    },
    secondary: {
      main: '#4dd2b0',
      light: '#85f0d3',
    },
    background: {
      default: '#07111f',
      paper: 'rgba(8, 19, 34, 0.88)',
    },
    text: {
      primary: '#f4f7ff',
      secondary: '#aac0e0',
    },
    divider: alpha('#93b4ff', 0.16),
  },
  shape: {
    borderRadius: 22,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h1: {
      fontWeight: 800,
      lineHeight: 1.05,
    },
    h2: {
      fontWeight: 700,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            'radial-gradient(circle at top, rgba(69, 123, 255, 0.24), transparent 35%), linear-gradient(180deg, #07111f 0%, #09192d 100%)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(16px)',
          border: `1px solid ${alpha('#ffffff', 0.08)}`,
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 18,
        },
      },
    },
  },
});

