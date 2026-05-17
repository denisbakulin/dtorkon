import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react';

import { getApiErrorMessage } from '../../../shared/api/api-error';
import { getSiteProfile } from '../../../shared/api/blog-api';
import type { SiteProfile } from '../../../shared/api/blog-contract';
import { SiteShell } from '../../../shared/ui/site-shell/site-shell';

function resolveLinkHref(kind: string, rawValue: string) {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  if (kind === 'email') {
    return `mailto:${value}`;
  }

  if (kind === 'phone') {
    return `tel:${value.replace(/\s+/g, '')}`;
  }

  if (kind === 'telegram') {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    const username = value.startsWith('@') ? value.slice(1) : value;
    return `https://t.me/${username}`;
  }

  if (kind === 'vk') {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    const handle = value.startsWith('@') ? value.slice(1) : value;
    return `https://vk.com/${handle}`;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return `https://${value}`;
}

function resolveLinkIcon(kind: string) {
  if (kind === 'email') {
    return <MailOutlineRoundedIcon color="primary" />;
  }
  if (kind === 'phone') {
    return <PhoneRoundedIcon color="primary" />;
  }
  if (kind === 'telegram') {
    return <SendRoundedIcon color="primary" />;
  }
  if (kind === 'vk') {
    return <LinkRoundedIcon color="primary" />;
  }
  return <LinkRoundedIcon color="primary" />;
}

export function ContactPage() {
  const [siteProfile, setSiteProfile] = useState<SiteProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getSiteProfile(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setSiteProfile(response);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }
        setErrorMessage(getApiErrorMessage(error, 'Не удалось загрузить контакты сайта.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const contactItems =
    siteProfile?.links?.length
      ? [...siteProfile.links].sort((left, right) => left.sortOrder - right.sortOrder)
      : siteProfile?.contactEmail
        ? [
            {
              id: 'legacy-email',
              kind: 'email',
              label: 'Email',
              url: siteProfile.contactEmail,
              sortOrder: 0,
            },
          ]
        : [];

  return (
    <SiteShell>
      <Box component="main" sx={{ pb: 10, pt: { xs: 3, md: 5 } }}>
        <Container maxWidth="md">
          <Paper sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={3}>
              <Stack spacing={1.25}>
                <Typography sx={{ fontSize: { xs: '2rem', md: '2.8rem' } }} variant="h3">
                  Связь
                </Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 620 }}>
                  Контакты читаются из редактируемого профиля сайта и не зависят от статических констант фронтенда.
                </Typography>
              </Stack>

              {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}

              {isLoading ? (
                <Stack spacing={1.5}>
                  <Skeleton height={88} variant="rounded" />
                </Stack>
              ) : null}

              {!isLoading ? (
                <Stack spacing={1.5}>
                  {contactItems.length ? (
                    contactItems.map((item) => {
                      const href = resolveLinkHref(item.kind, item.url);

                      return (
                        <Paper key={item.id} sx={{ p: 2.25 }} variant="outlined">
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                          >
                            <Stack direction="row" spacing={1.5} sx={{ minWidth: 0 }}>
                              <Box>{resolveLinkIcon(item.kind)}</Box>
                              <Stack spacing={0.3} sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2">
                                  {item.label?.trim() ? item.label : item.kind}
                                </Typography>
                                {href ? (
                                  <Link
                                    color="text.secondary"
                                    href={href}
                                    rel="noreferrer"
                                    sx={{ wordBreak: 'break-word' }}
                                    target="_blank"
                                    underline="hover"
                                    variant="body2"
                                  >
                                    {item.url}
                                  </Link>
                                ) : (
                                  <Typography color="text.secondary" sx={{ wordBreak: 'break-word' }} variant="body2">
                                    {item.url || '—'}
                                  </Typography>
                                )}
                              </Stack>
                            </Stack>
                            <Stack direction="row" spacing={1}>
                              <Button
                                onClick={() => navigator.clipboard.writeText(item.url)}
                                startIcon={<ContentCopyRoundedIcon />}
                                variant="text"
                              >
                                Copy
                              </Button>
                            </Stack>
                          </Stack>
                        </Paper>
                      );
                    })
                  ) : (
                    <Paper sx={{ p: 2.25 }} variant="outlined">
                      <Typography color="text.secondary" variant="body2">
                        No contacts yet.
                      </Typography>
                    </Paper>
                  )}
                </Stack>
              ) : null}
            </Stack>
          </Paper>
        </Container>
      </Box>
    </SiteShell>
  );
}
