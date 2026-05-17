import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import TranscribeRoundedIcon from '@mui/icons-material/TranscribeRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../../../app/providers/auth-provider';
import { useSiteProfile } from '../../../app/providers/site-profile-provider';
import {
  completeAdminUpload,
  createAdminPost,
  deleteAdminAsset,
  deleteAdminPost,
  getAdminAnalytics,
  getAdminPost,
  getAdminPosts,
  getAdminSiteProfile,
  presignAdminUpload,
  transcribeAdminAsset,
  updateAdminPost,
  updateAdminSiteProfile,
  uploadAdminAssetContent,
} from '../../../shared/api/admin-api';
import type {
  AdminAnalytics,
  AdminPostDetail,
  AdminPostSummary,
  AdminPostStatusFilter,
  CreateAdminPostRequest,
  SiteProfile,
  UpdateSiteProfileRequest,
} from '../../../shared/api/admin-contract';
import { getApiErrorMessage, getApiErrorStatus } from '../../../shared/api/api-error';
import type { AttachmentKind, PostStatus, PublicAsset } from '../../../shared/api/blog-contract';
import {
  getAdminCreatePostPath,
  getAdminEditPostPath,
  getAdminLoginPath,
  getAdminOverviewPath,
} from '../../../shared/lib/admin-access';
import { formatDateLabel } from '../../../shared/lib/format-date';
import { triggerBrowserDownload } from '../../../shared/lib/download';
import {
  FILE_UPLOAD_ACCEPT,
  getAssetKind,
  getAttachmentKindFromMimeType,
  resolveFileMimeType,
  stripFileExtension,
} from '../../../shared/lib/media';
import { ImageEditorDialog } from '../../../shared/ui/image-editor-dialog/image-editor-dialog';
import { MarkdownEditor } from '../../../shared/ui/markdown-editor/markdown-editor';
import { MarkdownRenderer } from '../../../shared/ui/markdown-renderer/markdown-renderer';
import { LightboxImage } from '../../../shared/ui/lightbox-image/lightbox-image';
import { MediaPlayer } from '../../../shared/ui/media-player/media-player';
import { SiteShell } from '../../../shared/ui/site-shell/site-shell';
import { AdminAnalyticsPanel } from './admin-analytics-panel';
import { AdminErrorEventsPanel } from './admin-error-events-panel';
import { TranscriptionSettingsPanel } from './transcription-settings-panel';
import { VoiceRecorderPanel } from './voice-recorder-panel';

type AdminWorkspaceProps = {
  mode: 'overview' | 'create' | 'edit';
  postId?: string;
};

type DraftOrigin = 'persisted' | 'session';

type DraftAttachment = {
  asset: PublicAsset;
  kind: AttachmentKind;
  origin: DraftOrigin;
  title: string;
};

type DraftInlineAsset = {
  asset: PublicAsset;
  origin: DraftOrigin;
};

type DraftCover = {
  asset: PublicAsset;
  origin: DraftOrigin;
} | null;

type PostDraft = {
  attachments: DraftAttachment[];
  bodyMarkdown: string;
  cover: DraftCover;
  excerpt: string;
  inlineAssets: DraftInlineAsset[];
  slug: string;
  status: PostStatus;
  title: string;
};

type UploadState =
  | { status: 'idle' }
  | {
      fileName: string;
      message?: string;
      status: 'presigning' | 'uploading' | 'completing' | 'error';
    };

type EditorPaneProps = {
  mode: 'create' | 'edit';
  onAuthExpired: () => void;
  onPostDeleted: () => void;
  onPostSaved: () => void;
  postId?: string;
};

type OverviewPaneProps = {
  analytics: AdminAnalytics | null;
  isLoadingAnalytics: boolean;
  isLoadingMeta: boolean;
  onCreatePost: () => void;
  onSaveSiteProfile: (payload: UpdateSiteProfileRequest) => Promise<SiteProfile>;
  posts: AdminPostSummary[];
  siteProfile: SiteProfile | null;
};

type OverviewTab = 'dashboard' | 'errors' | 'siteProfile' | 'transcription';

type EditableProfileLink = {
  kind: 'email' | 'phone' | 'telegram' | 'vk' | 'link';
  label: string;
  url: string;
};

type SiteProfileDraft = Omit<SiteProfile, 'links'> & { links: EditableProfileLink[] };

type PendingImageEdit = {
  file: File;
  target: 'cover' | 'inline' | 'attachment';
};

const IMAGE_EDITOR_AUTOOPEN_STORAGE_KEY = 'dtorkon.admin.imageEditor.autoOpen';

const STATUS_OPTIONS: Array<{ label: string; value: AdminPostStatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
];

const EMPTY_DRAFT: PostDraft = {
  attachments: [],
  bodyMarkdown: '',
  cover: null,
  excerpt: '',
  inlineAssets: [],
  slug: '',
  status: 'draft',
  title: '',
};

const editorSectionSx = {
  bgcolor: 'rgba(247, 251, 255, 0.86)',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  px: { xs: 2, md: 2.75 },
  py: { xs: 2, md: 2.5 },
};

const editorCardSx = {
  bgcolor: 'rgba(255, 255, 255, 0.82)',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  p: { xs: 1.75, md: 2 },
};

const editorFieldSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
};

function isUnauthorized(error: unknown) {
  return getApiErrorStatus(error) === 401;
}

function isNotFound(error: unknown) {
  return getApiErrorStatus(error) === 404;
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeProfileLinks(profile: SiteProfile): EditableProfileLink[] {
  if (profile.links?.length) {
    return profile.links.map((link) => ({
      kind: link.kind,
      label: link.label ?? '',
      url: link.url ?? '',
    }));
  }

  if (profile.contactEmail?.trim()) {
    return [{ kind: 'email', label: 'Email', url: profile.contactEmail.trim() }];
  }

  return [];
}

function buildDraftFromDetail(detail: AdminPostDetail): PostDraft {
  return {
    attachments: detail.attachments.map((attachment) => ({
      asset: attachment.asset,
      kind: attachment.kind,
      origin: 'persisted',
      title: attachment.title,
    })),
    bodyMarkdown: detail.bodyMarkdown,
    cover: detail.coverAsset
      ? {
          asset: detail.coverAsset,
          origin: 'persisted',
        }
      : null,
    excerpt: detail.excerpt,
    inlineAssets: detail.inlineAssets.map((asset) => ({
      asset,
      origin: 'persisted',
    })),
    slug: detail.slug,
    status: detail.status,
    title: detail.title,
  };
}

function buildPostPayload(draft: PostDraft): CreateAdminPostRequest {
  return {
    attachments: draft.attachments.map((attachment, index) => ({
      assetId: attachment.asset.id,
      kind: attachment.kind,
      sortOrder: index,
      title: attachment.title.trim(),
    })),
    bodyMarkdown: draft.bodyMarkdown,
    coverAssetId: draft.cover?.asset.id ?? null,
    excerpt: draft.excerpt.trim(),
    inlineAssetIds: draft.inlineAssets.map((inlineAsset) => inlineAsset.asset.id),
    slug: normalizeSlug(draft.slug),
    status: draft.status,
    title: draft.title.trim(),
  };
}

function buildInlineMediaSnippet(asset: PublicAsset) {
  const label = stripFileExtension(asset.originalName) || asset.originalName;

  if (getAssetKind(asset) === 'image') {
    return `![${label}](${asset.url})`;
  }

  return `[${label}](${asset.url})`;
}

function appendMarkdownSnippet(bodyMarkdown: string, snippet: string) {
  const trimmedBody = bodyMarkdown.trimEnd();
  return trimmedBody ? `${trimmedBody}\n\n${snippet}\n` : `${snippet}\n`;
}

async function readImageDimensions(file: File) {
  if (!resolveFileMimeType(file).startsWith('image/')) {
    return null;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const dimensions = await new Promise<{ height: number; width: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ height: image.naturalHeight, width: image.naturalWidth });
      image.onerror = () => reject(new Error('Unable to read image dimensions.'));
      image.src = objectUrl;
    });

    return dimensions;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getAttachmentIcon(kind: AttachmentKind) {
  if (kind === 'image') {
    return <ImageRoundedIcon fontSize="small" />;
  }
  if (kind === 'audio') {
    return <GraphicEqRoundedIcon fontSize="small" />;
  }
  if (kind === 'video') {
    return <MovieRoundedIcon fontSize="small" />;
  }
  return <InsertDriveFileRoundedIcon fontSize="small" />;
}

