import { alpha, createTheme } from '@mui/material/styles';

export type ThemePreset = 'light' | 'dark' | 'bw' | 'high-contrast';
export type AccentPreset = 'sky' | 'mono' | 'ember';
const APP_RADIUS = 8;

type SiteBackgroundConfig = {
  color?: string | null;
  imageUrl?: string | null;
};

function resolveAccent(accentPreset: AccentPreset) {
  if (accentPreset === 'mono') {
    return {
      main: '#111827',
      light: '#4b5563',
      dark: '#030712',
      soft: 'rgba(17, 24, 39, 0.12)',
    };
  }

  if (accentPreset === 'ember') {
    return {
      main: '#dd6b20',
      light: '#f59e0b',
      dark: '#9a3412',
      soft: 'rgba(221, 107, 32, 0.12)',
    };
  }

  return {
    main: '#2aabee',
    light: '#58c1f5',
    dark: '#1f8fca',
    soft: 'rgba(42, 171, 238, 0.12)',
  };
}

export function buildAppTheme(
  themePreset: ThemePreset = 'light',
  accentPreset: AccentPreset = 'sky',
  siteBackground?: SiteBackgroundConfig,
) {
  const accent = resolveAccent(accentPreset);
  const backgroundColor = siteBackground?.color?.trim() || null;
  const backgroundImageUrl = siteBackground?.imageUrl?.trim() || null;

  const resolveBodyBackground = (mode: 'light' | 'dark') => {
    if (!backgroundColor && !backgroundImageUrl) {
      return null;
    }

    if (backgroundImageUrl) {
      const overlay =
        mode === 'dark'
          ? 'linear-gradient(180deg, rgba(2, 6, 23, 0.76) 0%, rgba(2, 6, 23, 0.92) 100%)'
          : 'linear-gradient(180deg, rgba(255, 255, 255, 0.76) 0%, rgba(241, 245, 249, 0.92) 100%)';
      return {
        backgroundColor: backgroundColor ?? (mode === 'dark' ? '#020617' : '#f1f5f9'),
        backgroundImage: `${overlay}, url("${backgroundImageUrl}")`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
      } as const;
    }

    return {
      backgroundColor: backgroundColor ?? (mode === 'dark' ? '#020617' : '#f1f5f9'),
      backgroundImage: 'none',
    } as const;
  };

  if (themePreset === 'dark') {
    const customBackground = resolveBodyBackground('dark');

    return createTheme({
      palette: {
        mode: 'dark',
        primary: { main: accent.main, light: accent.light, dark: accent.dark },
        secondary: { main: '#94a3b8', light: '#cbd5f1' },
        background: { default: '#020617', paper: alpha('#0b1220', 0.88) },
        text: { primary: '#e2e8f0', secondary: '#94a3b8' },
        divider: alpha('#94a3b8', 0.22),
      },
      shape: { borderRadius: APP_RADIUS },
      typography: {
        fontFamily: '"Manrope", "Segoe UI", sans-serif',
        h1: { fontWeight: 700, lineHeight: 1.08 },
        h2: { fontWeight: 700 },
        h6: { fontWeight: 700 },
        button: { textTransform: 'none', fontWeight: 600 },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body:
              customBackground ??
              ({
                backgroundImage: `radial-gradient(circle at top, ${alpha(accent.main, 0.22)}, transparent 34%), linear-gradient(180deg, #0b1220 0%, #020617 100%)`,
              } as const),
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backdropFilter: 'blur(14px)',
              border: `1px solid ${alpha('#94a3b8', 0.18)}`,
              backgroundImage: 'none',
              boxShadow: '0 14px 42px rgba(2, 6, 23, 0.55)',
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: alpha('#020617', 0.82),
              color: '#e2e8f0',
              border: `1px solid ${alpha('#94a3b8', 0.14)}`,
              boxShadow: '0 10px 28px rgba(2, 6, 23, 0.55)',
              backdropFilter: 'blur(16px)',
            },
          },
        },
        MuiButton: {
          defaultProps: {
            disableElevation: true,
          },
          styleOverrides: {
            root: {
              borderRadius: APP_RADIUS,
              paddingInline: 18,
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: APP_RADIUS,
            },
          },
        },
      },
    });
  }

  if (themePreset === 'bw') {
    const customBackground = resolveBodyBackground('light');

    return createTheme({
      palette: {
        mode: 'light',
        primary: { main: '#111111', light: '#333333', dark: '#000000' },
        secondary: { main: '#6b7280', light: '#9ca3af' },
        background: { default: '#f5f5f5', paper: 'rgba(255, 255, 255, 0.92)' },
        text: { primary: '#111111', secondary: '#4b5563' },
        divider: alpha('#111111', 0.14),
      },
      shape: { borderRadius: APP_RADIUS },
      typography: {
        fontFamily: '"Manrope", "Segoe UI", sans-serif',
        h1: { fontWeight: 700, lineHeight: 1.08 },
        h2: { fontWeight: 700 },
        h6: { fontWeight: 700 },
        button: { textTransform: 'none', fontWeight: 600 },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body:
              customBackground ??
              ({
                backgroundImage:
                  'radial-gradient(circle at top, rgba(17, 17, 17, 0.06), transparent 34%), linear-gradient(180deg, #fafafa 0%, #f0f0f0 100%)',
              } as const),
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backdropFilter: 'blur(12px)',
              border: `1px solid ${alpha('#111111', 0.12)}`,
              backgroundImage: 'none',
              boxShadow: '0 10px 24px rgba(17, 17, 17, 0.06)',
            },
          },
        },
      },
    });
  }

  if (themePreset === 'high-contrast') {
    const customBackground = resolveBodyBackground('light');

    return createTheme({
      palette: {
        mode: 'light',
        primary: { main: accent.main, light: accent.light, dark: accent.dark },
        secondary: { main: '#111827', light: '#374151' },
        background: { default: '#ffffff', paper: '#ffffff' },
        text: { primary: '#000000', secondary: '#1f2937' },
        divider: '#000000',
      },
      shape: { borderRadius: APP_RADIUS },
      typography: {
        fontFamily: '"Manrope", "Segoe UI", sans-serif',
        h1: { fontWeight: 800, lineHeight: 1.05 },
        h2: { fontWeight: 800 },
        h6: { fontWeight: 800 },
        button: { textTransform: 'none', fontWeight: 700 },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body:
              customBackground ??
              ({
                backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)',
              } as const),
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              border: '2px solid #000000',
              backgroundImage: 'none',
              boxShadow: 'none',
            },
          },
        },
      },
    });
  }

  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: accent.main,
        light: accent.light,
        dark: accent.dark,
      },
      secondary: {
        main: '#5c6f82',
        light: '#8b99a8',
      },
      background: {
        default: '#edf3f9',
        paper: 'rgba(255, 255, 255, 0.92)',
      },
      text: {
        primary: '#1f2a36',
        secondary: '#617384',
      },
      divider: alpha('#7b8ea6', 0.2),
    },
    shape: {
      borderRadius: APP_RADIUS,
    },
    typography: {
      fontFamily: '"Manrope", "Segoe UI", sans-serif',
      h1: {
        fontWeight: 700,
        lineHeight: 1.08,
      },
      h2: {
        fontWeight: 700,
      },
      h6: {
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
          body:
            resolveBodyBackground('light') ??
            ({
              backgroundImage: `radial-gradient(circle at top, ${accent.soft}, transparent 34%), linear-gradient(180deg, #eff4fa 0%, #e9f0f8 100%)`,
            } as const),
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(12px)',
            border: `1px solid ${alpha('#9fb0c5', 0.26)}`,
            backgroundImage: 'none',
            boxShadow: '0 10px 30px rgba(114, 137, 160, 0.08)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: alpha('#ffffff', 0.9),
            color: '#1f2a36',
            border: `1px solid ${alpha('#9fb0c5', 0.18)}`,
            boxShadow: '0 8px 22px rgba(116, 138, 160, 0.08)',
            backdropFilter: 'blur(14px)',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: APP_RADIUS,
            paddingInline: 18,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: APP_RADIUS,
          },
        },
      },
    },
  });
}
