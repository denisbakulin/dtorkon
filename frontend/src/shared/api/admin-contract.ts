import type {
  AttachmentKind,
  ProjectScreenshot,
  ProjectStatus,
  PostStatus,
  PublicAsset,
  PublicAttachment,
  SiteProfile,
  SiteProfileLink,
} from './blog-contract';

export type { SiteProfile };

export type UpdateSiteProfileRequest = Partial<Omit<SiteProfile, 'links'>> & {
  links?: Array<Omit<SiteProfileLink, 'id' | 'sortOrder'>>;
};

export type AdminSession = {
  adminDisplayName: string;
  expiresAt: string;
};

export type AdminAsset = PublicAsset;
export type AdminAttachment = PublicAttachment;

export type AdminPostSummary = {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  updatedAt: string;
  publishedAt: string | null;
};

export type AdminPostListResponse = {
  items: AdminPostSummary[];
};

export type AdminPostDetail = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  status: PostStatus;
  coverAssetId: string | null;
  coverAsset: AdminAsset | null;
  inlineAssets: AdminAsset[];
  attachments: AdminAttachment[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type AdminAttachmentInput = {
  assetId: string;
  kind: AttachmentKind;
  title: string;
  sortOrder: number;
};

export type CreateAdminPostRequest = {
  title: string;
  slug: string;
  excerpt: string;
  bodyMarkdown: string;
  status: PostStatus;
  coverAssetId: string | null;
  inlineAssetIds: string[];
  attachments: AdminAttachmentInput[];
};

export type UpdateAdminPostRequest = Partial<CreateAdminPostRequest>;

export type AdminPostStatusFilter = PostStatus | 'all';

export type AdminProjectSummary = {
  id: string;
  slug: string;
  title: string;
  status: ProjectStatus;
  githubUrl: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type AdminProjectListResponse = {
  items: AdminProjectSummary[];
};

export type AdminProjectDetail = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  readmeExcerpt: string;
  githubUrl: string;
  status: ProjectStatus;
  coverAssetId: string | null;
  coverAsset: AdminAsset | null;
  screenshots: ProjectScreenshot[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type AdminProjectScreenshotInput = {
  assetId: string;
  title: string;
  sortOrder: number;
};

export type CreateAdminProjectRequest = {
  title: string;
  slug: string;
  summary: string;
  description: string;
  readmeExcerpt: string;
  githubUrl: string;
  status: ProjectStatus;
  coverAssetId: string | null;
  screenshots: AdminProjectScreenshotInput[];
};

export type UpdateAdminProjectRequest = Partial<CreateAdminProjectRequest>;

export type AdminProjectStatusFilter = ProjectStatus | 'all';

export type PresignUploadRequest = {
  originalName: string;
  mimeType: string;
  size: number;
  kind: AttachmentKind;
};

export type PresignUploadResponse = {
  assetId: string;
  objectKey: string;
  uploadUrl: string;
  publicUrl: string;
  method: string;
  requiredHeaders: Record<string, string>;
  expiresAt: string;
};

export type CompleteUploadRequest = {
  assetId: string;
  width?: number;
  height?: number;
};

export type AnalyticsTimelinePoint = {
  label: string;
  posts: number;
  uploads: number;
};

export type AnalyticsBreakdownItem = {
  label: string;
  value: number;
};

export type StorageTrafficPoint = {
  label: string;
  incomingBytes: number;
  outgoingBytes: number;
  requests: number;
  readRequests: number;
  writeRequests: number;
};

export type StorageMethodBreakdownItem = {
  method: string;
  requests: number;
  incomingBytes: number;
  outgoingBytes: number;
};

export type StorageTopObject = {
  objectKey: string;
  displayName: string;
  requests: number;
  outgoingBytes: number;
  incomingBytes: number;
  lastRequestedAt: string | null;
};

export type StorageAnalytics = {
  enabled: boolean;
  metricsConfigured: boolean;
  logsConfigured: boolean;
  bucketName: string | null;
  logBucketName: string | null;
  message: string | null;
  usedSizeBytes: number | null;
  objectCount: number | null;
  publicReadEnabled: boolean | null;
  publicListEnabled: boolean | null;
  totalIncomingBytes: number;
  totalOutgoingBytes: number;
  totalRequests: number;
  readRequests: number;
  writeRequests: number;
  lastLogAt: string | null;
  trafficTimeline: StorageTrafficPoint[];
  methodBreakdown: StorageMethodBreakdownItem[];
  topObjects: StorageTopObject[];
};

export type AdminErrorEvent = {
  id: string;
  source: 'backend';
  level: 'warning' | 'error';
  code: string;
  message: string;
  statusCode: number | null;
  requestMethod: string | null;
  requestPath: string | null;
  pageUrl: string | null;
  detailsJson: string | null;
  stackTrace: string | null;
  createdAt: string;
};

export type AdminAnalytics = {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalAssets: number;
  readyAssets: number;
  totalWords: number;
  totalAttachments: number;
  transcriptReady: number;
  transcriptProcessing: number;
  transcriptFailed: number;
  publicationActivity: AnalyticsTimelinePoint[];
  uploadActivity: AnalyticsTimelinePoint[];
  assetBreakdown: AnalyticsBreakdownItem[];
  totalErrors: number;
  lastErrorAt: string | null;
  recentErrors: AdminErrorEvent[];
  storageAnalytics: StorageAnalytics;
};

export type TranscriptionSettings = {
  groqConfigured: boolean;
  groqApiBase: string;
  groqSpeechModel: string;
};

export type AdminCredentialsSettings = {
  adminUsername: string;
  usernameOverridden: boolean;
  passwordOverridden: boolean;
};

export type TelegramSettings = {
  botConfigured: boolean;
  adminChatId: string | null;
  messageTemplate: string;
};
