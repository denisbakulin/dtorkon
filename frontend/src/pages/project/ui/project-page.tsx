import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
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
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { getApiErrorMessage, getApiErrorStatus } from '../../../shared/api/api-error';
import { getPublicProject } from '../../../shared/api/blog-api';
import type { PublicProjectDetail } from '../../../shared/api/blog-contract';
import { formatDateLabel } from '../../../shared/lib/format-date';
import { type GalleryImage, ImageGalleryDialog } from '../../../shared/ui/image-gallery-dialog/image-gallery-dialog';
import { LightboxImage } from '../../../shared/ui/lightbox-image/lightbox-image';
import { MarkdownRenderer } from '../../../shared/ui/markdown-renderer/markdown-renderer';
import { SiteShell } from '../../../shared/ui/site-shell/site-shell';

function ProjectSkeleton() {
  return (
    <Paper sx={{ p: { xs: 3, md: 4 } }}>
      <Stack spacing={2}>
        <Skeleton width="22%" />
        <Skeleton height={48} width="46%" />
        <Skeleton />
        <Skeleton width="85%" />
        <Skeleton height={320} variant="rounded" />
      </Stack>
    </Paper>
  );
}

export function ProjectPage() {
  const { slug } = useParams();
  const [project, setProject] = useState<PublicProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage(null);
    setNotFound(false);

    getPublicProject(slug, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setProject(response);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }
        if (getApiErrorStatus(error) === 404) {
          setNotFound(true);
          setProject(null);
          return;
        }
        setErrorMessage(getApiErrorMessage(error, 'Unable to load the project.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [slug]);

  const galleryImages = useMemo<GalleryImage[]>(() => {
    if (!project) {
      return [];
    }

    const images: GalleryImage[] = [];
    if (project.coverAsset) {
      images.push({
        alt: project.title,
        caption: project.summary,
        src: project.coverAsset.url,
      });
    }
    images.push(
      ...project.screenshots.map((screenshot) => ({
        alt: screenshot.title || screenshot.asset.originalName,
        caption: screenshot.title || screenshot.asset.originalName,
        src: screenshot.asset.url,
      })),
    );
    return images;
  }, [project]);

  const screenshotOffset = project?.coverAsset ? 1 : 0;

  return (
    <SiteShell>
      <Box component="main" sx={{ pb: 10, pt: { xs: 3, md: 5 } }}>
        <Container maxWidth="lg">
          <Stack spacing={2.5}>
            <Button component={RouterLink} size="small" startIcon={<ArrowBackRoundedIcon />} sx={{ alignSelf: 'flex-start' }} to="/projects" variant="text">
              Back to projects
            </Button>

            {isLoading ? <ProjectSkeleton /> : null}
            {!isLoading && notFound ? (
              <Paper sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="h5">Project not found</Typography>
              </Paper>
            ) : null}
            {!isLoading && errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}

            {project ? (
              <>
                <Paper sx={{ p: { xs: 3, md: 4 } }}>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip color="primary" label={formatDateLabel(project.publishedAt)} size="small" />
                      <Chip label={`${project.screenshots.length} screenshots`} size="small" variant="outlined" />
                    </Stack>

                    <Stack spacing={1}>
                      <Typography sx={{ fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 700, lineHeight: 1.03 }}>
                        {project.title}
                      </Typography>
                      {project.summary ? <Typography variant="h6">{project.summary}</Typography> : null}
                      {project.description ? <Typography color="text.secondary">{project.description}</Typography> : null}
                    </Stack>

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
                        Open GitHub
                      </Button>
                    ) : null}

                    {project.coverAsset ? (
                      <LightboxImage
                        alt={project.title}
                        onOpen={() => setActiveGalleryIndex(0)}
                        src={project.coverAsset.url}
                        sx={{
                          display: 'block',
                          maxHeight: 460,
                          objectFit: 'cover',
                          width: '100%',
                        }}
                      />
                    ) : null}
                  </Stack>
                </Paper>

                {project.readmeExcerpt ? (
                  <Paper sx={{ p: { xs: 3, md: 4 } }}>
                    <Stack spacing={2}>
                      <Typography variant="h6">README.md</Typography>
                      <MarkdownRenderer content={project.readmeExcerpt} />
                    </Stack>
                  </Paper>
                ) : null}

                {project.screenshots.length > 0 ? (
                  <Paper sx={{ p: { xs: 3, md: 4 } }}>
                    <Stack spacing={2}>
                      <Typography variant="h6">Screenshots</Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gap: 1.5,
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, minmax(0, 1fr))',
                          },
                        }}
                      >
                        {project.screenshots.map((screenshot, index) => (
                          <Paper key={screenshot.id} sx={{ overflow: 'hidden', p: 1.25 }} variant="outlined">
                            <Stack spacing={1.25}>
                              <LightboxImage
                                alt={screenshot.title || screenshot.asset.originalName}
                                onOpen={() => setActiveGalleryIndex(index + screenshotOffset)}
                                src={screenshot.asset.url}
                                sx={{
                                  aspectRatio: '16 / 10',
                                  objectFit: 'cover',
                                  width: '100%',
                                }}
                              />
                              <Typography variant="body2">{screenshot.title || screenshot.asset.originalName}</Typography>
                            </Stack>
                          </Paper>
                        ))}
                      </Box>
                    </Stack>
                  </Paper>
                ) : null}
              </>
            ) : null}
          </Stack>
        </Container>
      </Box>

      <ImageGalleryDialog
        images={galleryImages}
        index={activeGalleryIndex ?? 0}
        onClose={() => setActiveGalleryIndex(null)}
        onIndexChange={setActiveGalleryIndex}
        open={activeGalleryIndex !== null && galleryImages.length > 0}
      />
    </SiteShell>
  );
}
