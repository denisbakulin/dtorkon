import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  completeAdminUpload,
  createAdminProject,
  deleteAdminProject,
  getAdminProject,
  getAdminProjects,
  presignAdminUpload,
  updateAdminProject,
  uploadAdminAssetContent,
} from '../../../shared/api/admin-api';
import { getApiErrorMessage, getApiErrorStatus } from '../../../shared/api/api-error';
import type {
  AdminProjectDetail,
  AdminProjectStatusFilter,
  AdminProjectSummary,
  CreateAdminProjectRequest,
} from '../../../shared/api/admin-contract';
import type { ProjectStatus, PublicAsset } from '../../../shared/api/blog-contract';
import { formatDateLabel } from '../../../shared/lib/format-date';
import { getAttachmentKindFromMimeType, resolveFileMimeType } from '../../../shared/lib/media';
import { LightboxImage } from '../../../shared/ui/lightbox-image/lightbox-image';

type ProjectDraft = {
  title: string;
  slug: string;
  summary: string;
  description: string;
  readmeExcerpt: string;
  githubUrl: string;
  status: ProjectStatus;
  coverAsset: PublicAsset | null;
  screenshots: Array<{
    asset: PublicAsset;
    title: string;
  }>;
};

const EMPTY_DRAFT: ProjectDraft = {
  title: '',
  slug: '',
  summary: '',
  description: '',
  readmeExcerpt: '',
  githubUrl: '',
  status: 'draft',
  coverAsset: null,
  screenshots: [],
};

const STATUS_OPTIONS: Array<{ label: string; value: AdminProjectStatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
];

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function readImageDimensions(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise<{ height: number; width: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ height: image.naturalHeight, width: image.naturalWidth });
      image.onerror = () => reject(new Error('Unable to read image dimensions.'));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function buildDraft(detail: AdminProjectDetail): ProjectDraft {
  return {
    title: detail.title,
    slug: detail.slug,
    summary: detail.summary,
    description: detail.description,
    readmeExcerpt: detail.readmeExcerpt,
    githubUrl: detail.githubUrl,
    status: detail.status,
    coverAsset: detail.coverAsset,
    screenshots: detail.screenshots.map((screenshot) => ({
      asset: screenshot.asset,
      title: screenshot.title,
    })),
  };
}

function buildPayload(draft: ProjectDraft): CreateAdminProjectRequest {
  return {
    title: draft.title.trim(),
    slug: normalizeSlug(draft.slug || draft.title),
    summary: draft.summary.trim(),
    description: draft.description.trim(),
    readmeExcerpt: draft.readmeExcerpt,
    githubUrl: draft.githubUrl.trim(),
    status: draft.status,
    coverAssetId: draft.coverAsset?.id ?? null,
    screenshots: draft.screenshots.map((screenshot, index) => ({
      assetId: screenshot.asset.id,
      title: screenshot.title.trim(),
      sortOrder: index,
    })),
  };
}

function isUnauthorized(error: unknown) {
  return getApiErrorStatus(error) === 401;
}

