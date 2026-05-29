import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../../../app/providers/auth-provider';
import { AdminProjectsPanel } from '../../../features/admin/ui/admin-projects-panel';
import { getApiErrorMessage } from '../../../shared/api/api-error';
import { getPublicProjects } from '../../../shared/api/blog-api';
import type { PublicProjectListItem } from '../../../shared/api/blog-contract';
import { formatDateLabel } from '../../../shared/lib/format-date';
import { LightboxImage } from '../../../shared/ui/lightbox-image/lightbox-image';
import { SiteShell } from '../../../shared/ui/site-shell/site-shell';

function ProjectsSkeleton() {
  return (
    <Stack spacing={2}>
      {Array.from({ length: 3 }, (_, index) => (
        <Paper key={index} sx={{ border: 1, borderColor: 'divider', boxShadow: 'none', p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2}>
            <Skeleton height={220} variant="rounded" />
            <Skeleton width="24%" />
            <Skeleton height={36} width="50%" />
            <Skeleton />
            <Skeleton width="82%" />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

function ProjectCard({ project }: { project: PublicProjectListItem }) {
  return (
    <Paper sx={{ border: 1, borderColor: 'divider', boxShadow: 'none', overflow: 'hidden', p: { xs: 2.5, md: 3 } }}>
      <Stack spacing={2}>
        {project.coverAsset ? (
          <LightboxImage
            alt={project.title}
            src={project.coverAsset.url}
            sx={{
              aspectRatio: '16 / 9',
              objectFit: 'cover',
              width: '100%',
            }}
          />
        ) : null}

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip color="primary" label={formatDateLabel(project.publishedAt)} size="small" />
          <Chip label={`${project.screenshotCount} скриншотов`} size="small" variant="outlined" />
        </Stack>

        <Stack spacing={1}>
          <Typography sx={{ fontSize: { xs: '1.45rem', md: '1.9rem' }, fontWeight: 700, lineHeight: 1.1 }}>
            {project.title}
          </Typography>
          {project.summary ? <Typography variant="subtitle1">{project.summary}</Typography> : null}
          {project.description ? <Typography color="text.secondary">{project.description}</Typography> : null}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button component={RouterLink} endIcon={<ArrowOutwardRoundedIcon />} to={`/projects/${project.slug}`} variant="contained">
            Открыть проект
          </Button>
          {project.githubUrl ? (
            <Button
              color="inherit"
              component="a"
              endIcon={<LaunchRoundedIcon />}
              href={project.githubUrl}
              rel="noreferrer"
              target="_blank"
              variant="outlined"
            >
              GitHub
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}

export function ProjectsPage() {
  const { isAuthenticated, refreshSession } = useAuth();
  const [projects, setProjects] = useState<PublicProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getPublicProjects(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setProjects(response.items);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }
        setErrorMessage(getApiErrorMessage(error, 'Не получилось загрузить проекты.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <SiteShell>
      <Box component="main" sx={{ pb: 10, pt: { xs: 3, md: 5 } }}>
        <Container maxWidth="lg">
          <Stack spacing={2.5}>
            <Paper sx={{ border: 1, borderColor: 'divider', boxShadow: 'none', p: { xs: 3, md: 4 } }}>
              <Stack spacing={1.25}>
                <Typography sx={{ fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 700, lineHeight: 1.03 }}>
                  Проекты
                </Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
                  Витрина рабочих проектов с репозиториями, скриншотами и кратким README-обзором по каждому кейсу.
                </Typography>
              </Stack>
            </Paper>

            {isAuthenticated ? (
              <Paper sx={{ border: 1, borderColor: 'divider', boxShadow: 'none', p: { xs: 3, md: 4 } }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6">Управление проектами</Typography>
                    <Typography color="text.secondary" variant="body2">
                      Ты авторизован как админ, поэтому можно добавлять и редактировать проекты прямо отсюда, не переходя в `/admin`.
                    </Typography>
                  </Box>
                  <AdminProjectsPanel onAuthExpired={() => void refreshSession()} />
                </Stack>
              </Paper>
            ) : null}

            {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}
            {isLoading ? <ProjectsSkeleton /> : null}

            {!isLoading && projects.length === 0 ? (
              <Paper sx={{ border: 1, borderColor: 'divider', boxShadow: 'none', p: { xs: 3, md: 4 } }}>
                <Typography color="text.secondary">Опубликованных проектов пока нет.</Typography>
              </Paper>
            ) : null}

            {projects.length > 0 ? (
              <Stack spacing={2}>
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </Stack>
            ) : null}
          </Stack>
        </Container>
      </Box>
    </SiteShell>
  );
}