function getAttachmentKindLabel(kind: AttachmentKind) {
  if (kind === 'image') {
    return 'Image';
  }
  if (kind === 'audio') {
    return 'Audio';
  }
  if (kind === 'video') {
    return 'Video';
  }
  return 'File';
}

function getTranscriptLabel(status: PublicAsset['transcriptStatus']) {
  if (status === 'processing') {
    return 'Transcribing';
  }
  if (status === 'ready') {
    return 'Transcript ready';
  }
  if (status === 'failed') {
    return 'Transcript failed';
  }
  return 'No transcript';
}

function StatusChip({ status }: { status: PostStatus }) {
  return (
    <Chip
      color={status === 'published' ? 'primary' : 'default'}
      label={status === 'published' ? 'Published' : 'Draft'}
      size="small"
      variant={status === 'published' ? 'filled' : 'outlined'}
    />
  );
}

function SessionSkeleton() {
  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: 3.5 }}>
        <Stack spacing={1.5}>
          <Skeleton height={32} width="28%" />
          <Skeleton width="64%" />
          <Skeleton width="46%" />
        </Stack>
      </Paper>
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', lg: '320px minmax(0, 1fr)' },
        }}
      >
        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={1.25}>
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} height={74} variant="rounded" />
            ))}
          </Stack>
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={1.5}>
            <Skeleton height={40} width="34%" />
            <Skeleton height={52} />
            <Skeleton height={52} />
            <Skeleton height={240} />
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}

function AccessPanel({
  actionHref,
  actionLabel,
  description,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  description: string;
  title: string;
}) {
  return (
    <Paper sx={{ mx: 'auto', maxWidth: 680, p: { xs: 3, md: 4 } }}>
      <Stack spacing={2}>
        <Typography sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography color="text.secondary">{description}</Typography>
        <Button component={RouterLink} sx={{ alignSelf: 'flex-start' }} to={actionHref} variant="contained">
          {actionLabel}
        </Button>
      </Stack>
    </Paper>
  );
}

