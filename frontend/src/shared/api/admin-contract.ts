import type {
  AttachmentKind,
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
};

export type TranscriptionSettings = {
  groqConfigured: boolean;
  groqApiBase: string;
  groqSpeechModel: string;
};

export type TelegramSettings = {
  botConfigured: boolean;
  adminChatId: string | null;
  messageTemplate: string;
};
