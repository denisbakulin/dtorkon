import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../../app/providers/auth-provider';
import { useSiteProfile } from '../../../app/providers/site-profile-provider';

const navigationItems = [
  { label: 'Главная', to: '/' },
  { label: 'Блог', to: '/blog' },
  { label: 'Связь', to: '/contact' },
];

function isRouteActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname.startsWith(href);
}

export function SiteHeader() {
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { activeThemePreset, applyGuestPreferences } = useAuth();
  const { siteProfile } = useSiteProfile();

  const headerTitle = siteProfile?.siteTitle?.trim() || 'dtorkon';
  const headerTagline = siteProfile?.siteTagline?.trim() || 'mini blog';
  const headerMark = ((headerTitle.trim()[0] ?? 'd') as string).toLowerCase();

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  const handleToggleTheme = () => {
    applyGuestPreferences({
      themePreset: activeThemePreset === 'dark' ? 'light' : 'dark',
    });
  };

  return (
    <>
      <AppBar
        elevation={0}
        position="sticky"
        sx={(theme) => ({
          backgroundColor: alpha(
            theme.palette.background.paper,
            theme.palette.mode === 'dark' ? 0.5 : 0.72,
          ),
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: 'none',
          borderBottom: `1px solid ${alpha(
            theme.palette.divider,
            theme.palette.mode === 'dark' ? 0.6 : 0.92,
          )}`,
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 14px 36px rgba(2, 6, 23, 0.44)'
              : '0 14px 36px rgba(91, 114, 138, 0.12)',
          overflow: 'hidden',
          top: 0,
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background:
              theme.palette.mode === 'dark'
                ? `linear-gradient(180deg, ${alpha('#020617', 0.36)} 0%, ${alpha(
                    theme.palette.primary.main,
                    0.08,
                  )} 100%)`
                : `linear-gradient(180deg, ${alpha('#ffffff', 0.52)} 0%, ${alpha(
                    theme.palette.primary.main,
                    0.08,
                  )} 100%)`,
            pointerEvents: 'none',
          },
        })}
      >
        <Box
          sx={{
            position: 'relative',
            px: { xs: 2, sm: 3, md: 4, lg: 6, xl: 8 },
            width: '100%',
            zIndex: 1,
          }}
        >
          <Toolbar disableGutters sx={{ gap: 2, minHeight: { xs: 64, md: 74 } }}>
            <Stack
              component={RouterLink}
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: 'center',
                color: 'inherit',
                flexShrink: 0,
                minWidth: 0,
                textDecoration: 'none',
              }}
              to="/"
            >
              <Box
                sx={{
                  bgcolor: 'primary.main',
                  borderRadius: 1,
                  color: '#fff',
                  display: 'grid',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  height: 38,
                  placeItems: 'center',
                  width: 38,
                }}
              > 
                {headerMark} 
              </Box> 
              <Stack spacing={0.1}> 
                <Typography variant="subtitle1">{headerTitle}</Typography> 
                <Typography color="text.secondary" variant="caption"> 
                  {headerTagline} 
                </Typography> 
              </Stack> 
            </Stack> 

            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                display: { xs: 'none', md: 'flex' },
                ml: 3,
              }}
            >
              {navigationItems.map((item) => {
                const active = isRouteActive(location.pathname, item.to);

                return (
                  <Button
                    color="inherit"
                    component={RouterLink}
                    key={item.to}
                    sx={(theme) => ({
                      bgcolor: active ? alpha(theme.palette.primary.main, 0.14) : 'transparent',
                      borderRadius: 1,
                      color: active ? 'primary.main' : 'text.primary',
                      px: 1.8,
                      '&:hover': {
                        bgcolor: active ? alpha(theme.palette.primary.main, 0.18) : alpha('#ffffff', 0.42),
                      },
                    })}
                    to={item.to}
                    variant="text"
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Stack>

            <Box sx={{ flexGrow: 1 }} />

            <Tooltip title={activeThemePreset === 'dark' ? 'Light theme' : 'Dark theme'}>
              <IconButton
                aria-label="Toggle theme"
                color="inherit"
                onClick={handleToggleTheme}
                sx={{ display: { xs: 'none', md: 'inline-flex' } }}
              >
                {activeThemePreset === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
              </IconButton>
            </Tooltip>

            <IconButton
              aria-label="Open navigation"
              color="inherit"
              onClick={() => setIsMobileNavOpen(true)}
              sx={{ display: { md: 'none' } }}
            >
              <MenuRoundedIcon />
            </IconButton>
          </Toolbar>
        </Box>
      </AppBar>

      <Drawer anchor="right" onClose={() => setIsMobileNavOpen(false)} open={isMobileNavOpen}>
        <Box sx={{ minWidth: 280, px: 1.5, py: 2 }}>
          <Stack spacing={1.5} sx={{ px: 1.5, pb: 1.5 }}>
            <Button
              onClick={handleToggleTheme}
              startIcon={activeThemePreset === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
              sx={{ alignSelf: 'flex-start' }}
              variant="outlined"
            >
              {activeThemePreset === 'dark' ? 'Light theme' : 'Dark theme'}
            </Button>
            <Typography variant="subtitle1">Навигация</Typography>
            <Typography color="text.secondary" variant="body2">
              Публичная часть сайта без заметных ссылок на авторскую админку.
            </Typography>
          </Stack>

          <List disablePadding>
            {navigationItems.map((item) => (
              <ListItemButton
                component={RouterLink}
                key={item.to}
                selected={isRouteActive(location.pathname, item.to)}
                sx={{ borderRadius: 1, mb: 0.5 }}
                to={item.to}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