function PostsSidebar({
  activePostId,
  filter,
  isRefreshing,
  onCreatePost,
  onFilterChange,
  onLogout,
  onRefresh,
  onSearchChange,
  posts,
  searchValue,
}: {
  activePostId?: string;
  filter: AdminPostStatusFilter;
  isRefreshing: boolean;
  onCreatePost: () => void;
  onFilterChange: (value: AdminPostStatusFilter) => void;
  onLogout: () => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  posts: AdminPostSummary[];
  searchValue: string;
}) {
  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6">Posts</Typography>
              <Typography color="text.secondary" variant="body2">
                Search and jump into any draft or published article.
              </Typography>
            </Box>
            <IconButton aria-label="Refresh posts" color="primary" onClick={onRefresh} size="small">
              <RefreshRoundedIcon />
            </IconButton>
          </Stack>

          <Button onClick={onCreatePost} startIcon={<AddRoundedIcon />} variant="contained">
            New post
          </Button>

          <TextField
            label="Search by title or slug"
            onChange={(event) => onSearchChange(event.target.value)}
            size="small"
            value={searchValue}
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
                onClick={() => onFilterChange(option.value)}
                variant={filter === option.value ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.5 }}>
        <Stack divider={<Divider flexItem />} spacing={0.25}>
          {isRefreshing && posts.length === 0
            ? Array.from({ length: 4 }, (_, index) => <Skeleton height={76} key={index} variant="rounded" />)
            : null}

          {!isRefreshing && posts.length === 0 ? (
            <Stack spacing={1} sx={{ px: 1.25, py: 2 }}>
              <Typography variant="subtitle2">No posts yet</Typography>
              <Typography color="text.secondary" variant="body2">
                Create the first article from this workspace and it will appear here immediately.
              </Typography>
            </Stack>
          ) : null}

          {posts.map((post) => {
            const isActive = activePostId === post.id;

            return (
              <Box
                component={RouterLink}
                key={post.id}
                sx={{
                  borderRadius: 1,
                  color: 'inherit',
                  display: 'block',
                  px: 1.25,
                  py: 1.25,
                  textDecoration: 'none',
                  transition: 'background-color 160ms ease, transform 160ms ease',
                  '&:hover': {
                    backgroundColor: 'rgba(42, 171, 238, 0.08)',
                    transform: 'translateX(2px)',
                  },
                  ...(isActive
                    ? {
                        backgroundColor: 'rgba(42, 171, 238, 0.12)',
                        outline: '1px solid rgba(42, 171, 238, 0.2)',
                      }
                    : null),
                }}
                to={getAdminEditPostPath(post.id)}
              >
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <StatusChip status={post.status} />
                    <Typography color="text.secondary" variant="caption">
                      {formatDateLabel(post.updatedAt, 'short')}
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>{post.title}</Typography>
                  <Typography color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace' }} variant="caption">
                    /posts/{post.slug}
                  </Typography>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Paper>

      <Button color="inherit" onClick={onLogout} startIcon={<ShieldRoundedIcon />} sx={{ justifyContent: 'flex-start' }} variant="outlined">
        Log out
      </Button>
    </Stack>
  );
}

function OverviewPane({
  analytics,
  isLoadingAnalytics,
  isLoadingMeta,
  onCreatePost,
  onSaveSiteProfile,
  posts,
  siteProfile,
}: OverviewPaneProps) {
  const [activeTab, setActiveTab] = useState<OverviewTab>('dashboard');
  const [profileDraft, setProfileDraft] = useState<SiteProfileDraft | null>(
    siteProfile ? { ...siteProfile, links: normalizeProfileLinks(siteProfile) } : null,
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const [backgroundUploadState, setBackgroundUploadState] = useState<UploadState>({ status: 'idle' });

  useEffect(() => {
    setProfileDraft(siteProfile ? { ...siteProfile, links: normalizeProfileLinks(siteProfile) } : null);
  }, [siteProfile]);

  const latestPost = posts[0] ?? null;

  const isBackgroundUploading =
    backgroundUploadState.status !== 'idle' && backgroundUploadState.status !== 'error';

  const uploadBackgroundImage = async (file: File) => {
    const mimeType = resolveFileMimeType(file);
    const kind = getAttachmentKindFromMimeType(mimeType);
    let createdAssetId: string | null = null;

    if (kind !== 'image') {
      setProfileError('Background must be an image file.');
      return;
    }

    try {
      setProfileError(null);
      setProfileSuccess(null);
      setBackgroundUploadState({ status: 'presigning', fileName: file.name });

      const presigned = await presignAdminUpload({
        kind,
        mimeType,
        originalName: file.name,
        size: file.size,
      });
      createdAssetId = presigned.assetId;

      setBackgroundUploadState({ status: 'uploading', fileName: file.name });
      await uploadAdminAssetContent({
        file,
        method: presigned.method,
        mimeType,
        requiredHeaders: presigned.requiredHeaders,
        uploadUrl: presigned.uploadUrl,
      });

      setBackgroundUploadState({ status: 'completing', fileName: file.name });
      const dimensions = await readImageDimensions(file);
      const asset = await completeAdminUpload({
        assetId: presigned.assetId,
        height: dimensions?.height,
        width: dimensions?.width,
      });

      setProfileDraft((current) =>
        current
          ? {
              ...current,
              backgroundAssetId: asset.id,
              backgroundAsset: asset,
            }
          : current,
      );
      setBackgroundUploadState({ status: 'idle' });
      setProfileSuccess(`Background image ${file.name} uploaded.`);
    } catch (error: unknown) {
      if (createdAssetId) {
        void deleteAdminAsset(createdAssetId).catch(() => undefined);
      }

      setBackgroundUploadState({
        fileName: file.name,
        message: getApiErrorMessage(error, 'Unable to upload the background image.'),
        status: 'error',
      });
      setProfileError(getApiErrorMessage(error, 'Unable to upload the background image.'));
    } finally {
      if (backgroundInputRef.current) {
        backgroundInputRef.current.value = '';
      }
    }
  };

  const handleBackgroundSelection = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || isBackgroundUploading) {
      return;
    }

    await uploadBackgroundImage(file);
  };

  const handleSaveProfile = async () => {
    if (!profileDraft) {
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const links = profileDraft.links
        .map((link) => ({
          kind: link.kind,
          label: link.label.trim(),
          url: link.url.trim(),
        }))
        .filter((link) => link.url);

      const nextProfile = await onSaveSiteProfile({ 
        siteTitle: profileDraft.siteTitle, 
        siteTagline: profileDraft.siteTagline, 
        authorBio: profileDraft.authorBio, 
        authorName: profileDraft.authorName, 
        backgroundAssetId: profileDraft.backgroundAssetId, 
        backgroundColor: profileDraft.backgroundColor, 
        links, 
      });
      setProfileDraft({ ...nextProfile, links: normalizeProfileLinks(nextProfile) });
      setProfileSuccess('Site profile updated.');
    } catch (error: unknown) {
      setProfileError(getApiErrorMessage(error, 'Unable to save site profile.'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={1.5}>
          <Typography sx={{ fontSize: { xs: '1.8rem', md: '2.5rem' }, fontWeight: 700 }}>
            Author workspace
          </Typography>
          <Typography color="text.secondary">
            Отдельная скрытая админка для контента, загрузок, настроек сайта и внутренней аналитики.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Button onClick={onCreatePost} startIcon={<AddRoundedIcon />} variant="contained">
              Create new post
            </Button>
            {latestPost ? (
              <Button
                component={RouterLink}
                endIcon={<LaunchRoundedIcon />}
                sx={{ alignSelf: 'flex-start' }}
                to={getAdminEditPostPath(latestPost.id)}
                variant="outlined"
              >
                Continue "{latestPost.title}"
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
        <Tabs
          allowScrollButtonsMobile
          onChange={(_, value: OverviewTab) => setActiveTab(value)}
          scrollButtons="auto"
          sx={{
            '& .MuiTabs-flexContainer': {
              gap: 1,
            },
          }}
          value={activeTab}
          variant="scrollable"
        >
          <Tab label="Dashboard" value="dashboard" />
          <Tab label={`Errors (${analytics?.totalErrors ?? 0})`} value="errors" />
          <Tab label="Site profile" value="siteProfile" />
          <Tab label="Transcription" value="transcription" />
        </Tabs>
      </Paper>

      {activeTab === 'dashboard' ? (
        <AdminAnalyticsPanel analytics={analytics} isLoading={isLoadingAnalytics} />
      ) : null}

      {activeTab === 'errors' ? (
        <AdminErrorEventsPanel analytics={analytics} isLoading={isLoadingAnalytics} />
      ) : null}

      {activeTab === 'transcription' ? <TranscriptionSettingsPanel /> : null}

      {activeTab === 'siteProfile' ? (
        <Paper sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">Site profile</Typography>
              <Typography color="text.secondary" variant="body2">
                These fields power the public home and contact screens.
              </Typography>
            </Box>

            {profileError ? <Alert severity="warning">{profileError}</Alert> : null}
            {profileSuccess ? <Alert severity="success">{profileSuccess}</Alert> : null}

            {isLoadingMeta && !profileDraft ? (
              <Stack spacing={1.5}>
                <Skeleton height={52} />
                <Skeleton height={120} />
                <Skeleton height={52} />
              </Stack>
            ) : (
              <Stack spacing={2}>
                <TextField
                  label="Header title"
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? {
                            ...current,
                            siteTitle: event.target.value,
                          }
                        : current,
                    )
                  }
                  value={profileDraft?.siteTitle ?? ''}
                />
                <TextField
                  label="Header tagline"
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? {
                            ...current,
                            siteTagline: event.target.value,
                          }
                        : current,
                    )
                  }
                  value={profileDraft?.siteTagline ?? ''}
                />
                <TextField
                  label="Author name"
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? {
                            ...current,
                            authorName: event.target.value,
                          }
                        : current,
                    )
                  }
                  value={profileDraft?.authorName ?? ''}
                />
                <TextField
                  label="Author bio"
                  minRows={4}
                  multiline
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? {
                            ...current,
                            authorBio: event.target.value,
                          }
                        : current,
                    )
                  }
                  value={profileDraft?.authorBio ?? ''}
                />
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', md: '1fr' },
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="subtitle2">Contacts & links</Typography>
                        <Typography color="text.secondary" variant="caption">
                          Used on the public contact page. Order is preserved.
                        </Typography>
                      </Box>
                      <Button
                        onClick={() =>
                          setProfileDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  links: [
                                    ...current.links,
                                    { kind: 'link', label: '', url: '' } satisfies EditableProfileLink,
                                  ],
                                }
                              : current,
                          )
                        }
                        size="small"
                        startIcon={<AddRoundedIcon />}
                        variant="outlined"
                      >
                        Add link
                      </Button>
                    </Stack>

                    {profileDraft?.links?.length ? (
                      <Stack spacing={1}>
                        {profileDraft.links.map((link, index) => (
                          <Paper key={`${link.kind}-${index}`} sx={{ p: 1.75 }} variant="outlined">
                            <Stack spacing={1.25}>
                              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                                <TextField
                                  label="Type"
                                  onChange={(event) =>
                                    setProfileDraft((current) =>
                                      current
                                        ? {
                                            ...current,
                                            links: current.links.map((item, itemIndex) =>
                                              itemIndex === index
                                                ? { ...item, kind: event.target.value as EditableProfileLink['kind'] }
                                                : item,
                                            ),
                                          }
                                        : current,
                                    )
                                  }
                                  select
                                  sx={{ minWidth: 180 }}
                                  value={link.kind}
                                >
                                  <MenuItem value="email">Email</MenuItem>
                                  <MenuItem value="phone">Phone</MenuItem>
                                  <MenuItem value="telegram">Telegram</MenuItem>
                                  <MenuItem value="vk">VK</MenuItem>
                                  <MenuItem value="link">Link</MenuItem>
                                </TextField>
                                <TextField
                                  label="Label"
                                  onChange={(event) =>
                                    setProfileDraft((current) =>
                                      current
                                        ? {
                                            ...current,
                                            links: current.links.map((item, itemIndex) =>
                                              itemIndex === index ? { ...item, label: event.target.value } : item,
                                            ),
                                          }
                                        : current,
                                    )
                                  }
                                  value={link.label}
                                />
                              </Stack>

                              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                                <TextField
                                  helperText={
                                    link.kind === 'email'
                                      ? 'Email address'
                                      : link.kind === 'phone'
                                        ? 'Phone number'
                                        : link.kind === 'telegram'
                                          ? 'Username (@name) or URL'
                                          : link.kind === 'vk'
                                            ? 'Username (@name) or URL'
                                            : 'URL'
                                  }
                                  label="Value"
                                  onChange={(event) =>
                                    setProfileDraft((current) =>
                                      current
                                        ? {
                                            ...current,
                                            links: current.links.map((item, itemIndex) =>
                                              itemIndex === index ? { ...item, url: event.target.value } : item,
                                            ),
                                          }
                                        : current,
                                    )
                                  }
                                  value={link.url}
                                />
                                <IconButton
                                  aria-label="Remove link"
                                  onClick={() =>
                                    setProfileDraft((current) =>
                                      current
                                        ? {
                                            ...current,
                                            links: current.links.filter((_, itemIndex) => itemIndex !== index),
                                          }
                                        : current,
                                    )
                                  }
                                  sx={{ alignSelf: { md: 'center' } }}
                                >
                                  <DeleteOutlineRoundedIcon />
                                </IconButton>
                              </Stack>
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        Add at least one contact method to show it publicly.
                      </Typography>
                    )}
                  </Stack>
                </Box>

                <TextField
                  helperText="Optional CSS color. Leave empty to use the default theme background."
                  label="Background color"
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? {
                            ...current,
                            backgroundColor: event.target.value,
                          }
                        : current,
                    )
                  }
                  value={profileDraft?.backgroundColor ?? ''}
                />

                <Stack spacing={1}>
                  <input
                    accept="image/*"
                    hidden
                    onChange={(event) => void handleBackgroundSelection(event.target.files)}
                    ref={backgroundInputRef}
                    type="file"
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <Button
                      disabled={isSavingProfile || !profileDraft || isBackgroundUploading}
                      onClick={() => backgroundInputRef.current?.click()}
                      startIcon={
                        isBackgroundUploading ? (
                          <CircularProgress color="inherit" size={18} />
                        ) : (
                          <CloudUploadRoundedIcon />
                        )
                      }
                      variant="outlined"
                    >
                      {isBackgroundUploading ? 'Uploading background...' : 'Upload background image'}
                    </Button>
                    {profileDraft?.backgroundAssetId ? (
                      <Button
                        color="inherit"
                        disabled={isSavingProfile || isBackgroundUploading}
                        onClick={() =>
                          setProfileDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  backgroundAssetId: null,
                                  backgroundAsset: null,
                                }
                              : current,
                          )
                        }
                        startIcon={<DeleteOutlineRoundedIcon />}
                        variant="outlined"
                      >
                        Remove image
                      </Button>
                    ) : null}
                  </Stack>

                  {profileDraft?.backgroundAsset ? (
                    <Box
                      alt={profileDraft.backgroundAsset.originalName}
                      component="img"
                      src={profileDraft.backgroundAsset.url}
                      sx={{
                        aspectRatio: '16 / 9',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        display: 'block',
                        maxWidth: 560,
                        objectFit: 'cover',
                        width: '100%',
                      }}
                    />
                  ) : null}
                </Stack>
                <Button
                  disabled={isSavingProfile || !profileDraft}
                  onClick={() => void handleSaveProfile()}
                  startIcon={isSavingProfile ? <CircularProgress color="inherit" size={18} /> : <SaveRoundedIcon />}
                  sx={{ alignSelf: 'flex-start' }}
                  variant="contained"
                >
                  {isSavingProfile ? 'Saving...' : 'Save site profile'}
                </Button>
              </Stack>
            )}
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}