export function AdminProjectsPanel({ onAuthExpired }: { onAuthExpired: () => void }) {
  const [projects, setProjects] = useState<AdminProjectSummary[]>([]);
  const [filter, setFilter] = useState<AdminProjectStatusFilter>('all');
  const [query, setQuery] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProjectDraft>(EMPTY_DRAFT);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorSuccess, setEditorSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const screenshotsInputRef = useRef<HTMLInputElement | null>(null);

  const loadProjects = async (signal?: AbortSignal) => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const response = await getAdminProjects({ query, signal, status: filter });
      setProjects(response.items);
      setSelectedProjectId((current) => {
        if (current && response.items.some((item) => item.id === current)) {
          return current;
        }
        return response.items[0]?.id ?? null;
      });
    } catch (error: unknown) {
      if (signal?.aborted || axios.isCancel(error)) {
        return;
      }
      if (isUnauthorized(error)) {
        onAuthExpired();
        return;
      }
      setListError(getApiErrorMessage(error, 'Unable to load projects.'));
    } finally {
      if (!signal?.aborted) {
        setIsLoadingList(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadProjects(controller.signal);
    return () => controller.abort();
  }, [filter, query]);

  useEffect(() => {
    if (isCreateMode || !selectedProjectId) {
      return;
    }

    const controller = new AbortController();
    setIsLoadingDetail(true);
    setEditorError(null);
    setEditorSuccess(null);

    getAdminProject(selectedProjectId, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) {
          setDraft(buildDraft(detail));
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }
        if (isUnauthorized(error)) {
          onAuthExpired();
          return;
        }
        setEditorError(getApiErrorMessage(error, 'Unable to load the selected project.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingDetail(false);
        }
      });

    return () => controller.abort();
  }, [isCreateMode, onAuthExpired, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((item) => item.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const handleCreateNew = () => {
    setIsCreateMode(true);
    setSelectedProjectId(null);
    setDraft(EMPTY_DRAFT);
    setEditorError(null);
    setEditorSuccess(null);
  };

  const uploadImage = async (file: File) => {
    const mimeType = resolveFileMimeType(file);
    const kind = getAttachmentKindFromMimeType(mimeType);
    if (kind !== 'image') {
      throw new Error('Projects only accept image covers and screenshots.');
    }

    const presigned = await presignAdminUpload({
      originalName: file.name,
      mimeType,
      size: file.size,
      kind,
    });
    await uploadAdminAssetContent({
      uploadUrl: presigned.uploadUrl,
      method: presigned.method,
      mimeType,
      requiredHeaders: presigned.requiredHeaders,
      file,
    });
    const dimensions = await readImageDimensions(file);
    return completeAdminUpload({
      assetId: presigned.assetId,
      width: dimensions.width,
      height: dimensions.height,
    });
  };

  const handleUploadCover = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) {
      return;
    }

    try {
      setEditorError(null);
      setEditorSuccess(null);
      const asset = await uploadImage(file);
      setDraft((current) => ({ ...current, coverAsset: asset }));
      setEditorSuccess(`Cover image "${file.name}" uploaded.`);
    } catch (error: unknown) {
      if (isUnauthorized(error)) {
        onAuthExpired();
        return;
      }
      setEditorError(getApiErrorMessage(error, 'Unable to upload the cover image.'));
    } finally {
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
    }
  };

  const handleUploadScreenshots = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) {
      return;
    }

    try {
      setEditorError(null);
      setEditorSuccess(null);
      const uploaded: Array<{ asset: PublicAsset; title: string }> = [];
      for (const file of files) {
        const asset = await uploadImage(file);
        uploaded.push({
          asset,
          title: file.name.replace(/\.[^.]+$/, ''),
        });
      }
      setDraft((current) => ({
        ...current,
        screenshots: [...current.screenshots, ...uploaded],
      }));
      setEditorSuccess(`${uploaded.length} screenshot(s) uploaded.`);
    } catch (error: unknown) {
      if (isUnauthorized(error)) {
        onAuthExpired();
        return;
      }
      setEditorError(getApiErrorMessage(error, 'Unable to upload screenshots.'));
    } finally {
      if (screenshotsInputRef.current) {
        screenshotsInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setEditorError(null);
    setEditorSuccess(null);
    try {
      const payload = buildPayload(draft);
      const detail =
        isCreateMode || !selectedProjectId
          ? await createAdminProject(payload)
          : await updateAdminProject(selectedProjectId, payload);
      setDraft(buildDraft(detail));
      setIsCreateMode(false);
      setSelectedProjectId(detail.id);
      setEditorSuccess(isCreateMode ? 'Project created.' : 'Project saved.');
      await loadProjects();
    } catch (error: unknown) {
      if (isUnauthorized(error)) {
        onAuthExpired();
        return;
      }
      setEditorError(getApiErrorMessage(error, 'Unable to save the project.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProjectId || isCreateMode) {
      return;
    }
    if (!window.confirm('Delete this project? Uploaded assets will stay in storage.')) {
      return;
    }

    setIsDeleting(true);
    setEditorError(null);
    setEditorSuccess(null);
    try {
      await deleteAdminProject(selectedProjectId);
      setDraft(EMPTY_DRAFT);
      setSelectedProjectId(null);
      setEditorSuccess('Project deleted.');
      await loadProjects();
    } catch (error: unknown) {
      if (isUnauthorized(error)) {
        onAuthExpired();
        return;
      }
      setEditorError(getApiErrorMessage(error, 'Unable to delete the project.'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', lg: '340px minmax(0, 1fr)' },
      }}
    >
      <Stack spacing={2}>
        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6">Projects</Typography>
                <Typography color="text.secondary" variant="body2">
                  Portfolio items with GitHub, README notes and screenshots.
                </Typography>
              </Box>
              <IconButton aria-label="Refresh projects" color="primary" onClick={() => void loadProjects()} size="small">
                <RefreshRoundedIcon />
              </IconButton>
            </Stack>

            <Button onClick={handleCreateNew} startIcon={<AddRoundedIcon />} variant="contained">
              New project
            </Button>

            <TextField
              label="Search by title or slug"
              onChange={(event) => setQuery(event.target.value)}
              size="small"
              value={query}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {STATUS_OPTIONS.map((option) => (
                <Chip
                  clickable
                  color={filter === option.value ? 'primary' : 'default'}
                  key={option.value}
                  label={option.label}
                  onClick={() => setFilter(option.value)}
                  variant={filter === option.value ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>

            {listError ? <Alert severity="warning">{listError}</Alert> : null}
          </Stack>
        </Paper>

        <Paper sx={{ p: 1.5 }}>
          <Stack divider={<Divider flexItem />} spacing={0.25}>
            {isLoadingList
              ? Array.from({ length: 4 }, (_, index) => <Skeleton height={82} key={index} variant="rounded" />)
              : null}

            {!isLoadingList && projects.length === 0 ? (
              <Stack spacing={1} sx={{ px: 1.25, py: 2 }}>
                <Typography variant="subtitle2">No projects yet</Typography>
                <Typography color="text.secondary" variant="body2">
                  Create the first showcase item and it will appear here immediately.
                </Typography>
              </Stack>
            ) : null}

            {projects.map((project) => {
              const isActive = !isCreateMode && selectedProjectId === project.id;

              return (
                <Box
                  component="button"
                  key={project.id}
                  onClick={() => {
                    setIsCreateMode(false);
                    setSelectedProjectId(project.id);
                  }}
                  sx={{
                    backgroundColor: isActive ? 'rgba(42, 171, 238, 0.12)' : 'transparent',
                    border: 0,
                    borderRadius: 1,
                    cursor: 'pointer',
                    display: 'block',
                    p: 1.25,
                    textAlign: 'left',
                    width: '100%',
                    '&:hover': {
                      backgroundColor: 'rgba(42, 171, 238, 0.08)',
                    },
                  }}
                  type="button"
                >
                  <Stack spacing={0.9}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <Chip color={project.status === 'published' ? 'primary' : 'default'} label={project.status} size="small" />
                      <Typography color="text.secondary" variant="caption">
                        {formatDateLabel(project.updatedAt, 'short')}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>{project.title}</Typography>
                    <Typography color="text.secondary" variant="caption">
                      /projects/{project.slug}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Paper>
      </Stack>

      <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6">{isCreateMode ? 'New project' : selectedProject?.title || 'Project editor'}</Typography>
              <Typography color="text.secondary" variant="body2">
                Manage the public showcase entry, GitHub link and screenshot gallery.
              </Typography>
            </Box>
            {selectedProject && !isCreateMode && draft.status === 'published' ? (
              <Button
                color="inherit"
                component="a"
                endIcon={<LaunchRoundedIcon />}
                href={`/projects/${draft.slug}`}
                target="_blank"
                variant="outlined"
              >
                Open public page
              </Button>
            ) : null}
          </Stack>

          {editorError ? <Alert severity="warning">{editorError}</Alert> : null}
          {editorSuccess ? <Alert severity="success">{editorSuccess}</Alert> : null}
          {isLoadingDetail ? <Skeleton height={420} variant="rounded" /> : null}

          {!isLoadingDetail ? (
            <>
              <TextField
                label="Title"
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    title: nextTitle,
                    slug: current.slug ? current.slug : normalizeSlug(nextTitle),
                  }));
                }}
                value={draft.title}
              />

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.2fr) 220px' },
                }}
              >
                <TextField
                  helperText="Used in the public URL /projects/:slug"
                  label="Slug"
                  onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))}
                  value={draft.slug}
                />
                <TextField
                  label="Status"
                  onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ProjectStatus }))}
                  select
                  value={draft.status}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                </TextField>
              </Box>

              <TextField
                label="GitHub URL"
                onChange={(event) => setDraft((current) => ({ ...current, githubUrl: event.target.value }))}
                value={draft.githubUrl}
              />

              <TextField
                label="Short summary"
                multiline
                minRows={2}
                onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
                value={draft.summary}
              />

              <TextField
                label="Public description"
                multiline
                minRows={3}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                value={draft.description}
              />

              <TextField
                label="README excerpt (Markdown)"
                multiline
                minRows={8}
                onChange={(event) => setDraft((current) => ({ ...current, readmeExcerpt: event.target.value }))}
                value={draft.readmeExcerpt}
              />

              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1">Cover</Typography>
                  <Button component="label" size="small" startIcon={<CloudUploadRoundedIcon />} variant="outlined">
                    Upload cover
                    <input hidden accept="image/*" onChange={(event) => void handleUploadCover(event.target.files)} ref={coverInputRef} type="file" />
                  </Button>
                </Stack>

                {draft.coverAsset ? (
                  <Paper sx={{ p: 1.25 }} variant="outlined">
                    <Stack spacing={1.25}>
                      <LightboxImage
                        alt={draft.title || 'Project cover'}
                        src={draft.coverAsset.url}
                        sx={{
                          aspectRatio: '16 / 9',
                          objectFit: 'cover',
                          width: '100%',
                        }}
                      />
                      <Button color="inherit" onClick={() => setDraft((current) => ({ ...current, coverAsset: null }))} variant="text">
                        Remove cover
                      </Button>
                    </Stack>
                  </Paper>
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    Add a cover image for the list card and project header.
                  </Typography>
                )}
              </Stack>

              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1">Screenshots</Typography>
                  <Button component="label" size="small" startIcon={<CloudUploadRoundedIcon />} variant="outlined">
                    Upload screenshots
                    <input
                      hidden
                      accept="image/*"
                      multiple
                      onChange={(event) => void handleUploadScreenshots(event.target.files)}
                      ref={screenshotsInputRef}
                      type="file"
                    />
                  </Button>
                </Stack>

                {draft.screenshots.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    Add a screenshot gallery so the public project page can open them as a carousel.
                  </Typography>
                ) : (
                  <Stack spacing={1.25}>
                    {draft.screenshots.map((screenshot, index) => (
                      <Paper key={`${screenshot.asset.id}:${index}`} sx={{ p: 1.25 }} variant="outlined">
                        <Stack spacing={1.25}>
                          <LightboxImage
                            alt={screenshot.title || screenshot.asset.originalName}
                            src={screenshot.asset.url}
                            sx={{
                              aspectRatio: '16 / 10',
                              objectFit: 'cover',
                              width: '100%',
                            }}
                          />
                          <TextField
                            label={`Screenshot ${index + 1} caption`}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                screenshots: current.screenshots.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, title: event.target.value } : item,
                                ),
                              }))
                            }
                            size="small"
                            value={screenshot.title}
                          />
                          <Stack direction="row" spacing={1}>
                            <Button
                              disabled={index === 0}
                              onClick={() =>
                                setDraft((current) => {
                                  const screenshots = [...current.screenshots];
                                  [screenshots[index - 1], screenshots[index]] = [screenshots[index], screenshots[index - 1]];
                                  return { ...current, screenshots };
                                })
                              }
                              variant="text"
                            >
                              Move up
                            </Button>
                            <Button
                              disabled={index === draft.screenshots.length - 1}
                              onClick={() =>
                                setDraft((current) => {
                                  const screenshots = [...current.screenshots];
                                  [screenshots[index], screenshots[index + 1]] = [screenshots[index + 1], screenshots[index]];
                                  return { ...current, screenshots };
                                })
                              }
                              variant="text"
                            >
                              Move down
                            </Button>
                            <Box sx={{ flexGrow: 1 }} />
                            <Button
                              color="error"
                              onClick={() =>
                                setDraft((current) => ({
                                  ...current,
                                  screenshots: current.screenshots.filter((_, itemIndex) => itemIndex !== index),
                                }))
                              }
                              startIcon={<DeleteOutlineRoundedIcon />}
                              variant="text"
                            >
                              Remove
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button disabled={isSaving} onClick={() => void handleSave()} startIcon={<SaveRoundedIcon />} variant="contained">
                  {isSaving ? 'Saving...' : isCreateMode ? 'Create project' : 'Save project'}
                </Button>
                {!isCreateMode ? (
                  <Button color="error" disabled={isDeleting} onClick={() => void handleDelete()} startIcon={<DeleteOutlineRoundedIcon />} variant="outlined">
                    {isDeleting ? 'Deleting...' : 'Delete project'}
                  </Button>
                ) : null}
              </Stack>
            </>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
}
