import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../../app/providers/auth-provider';
import { useSiteProfile } from '../../../app/providers/site-profile-provider';
import { getAdminCreatePostPath, getAdminOverviewPath } from '../../lib/admin-access';

const navigationItems = [
  { label: 'Главная', to: '/' },
  { label: 'Блог', to: '/blog' },
  { label: 'Projects', to: '/projects' },
  { label: 'Медиа', to: '/media' },
  { label: 'Status', to: '/status' },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const { activeThemePreset, applyGuestPreferences, isAuthenticated } = useAuth();
  const { siteProfile } = useSiteProfile();

  const headerTitle = siteProfile?.siteTitle?.trim() || 'dtorkon';
  const headerTagline = siteProfile?.siteTagline?.trim() || 'mini blog';
  const showBlogSearch = location.pathname.startsWith('/blog');
  const searchQuery = (searchParams.get('q') ?? '').trim();

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    setSearchInput(searchQuery);
  }, [isSearchOpen, searchQuery]);

  const handleToggleTheme = () => {
    applyGuestPreferences({
      themePreset: activeThemePreset === 'dark' ? 'light' : 'dark',
    });
  };

  const applySearchQuery = (nextQuery: string) => {
    const normalizedQuery = nextQuery.trim();
    const nextSearchParams = new URLSearchParams(searchParams);

    if (normalizedQuery) {
      nextSearchParams.set('q', normalizedQuery);
    } else {
      nextSearchParams.delete('q');
    }

    setSearchParams(nextSearchParams);
  };

  const adminLinks = useMemo(() => {
    if (!isAuthenticated) {
      return null;
    }

    return {
      createHref: getAdminCreatePostPath(),
      overviewHref: getAdminOverviewPath(),
    };
  }, [isAuthenticated]);

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
                  
                  
                  color: '#fff',
                  display: 'grid',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  height: 38,
                  placeItems: 'center',
                  width: 38,
                }}
              >
                <Box
                  alt={`${headerTitle} logo`}
                  component="img"
                  src="/favicon.ico"
                  sx={{
                    display: 'block',
                    height: "100%",
                    width: "100%",
                    borderRadius: 1
                  }}
                />
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

              {adminLinks ? (
                <>
                  <Button
                    color="inherit"
                    component={RouterLink}
                    sx={(theme) => ({
                      borderRadius: 1,
                      color: 'primary.main',
                      px: 1.8,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.14),
                      },
                    })}
                    to={adminLinks.overviewHref}
                    variant="text"
                  >
                    Админка
                  </Button>
                </>
              ) : null}
            </Stack>

            <Box sx={{ flexGrow: 1 }} />

            {showBlogSearch ? (
              <Tooltip title="Search posts">
                <IconButton aria-label="Search posts" color="inherit" onClick={() => setIsSearchOpen(true)}>
                  <SearchRoundedIcon />
                </IconButton>
              </Tooltip>
            ) : null}

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
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1">Навигация</Typography>
              <IconButton aria-label="Close navigation" onClick={() => setIsMobileNavOpen(false)} size="small">
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
            <Button
              onClick={handleToggleTheme}
              startIcon={activeThemePreset === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
              sx={{ alignSelf: 'flex-start' }}
              variant="outlined"
            >
              {activeThemePreset === 'dark' ? 'Light theme' : 'Dark theme'}
            </Button>
            <Typography color="text.secondary" variant="body2">
              Публичная часть сайта.
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
            {adminLinks ? (
              <>
                <ListItemButton component={RouterLink} sx={{ borderRadius: 1, mb: 0.5 }} to={adminLinks.createHref}>
                  <ListItemText primary="Новый пост" />
                </ListItemButton>
                <ListItemButton component={RouterLink} sx={{ borderRadius: 1, mb: 0.5 }} to={adminLinks.overviewHref}>
                  <ListItemText primary="Админка" />
                </ListItemButton>
              </>
            ) : null}
          </List>
        </Box>
      </Drawer>

      <Dialog fullWidth maxWidth="sm" onClose={() => setIsSearchOpen(false)} open={isSearchOpen}>
        <DialogTitle>Поиск по постам</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Поиск"
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                applySearchQuery(searchInput);
                setIsSearchOpen(false);
              }
            }}
            sx={{ mt: 1 }}
            value={searchInput}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {searchQuery ? (
            <Button
              onClick={() => {
                setSearchInput('');
                applySearchQuery('');
                setIsSearchOpen(false);
              }}
              variant="outlined"
            >
              Сбросить
            </Button>
          ) : null}
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={() => setIsSearchOpen(false)} variant="text">
            Отмена
          </Button>
          <Button
            onClick={() => {
              applySearchQuery(searchInput);
              setIsSearchOpen(false);
            }}
            variant="contained"
          >
            Искать
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