function EditorPane({ mode, onAuthExpired, onPostDeleted, onPostSaved, postId }: EditorPaneProps) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<PostDraft>(EMPTY_DRAFT);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [slugWasEdited, setSlugWasEdited] = useState(mode === 'edit');
  const [pendingImageEdit, setPendingImageEdit] = useState<PendingImageEdit | null>(null);
  const [autoOpenImageEditor, setAutoOpenImageEditor] = useState(() => {
    try {
      return window.localStorage.getItem(IMAGE_EDITOR_AUTOOPEN_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [activeTranscriptAssetId, setActiveTranscriptAssetId] = useState<string | null>(null);
  const [isNavigating, startNavigation] = useTransition();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const deferredBodyMarkdown = useDeferredValue(draft.bodyMarkdown);

  useEffect(() => {
    if (mode === 'create') {
      setDraft(EMPTY_DRAFT);
      setIsLoading(false);
      setLoadError(null);
      setSaveError(null);
      setSuccessMessage(null);
      setUploadState({ status: 'idle' });
      setSlugWasEdited(false);
    }
  }, [mode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(IMAGE_EDITOR_AUTOOPEN_STORAGE_KEY, String(autoOpenImageEditor));
    } catch {
      // ignore storage errors (private mode, disabled storage, etc.)
    }
  }, [autoOpenImageEditor]);

  useEffect(() => {
    if (mode !== 'edit' || !postId) {
      return;
    }

    const controller = new AbortController();

    setIsLoading(true);
    setLoadError(null);
    setSaveError(null);
    setSuccessMessage(null);

    getAdminPost(postId, controller.signal)
      .then((detail) => {
        if (controller.signal.aborted) {
          return;
        }

        setDraft(buildDraftFromDetail(detail));
        setSlugWasEdited(true);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }

        if (isUnauthorized(error)) {
          onAuthExpired();
          return;
        }

        setLoadError(
          isNotFound(error)
            ? 'This post no longer exists.'
            : getApiErrorMessage(error, 'Unable to load the post for editing.'),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [mode, onAuthExpired, postId]);

  const publishedPreviewUrl =
    draft.status === 'published' && draft.slug ? `/posts/${normalizeSlug(draft.slug)}` : null;
  const isUploadBusy = uploadState.status !== 'idle' && uploadState.status !== 'error';
  const uploadStateMessage =
    uploadState.status === 'presigning'
      ? `Preparing upload target for ${uploadState.fileName}...`
      : uploadState.status === 'uploading'
        ? `Uploading ${uploadState.fileName}...`
        : uploadState.status === 'completing'
          ? `Saving ${uploadState.fileName} in the backend...`
          : null;
  const totalMediaCount =
    draft.inlineAssets.length + draft.attachments.length + (draft.cover ? 1 : 0);

  const updateField = <T extends keyof PostDraft>(field: T, value: PostDraft[T]) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const deleteUploadedAssetIfNeeded = async (asset: PublicAsset, origin: DraftOrigin) => {
    if (origin !== 'session') {
      return;
    }

    try {
      await deleteAdminAsset(asset.id);
    } catch (error: unknown) {
      if (isUnauthorized(error)) {
        onAuthExpired();
      }
    }
  };

  const uploadCoverFile = async (file: File) => {
    const mimeType = resolveFileMimeType(file);
    let createdAssetId: string | null = null;

    try {
      setSaveError(null);
      setSuccessMessage(null);
      setUploadState({ status: 'presigning', fileName: file.name });

      const presigned = await presignAdminUpload({
        kind: 'image',
        mimeType,
        originalName: file.name,
        size: file.size,
      });
      createdAssetId = presigned.assetId;

      setUploadState({ status: 'uploading', fileName: file.name });
      await uploadAdminAssetContent({
        file,
        method: presigned.method,
        mimeType,
        requiredHeaders: presigned.requiredHeaders,
        uploadUrl: presigned.uploadUrl,
      });

      setUploadState({ status: 'completing', fileName: file.name });
      const dimensions = await readImageDimensions(file);
      const asset = await completeAdminUpload({
        assetId: presigned.assetId,
        height: dimensions?.height,
        width: dimensions?.width,
      });

      const previousCover = draft.cover;
      setDraft((current) => ({
        ...current,
        cover: {
          asset,
          origin: 'session',
        },
      }));

      if (previousCover) {
        void deleteUploadedAssetIfNeeded(previousCover.asset, previousCover.origin);
      }

      setUploadState({ status: 'idle' });
      setSuccessMessage(`Cover ${file.name} uploaded.`);
    } catch (error: unknown) {
      if (createdAssetId) {
        void deleteAdminAsset(createdAssetId).catch(() => undefined);
      }

      if (isUnauthorized(error)) {
        onAuthExpired();
        return;
      }

      setUploadState({
        fileName: file.name,
        message: getApiErrorMessage(error, 'Unable to upload the cover image.'),
        status: 'error',
      });
    } finally {
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
    }
  };

  const uploadFiles = async (files: File[], target: 'inline' | 'attachment') => {
    if (files.length === 0) {
      return;
    }

    setSaveError(null);
    setSuccessMessage(null);

    for (const file of files) {
      const mimeType = resolveFileMimeType(file);
      let createdAssetId: string | null = null;

      try {
        const kind = getAttachmentKindFromMimeType(mimeType);
        setUploadState({ status: 'presigning', fileName: file.name });

        const presigned = await presignAdminUpload({
          kind,
          mimeType,
          originalName: file.name,
          size: file.size,
        });
        createdAssetId = presigned.assetId;

        setUploadState({ status: 'uploading', fileName: file.name });
        await uploadAdminAssetContent({
          file,
          method: presigned.method,
          mimeType,
          requiredHeaders: presigned.requiredHeaders,
          uploadUrl: presigned.uploadUrl,
        });

        setUploadState({ status: 'completing', fileName: file.name });
        const dimensions = await readImageDimensions(file);
        const asset = await completeAdminUpload({
          assetId: presigned.assetId,
          height: dimensions?.height,
          width: dimensions?.width,
        });

        if (target === 'inline') {
          setDraft((current) => ({
            ...current,
            bodyMarkdown: appendMarkdownSnippet(current.bodyMarkdown, buildInlineMediaSnippet(asset)),
            inlineAssets: [...current.inlineAssets, { asset, origin: 'session' }],
          }));
          setSuccessMessage(`Inline media ${file.name} added to the article body.`);
        } else {
          setDraft((current) => ({
            ...current,
            attachments: [
              ...current.attachments,
              {
                asset,
                kind,
                origin: 'session',
                title: stripFileExtension(file.name),
              },
            ],
          }));
          setSuccessMessage(`${getAttachmentKindLabel(kind)} ${file.name} uploaded.`);
        }

        setUploadState({ status: 'idle' });
      } catch (error: unknown) {
        if (createdAssetId) {
          void deleteAdminAsset(createdAssetId).catch(() => undefined);
        }

        if (isUnauthorized(error)) {
          onAuthExpired();
          return;
        }

        setUploadState({
          fileName: file.name,
          message: getApiErrorMessage(
            error,
            target === 'inline'
              ? 'Unable to upload inline media.'
              : 'Unable to upload the attachment.',
          ),
          status: 'error',
        });
        break;
      }
    }
  };

  const openImageEditorIfNeeded = (
    files: File[],
    target: 'cover' | 'inline' | 'attachment',
  ) => {
    if (!autoOpenImageEditor) {
      return false;
    }

    if (
      files.length === 1 &&
      getAttachmentKindFromMimeType(resolveFileMimeType(files[0])) === 'image'
    ) {
      setPendingImageEdit({
        file: files[0],
        target,
      });
      return true;
    }

    return false;
  };

  const handleCoverFileSelection = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) {
      return;
    }

    if (!openImageEditorIfNeeded([file], 'cover')) {
      await uploadCoverFile(file);
    }
  };

  const handleInlineAssetSelection = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) {
      return;
    }

    if (!openImageEditorIfNeeded(files, 'inline')) {
      await uploadFiles(files, 'inline');
    }

    if (inlineInputRef.current) {
      inlineInputRef.current.value = '';
    }
  };

  const handleAttachmentSelection = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) {
      return;
    }

    if (!openImageEditorIfNeeded(files, 'attachment')) {
      await uploadFiles(files, 'attachment');
    }

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  const handleVoiceRecordingReady = async (file: File) => {
    await uploadFiles([file], 'attachment');
  };

  const handleImageEditorSave = async (file: File) => {
    const nextTarget = pendingImageEdit?.target;
    if (!nextTarget) {
      return;
    }

    if (nextTarget === 'cover') {
      await uploadCoverFile(file);
    } else {
      await uploadFiles([file], nextTarget);
    }

    setPendingImageEdit(null);
  };

  const handleInsertInlineAsset = (asset: PublicAsset) => {
    setSaveError(null);
    setSuccessMessage(`Markdown snippet for ${asset.originalName} added.`);
    setDraft((current) => ({
      ...current,
      bodyMarkdown: appendMarkdownSnippet(current.bodyMarkdown, buildInlineMediaSnippet(asset)),
    }));
  };

  const handleRemoveInlineAsset = async (assetId: string) => {
    const inlineAsset = draft.inlineAssets.find((item) => item.asset.id === assetId);
    if (!inlineAsset) {
      return;
    }

    if (draft.bodyMarkdown.includes(inlineAsset.asset.url)) {
      setSaveError('Remove the inline media link from Markdown first, then detach the asset from the post.');
      return;
    }

    setSaveError(null);
    setDraft((current) => ({
      ...current,
      inlineAssets: current.inlineAssets.filter((item) => item.asset.id !== assetId),
    }));

    await deleteUploadedAssetIfNeeded(inlineAsset.asset, inlineAsset.origin);
  };

  const handleRemoveAttachment = async (assetId: string) => {
    const attachment = draft.attachments.find((item) => item.asset.id === assetId);
    if (!attachment) {
      return;
    }

    setDraft((current) => ({
      ...current,
      attachments: current.attachments.filter((item) => item.asset.id !== assetId),
    }));

    await deleteUploadedAssetIfNeeded(attachment.asset, attachment.origin);
  };

  const handleRemoveCover = async () => {
    const currentCover = draft.cover;
    if (!currentCover) {
      return;
    }

    setDraft((current) => ({
      ...current,
      cover: null,
    }));

    await deleteUploadedAssetIfNeeded(currentCover.asset, currentCover.origin);
  };

  const handleTranscribe = async (assetId: string) => {
    setActiveTranscriptAssetId(assetId);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      const nextAsset = await transcribeAdminAsset(assetId);
      setDraft((current) => ({
        ...current,
        attachments: current.attachments.map((attachment) =>
          attachment.asset.id === assetId
            ? {
                ...attachment,
                asset: nextAsset,
              }
            : attachment,
        ),
      }));
      setSuccessMessage(`Transcript updated for ${nextAsset.originalName}.`);
    } catch (error: unknown) {
      if (isUnauthorized(error)) {
        onAuthExpired();
        return;
      }

      setSaveError(getApiErrorMessage(error, 'Unable to transcribe this asset.'));
    } finally {
      setActiveTranscriptAssetId(null);
    }
  };

  const handleSave = async () => {
    const payload = buildPostPayload(draft);

    if (!payload.title) {
      setSaveError('Title is required.');
      return;
    }

    if (!payload.slug) {
      setSaveError('Slug is required for the public URL.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      const detail =
        mode === 'create'
          ? await createAdminPost(payload)
          : await updateAdminPost(postId ?? '', payload);

      setDraft(buildDraftFromDetail(detail));
      setSlugWasEdited(true);
      setSuccessMessage(mode === 'create' ? 'Post created.' : 'Changes saved.');
      onPostSaved();

      if (mode === 'create') {
        startNavigation(() => {
          navigate(getAdminEditPostPath(detail.id), { replace: true });
        });
      }
    } catch (error: unknown) {
      if (isUnauthorized(error)) {
        onAuthExpired();
        return;
      }

      setSaveError(getApiErrorMessage(error, 'Unable to save the post. Check the fields and try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async () => {
    if (mode !== 'edit' || !postId) {
      return;
    }

    if (!window.confirm('Delete this post? The article will be removed, but uploaded assets will remain in storage until reused or deleted separately.')) {
      return;
    }

    setIsDeleting(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      await deleteAdminPost(postId);
      onPostDeleted();
      navigate(getAdminOverviewPath());
    } catch (error: unknown) {
      if (isUnauthorized(error)) {
        onAuthExpired();
        return;
      }

      setSaveError(getApiErrorMessage(error, 'Unable to delete this post.'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          <Skeleton height={36} width="36%" />
          <Skeleton height={54} />
          <Skeleton height={54} />
          <Skeleton height={240} />
        </Stack>
      </Paper>
    );
  }

  if (loadError) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="warning">{loadError}</Alert>
      </Paper>
    );
  }

  return (
    <>
      <Paper sx={{ overflow: 'hidden', p: { xs: 2.5, md: 4 } }}>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ alignItems: { md: 'flex-start' }, justifyContent: 'space-between' }}
          >
            <Stack spacing={1.1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  color="primary"
                  label={mode === 'create' ? getAdminCreatePostPath() : getAdminEditPostPath(postId ?? '...')}
                  sx={{ alignSelf: 'flex-start' }}
                />
                <StatusChip status={draft.status} />
                <Chip label={`Media ${totalMediaCount}`} variant="outlined" />
              </Stack>
              <Typography sx={{ fontSize: { xs: '1.75rem', md: '2.35rem' }, fontWeight: 700 }}>
                {mode === 'create' ? 'Create post' : 'Edit post'}
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 820 }}>
                Markdown editing now goes through a richer toolbar, media uses the same upload flow for audio, video and files, and preview is rendered from a deferred state to stay responsive.
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              {publishedPreviewUrl ? (
                <Button
                  component={RouterLink}
                  endIcon={<LaunchRoundedIcon />}
                  target="_blank"
                  to={publishedPreviewUrl}
                  variant="outlined"
                >
                  Open public post
                </Button>
              ) : null}
              {mode === 'edit' ? (
                <Button
                  color="error"
                  disabled={isDeleting}
                  onClick={() => void handleDeletePost()}
                  startIcon={isDeleting ? <CircularProgress color="inherit" size={18} /> : <DeleteOutlineRoundedIcon />}
                  variant="outlined"
                >
                  {isDeleting ? 'Deleting...' : 'Delete post'}
                </Button>
              ) : null}
              <Button
                disabled={isSaving || isNavigating}
                onClick={() => void handleSave()}
                startIcon={isSaving ? <CircularProgress color="inherit" size={18} /> : <SaveRoundedIcon />}
                variant="contained"
              >
                {isSaving ? 'Saving...' : mode === 'create' ? 'Create post' : 'Save changes'}
              </Button>
            </Stack>
          </Stack>

          {saveError ? <Alert severity="warning">{saveError}</Alert> : null}
          {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
          {uploadState.status === 'error' ? <Alert severity="warning">{uploadState.message}</Alert> : null}

          <Box sx={editorSectionSx}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h6">Compose</Typography>
                <Typography color="text.secondary" variant="body2">
                  Title, slug, status and Markdown stay in one flow. Inline media snippets are still inserted automatically after uploads.
                </Typography>
              </Box>

              <TextField
                label="Title"
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    slug: slugWasEdited ? current.slug : normalizeSlug(nextTitle),
                    title: nextTitle,
                  }));
                }}
                sx={{
                  ...editorFieldSx,
                  '& .MuiInputBase-input': {
                    fontSize: { xs: '1.3rem', md: '1.6rem' },
                    fontWeight: 700,
                    lineHeight: 1.3,
                  },
                }}
                value={draft.title}
              />

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.4fr) 220px' },
                }}
              >
                <TextField
                  helperText="Used in the public URL `/posts/:slug`."
                  label="Slug"
                  onChange={(event) => {
                    setSlugWasEdited(true);
                    updateField('slug', event.target.value);
                  }}
                  sx={editorFieldSx}
                  value={draft.slug}
                />

                <TextField
                  label="Status"
                  onChange={(event) => updateField('status', event.target.value as PostStatus)}
                  select
                  sx={editorFieldSx}
                  value={draft.status}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                </TextField>
              </Box>

              <TextField
                label="Excerpt"
                minRows={3}
                multiline
                onChange={(event) => updateField('excerpt', event.target.value)}
                sx={editorFieldSx}
                value={draft.excerpt}
              />

              <MarkdownEditor
                minHeight={360}
                onChange={(value) => updateField('bodyMarkdown', value)}
                placeholder="Write the article body here. Inline uploads will append Markdown snippets automatically."
                value={draft.bodyMarkdown}
              />
            </Stack>
          </Box>

          <Box sx={editorSectionSx}>
            <Stack spacing={2.5}>
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                spacing={1.5}
                sx={{ alignItems: { lg: 'center' }, justifyContent: 'space-between' }}
              >
                <Box>
                  <Typography variant="h6">Media Dock</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Cover, inline media, attachments, voice notes and transcription live in one compact area.
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                  <Button onClick={() => coverInputRef.current?.click()} startIcon={<CloudUploadRoundedIcon />} variant="outlined">
                    Cover
                  </Button>
                  <Button onClick={() => inlineInputRef.current?.click()} startIcon={<CloudUploadRoundedIcon />} variant="outlined">
                    Inline media
                  </Button>
                  <Button
                    onClick={() => attachmentInputRef.current?.click()}
                    startIcon={<CloudUploadRoundedIcon />}
                    variant="outlined"
                  >
                    Attachment
                  </Button>
                </Stack>
              </Stack>

              <input
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(event) => {
                  void handleCoverFileSelection(event.target.files);
                }}
                ref={coverInputRef}
                type="file"
              />
              <input
                accept={FILE_UPLOAD_ACCEPT}
                hidden
                multiple
                onChange={(event) => {
                  void handleInlineAssetSelection(event.target.files);
                }}
                ref={inlineInputRef}
                type="file"
              />
              <input
                accept={FILE_UPLOAD_ACCEPT}
                hidden
                multiple
                onChange={(event) => {
                  void handleAttachmentSelection(event.target.files);
                }}
                ref={attachmentInputRef}
                type="file"
              />

              {uploadStateMessage ? <Alert severity="info">{uploadStateMessage}</Alert> : null}
              <Stack spacing={1.25}>
                <Alert severity="info">
                  Image editor is optional. Enable it if you want to resize and draw on single images before upload.
                </Alert>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoOpenImageEditor}
                      onChange={(event) => setAutoOpenImageEditor(event.target.checked)}
                    />
                  }
                  label={autoOpenImageEditor ? 'Open editor for single images' : 'Upload images without editor (default)'}
                />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  color={draft.cover ? 'primary' : 'default'}
                  icon={<ImageRoundedIcon />}
                  label={draft.cover ? 'Cover ready' : 'No cover yet'}
                  variant="outlined"
                />
                <Chip label={`Inline ${draft.inlineAssets.length}`} variant="outlined" />
                <Chip label={`Attachments ${draft.attachments.length}`} variant="outlined" />
              </Stack>

              <Box sx={editorCardSx}>
                <Stack spacing={1.5}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.5}
                    sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>Cover image</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Used on the public post card and post page header.
                      </Typography>
                    </Box>

                    {draft.cover ? (
                      <Button color="inherit" onClick={() => void handleRemoveCover()} startIcon={<DeleteOutlineRoundedIcon />} variant="text">
                        Remove cover
                      </Button>
                    ) : null}
                  </Stack>

                  {draft.cover ? (
                    <Box sx={{ overflow: 'hidden' }}>
                      <Box
                        alt={draft.cover.asset.originalName}
                        component="img"
                        src={draft.cover.asset.url}
                        sx={{
                          aspectRatio: '16 / 9',
                          borderRadius: 1,
                          display: 'block',
                          objectFit: 'cover',
                          width: '100%',
                        }}
                      />
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, pt: 1.5 }}>
                        <Chip icon={<ImageRoundedIcon />} label={draft.cover.asset.originalName} variant="outlined" />
                        <Typography color="text.secondary" variant="body2">
                          {draft.cover.asset.width && draft.cover.asset.height
                            ? `${draft.cover.asset.width} × ${draft.cover.asset.height}`
                            : 'Dimensions will appear after upload completes.'}
                        </Typography>
                      </Stack>
                    </Box>
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      No cover selected yet.
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Box sx={editorCardSx}>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>Inline media</Typography>
                    <Typography color="text.secondary" variant="body2">
                      Re-insert uploaded media into Markdown without re-uploading.
                    </Typography>
                  </Box>

                  {draft.inlineAssets.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">
                      No inline assets yet.
                    </Typography>
                  ) : (
                    <Stack spacing={1.25}>
                      {draft.inlineAssets.map((inlineAsset) => (
                        <Box key={inlineAsset.asset.id} sx={editorCardSx}>
                          <Stack spacing={1.25}>
                            <Stack
                              direction={{ xs: 'column', md: 'row' }}
                              spacing={1.25}
                              sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
                            >
                              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                <Chip
                                  icon={getAttachmentIcon(getAssetKind(inlineAsset.asset))}
                                  label={getAttachmentKindLabel(getAssetKind(inlineAsset.asset))}
                                  variant="outlined"
                                />
                                <Typography sx={{ fontWeight: 600 }}>{inlineAsset.asset.originalName}</Typography>
                              </Stack>

                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                                <Button onClick={() => handleInsertInlineAsset(inlineAsset.asset)} startIcon={<LaunchRoundedIcon />} variant="text">
                                  Insert again
                                </Button>
                                <Button
                                  color="inherit"
                                  onClick={() => void handleRemoveInlineAsset(inlineAsset.asset.id)}
                                  startIcon={<DeleteOutlineRoundedIcon />}
                                  variant="text"
                                >
                                  Detach
                                </Button>
                              </Stack>
                            </Stack>

                            <Typography
                              color="text.secondary"
                              sx={{ fontFamily: '"JetBrains Mono", monospace', wordBreak: 'break-all' }}
                              variant="body2"
                            >
                              {buildInlineMediaSnippet(inlineAsset.asset)}
                            </Typography>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Box>

              <Box sx={editorCardSx}>
                <Stack spacing={1.75}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>Attachments</Typography>
                    <Typography color="text.secondary" variant="body2">
                      Images, files, audio and video all go through the same upload path. Audio and video can be transcribed on demand.
                    </Typography>
                  </Box>

                  <Box sx={editorCardSx}>
                    <VoiceRecorderPanel
                      disabled={isSaving || isNavigating || isUploadBusy}
                      onRecordingReady={handleVoiceRecordingReady}
                    />
                  </Box>

                  {draft.attachments.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">
                      No attachments yet.
                    </Typography>
                  ) : (
                    <Stack spacing={1.25}>
                      {draft.attachments.map((attachment) => {
                        const canTranscribe =
                          attachment.kind === 'audio' || attachment.kind === 'video';

                        return (
                          <Box key={attachment.asset.id} sx={editorCardSx}>
                            <Stack spacing={1.5}>
                              <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                spacing={1.25}
                                sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
                              >
                                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                  <Chip
                                    icon={getAttachmentIcon(attachment.kind)}
                                    label={getAttachmentKindLabel(attachment.kind)}
                                    variant="outlined"
                                  />
                                  <Typography sx={{ fontWeight: 600 }}>{attachment.asset.originalName}</Typography>
                                  {canTranscribe ? (
                                    <Chip
                                      color={attachment.asset.transcriptStatus === 'ready' ? 'primary' : 'default'}
                                      label={getTranscriptLabel(attachment.asset.transcriptStatus)}
                                      size="small"
                                      variant="outlined"
                                    />
                                  ) : null}
                                </Stack>

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                                  {canTranscribe ? (
                                    <Button
                                      disabled={
                                        activeTranscriptAssetId === attachment.asset.id ||
                                        attachment.asset.transcriptStatus === 'processing'
                                      }
                                      onClick={() => void handleTranscribe(attachment.asset.id)}
                                      startIcon={
                                        activeTranscriptAssetId === attachment.asset.id ? (
                                          <CircularProgress color="inherit" size={18} />
                                        ) : (
                                          <TranscribeRoundedIcon />
                                        )
                                      }
                                      variant="outlined"
                                    >
                                      {attachment.asset.transcriptStatus === 'ready'
                                        ? 'Refresh transcript'
                                        : 'Transcribe'}
                                    </Button>
                                  ) : null}

                                  <Tooltip title="Скачать">
                                    <IconButton
                                      aria-label="Скачать"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        triggerBrowserDownload(attachment.asset.url, attachment.asset.originalName);
                                      }}
                                      size="small"
                                    >
                                      <DownloadRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>

                                  <Button
                                    color="inherit"
                                    onClick={() => void handleRemoveAttachment(attachment.asset.id)}
                                    startIcon={<DeleteOutlineRoundedIcon />}
                                    variant="text"
                                  >
                                    Remove
                                  </Button>
                                </Stack>
                              </Stack>

                              <TextField
                                label="Attachment title"
                                onChange={(event) => {
                                  const nextTitle = event.target.value;
                                  setDraft((current) => ({
                                    ...current,
                                    attachments: current.attachments.map((item) =>
                                      item.asset.id === attachment.asset.id
                                        ? { ...item, title: nextTitle }
                                        : item,
                                    ),
                                  }));
                                }}
                                sx={editorFieldSx}
                                value={attachment.title}
                              />

                              {attachment.kind === 'image' ? (
                                <LightboxImage
                                  alt={attachment.asset.originalName}
                                  src={attachment.asset.url}
                                  sx={{
                                    maxHeight: 260,
                                    objectFit: 'cover',
                                    width: '100%',
                                  }}
                                />
                              ) : attachment.kind === 'audio' || attachment.kind === 'video' ? (
                                <MediaPlayer asset={attachment.asset} kind={attachment.kind} />
                              ) : (
                                <Typography color="text.secondary" variant="body2">
                                  {attachment.asset.mimeType} • {Math.round(attachment.asset.size / 1024)} KB
                                </Typography>
                              )}

                              {attachment.asset.transcriptStatus === 'failed' && attachment.asset.transcriptError ? (
                                <Alert severity="warning">{attachment.asset.transcriptError}</Alert>
                              ) : null}
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Box sx={editorSectionSx}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h6">Live Preview</Typography>
                <Typography color="text.secondary" variant="body2">
                  The preview uses the same public renderer as the post page, but updates from a deferred Markdown value so typing stays lighter.
                </Typography>
              </Box>

              <Box
                sx={{
                  ...editorCardSx,
                  p: { xs: 2.25, md: 3 },
                }}
              >
                <Stack spacing={2.5}>
                  {draft.cover ? (
                    <Box
                      alt={draft.cover.asset.originalName}
                      component="img"
                      src={draft.cover.asset.url}
                      sx={{
                        aspectRatio: '16 / 9',
                        borderRadius: 1,
                        display: 'block',
                        objectFit: 'cover',
                        width: '100%',
                      }}
                    />
                  ) : null}

                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <StatusChip status={draft.status} />
                      <Chip label={`Inline ${draft.inlineAssets.length}`} variant="outlined" />
                      <Chip label={`Attachments ${draft.attachments.length}`} variant="outlined" />
                    </Stack>
                    <Typography sx={{ fontSize: { xs: '1.9rem', md: '2.4rem' }, fontWeight: 700, lineHeight: 1.1 }}>
                      {draft.title || 'Future article title'}
                    </Typography>
                    {draft.excerpt ? (
                      <Typography color="text.secondary" sx={{ fontSize: '1.02rem', lineHeight: 1.75 }}>
                        {draft.excerpt}
                      </Typography>
                    ) : null}
                  </Stack>

                  <Divider />

                  {deferredBodyMarkdown.trim() ? (
                    <MarkdownRenderer content={deferredBodyMarkdown} />
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      Preview appears as soon as the editor contains text.
                    </Typography>
                  )}

                  {draft.attachments.length > 0 ? (
                    <>
                      <Divider />
                      <Stack spacing={1.25}>
                        <Typography variant="subtitle1">Attachments</Typography>
                        {draft.attachments.map((attachment) => (
                          <Box key={attachment.asset.id} sx={editorCardSx}>
                            <Stack spacing={1.25}>
                              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                                {getAttachmentIcon(attachment.kind)}
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography sx={{ fontWeight: 600 }}>
                                    {attachment.title || attachment.asset.originalName}
                                  </Typography>
                                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                                    <Link
                                      href={attachment.asset.url}
                                      rel="noreferrer"
                                      sx={{ display: 'inline-flex', gap: 0.5, minWidth: 0 }}
                                      target="_blank"
                                      underline="hover"
                                    >
                                      <span>{attachment.asset.originalName}</span>
                                    </Link>
                                    <Tooltip title="Скачать">
                                      <IconButton
                                        aria-label="Скачать"
                                        onClick={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          triggerBrowserDownload(attachment.asset.url, attachment.asset.originalName);
                                        }}
                                        size="small"
                                      >
                                        <DownloadRoundedIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                </Box>
                              </Stack>

                              {attachment.kind === 'audio' || attachment.kind === 'video' ? (
                                <MediaPlayer asset={attachment.asset} kind={attachment.kind} />
                              ) : null}
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    </>
                  ) : null}
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <ImageEditorDialog
        file={pendingImageEdit?.file ?? null}
        onClose={() => setPendingImageEdit(null)}
        onSave={handleImageEditorSave}
        open={!!pendingImageEdit}
      />
    </>
  );
}

export function AdminWorkspace({ mode, postId }: AdminWorkspaceProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, logout, refreshSession, session } = useAuth();
  const { setSiteProfile: setGlobalSiteProfile } = useSiteProfile();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [posts, setPosts] = useState<AdminPostSummary[]>([]);
  const [siteProfile, setSiteProfile] = useState<SiteProfile | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [isRefreshingPosts, setIsRefreshingPosts] = useState(false);
  const [isRefreshingMeta, setIsRefreshingMeta] = useState(false);
  const [isRefreshingAnalytics, setIsRefreshingAnalytics] = useState(false);
  const [filter, setFilter] = useState<AdminPostStatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const deferredSearchInput = useDeferredValue(searchInput);

  const activePostId = mode === 'edit' ? postId : undefined;
  const sortedPosts = useMemo(
    () =>
      [...posts].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      ),
    [posts],
  );

  const handleAuthExpired = () => {
    void refreshSession().finally(() => {
      navigate(getAdminLoginPath());
    });
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setPosts([]);
      setPostsError(null);
      return;
    }

    const controller = new AbortController();

    setIsRefreshingPosts(true);
    setPostsError(null);

    getAdminPosts({
      query: deferredSearchInput,
      signal: controller.signal,
      status: filter,
    })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setPosts(response.items);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }

        if (isUnauthorized(error)) {
          handleAuthExpired();
          return;
        }

        setPostsError(getApiErrorMessage(error, 'Unable to load posts for the author workspace.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsRefreshingPosts(false);
        }
      });

    return () => controller.abort();
  }, [deferredSearchInput, filter, isAuthenticated, refreshKey]);

  useEffect(() => {
    if (!isAuthenticated || mode !== 'overview') {
      setMetaError(null);
      if (mode !== 'overview') {
        return;
      }
      setSiteProfile(null);
      return;
    }

    const controller = new AbortController();

    setIsRefreshingMeta(true);
    setMetaError(null);

    getAdminSiteProfile(controller.signal)
      .then((nextSiteProfile) => {
        if (controller.signal.aborted) {
          return;
        }

        setSiteProfile(nextSiteProfile);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }

        if (isUnauthorized(error)) {
          handleAuthExpired();
          return;
        }

        setMetaError(getApiErrorMessage(error, 'Unable to load site profile data.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsRefreshingMeta(false);
        }
      });

    return () => controller.abort();
  }, [isAuthenticated, mode, refreshKey]);

  useEffect(() => {
    if (!isAuthenticated || mode !== 'overview') {
      if (mode === 'overview') {
        setAnalytics(null);
      }
      return;
    }

    const controller = new AbortController();

    setIsRefreshingAnalytics(true);

    getAdminAnalytics(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setAnalytics(response);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }

        if (isUnauthorized(error)) {
          handleAuthExpired();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsRefreshingAnalytics(false);
        }
      });

    return () => controller.abort();
  }, [isAuthenticated, mode, refreshKey]);

  const handleLogout = async () => {
    await logout();
    navigate(getAdminLoginPath());
  };

  const handleSaveSiteProfile = async (payload: UpdateSiteProfileRequest) => {
    const nextProfile = await updateAdminSiteProfile(payload);
    setSiteProfile(nextProfile);
    setGlobalSiteProfile(nextProfile);
    return nextProfile;
  };

  return (
    <SiteShell>
      <Box component="main" sx={{ pb: 10, pt: { xs: 3, md: 5 } }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Paper sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={1.5}>
                <Chip
                  color="primary"
                  label={
                    mode === 'overview'
                      ? getAdminOverviewPath()
                      : mode === 'create'
                        ? getAdminCreatePostPath()
                        : getAdminEditPostPath(':postId')
                  }
                  sx={{ alignSelf: 'flex-start' }}
                />
                <Typography sx={{ fontSize: { xs: '2rem', md: '2.9rem' }, fontWeight: 700 }}>
                  Author interface
                </Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 900 }}>
                  Отдельная авторская зона на admin-host для публикаций, загрузок, настроек сайта и внутренней аналитики.
                </Typography>
                {session ? (
                  <Typography color="text.secondary" variant="body2">
                    Signed in as {session.adminDisplayName}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>

            {isLoading ? <SessionSkeleton /> : null}

            {!isLoading && !isAuthenticated ? (
              <AccessPanel
                actionHref={getAdminLoginPath()}
                actionLabel="Open admin login"
                description="Эта зона доступна только через отдельный admin-only вход."
                title="Sign in required"
              />
            ) : null}

            {!isLoading && isAuthenticated ? (
              <>
                {postsError ? <Alert severity="warning">{postsError}</Alert> : null}
                {metaError && mode === 'overview' ? <Alert severity="warning">{metaError}</Alert> : null}

                <Box
                  sx={{
                    display: 'grid',
                    gap: 2.5,
                    gridTemplateColumns: { xs: '1fr', xl: '320px minmax(0, 1fr)' },
                  }}
                >
                  <PostsSidebar
                    activePostId={activePostId}
                    filter={filter}
                    isRefreshing={isRefreshingPosts}
                    onCreatePost={() => navigate(getAdminCreatePostPath())}
                    onFilterChange={setFilter}
                    onLogout={() => void handleLogout()}
                    onRefresh={() => setRefreshKey((current) => current + 1)}
                    onSearchChange={setSearchInput}
                    posts={sortedPosts}
                    searchValue={searchInput}
                  />

                  {mode === 'overview' ? (
                    <OverviewPane
                      analytics={analytics}
                      isLoadingAnalytics={isRefreshingAnalytics}
                      isLoadingMeta={isRefreshingMeta}
                      onCreatePost={() => navigate(getAdminCreatePostPath())}
                      onSaveSiteProfile={handleSaveSiteProfile}
                      posts={sortedPosts}
                      siteProfile={siteProfile}
                    />
                  ) : (
                    <EditorPane
                      mode={mode}
                      onAuthExpired={handleAuthExpired}
                      onPostDeleted={() => setRefreshKey((current) => current + 1)}
                      onPostSaved={() => setRefreshKey((current) => current + 1)}
                      postId={postId}
                    />
                  )}
                </Box>
              </>
            ) : null}
          </Stack>
        </Container>
      </Box>
    </SiteShell>
  );
}
