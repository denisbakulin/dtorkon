export type AssetStatus = 'pending' | 'ready' | 'orphaned';
export type AttachmentKind = 'image' | 'audio' | 'video' | 'file';
export type PostStatus = 'draft' | 'published';
export type TranscriptStatus = 'idle' | 'processing' | 'ready' | 'failed';

export type PublicAsset = {
  id: string;
  key: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  originalName: string;
  status: AssetStatus;
  transcriptStatus: TranscriptStatus;
  transcriptText: string | null;
  transcriptError: string | null;
  transcribedAt: string | null;
};

export type PublicAttachment = {
  id: string;
  assetId: string;
  kind: AttachmentKind;
  title: string;
  sortOrder: number;
  asset: PublicAsset;
};

export type PublicPostListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverAsset: PublicAsset | null;
  publishedAt: string;
};

export type PaginationInfo = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type PublicPostListResponse = {
  items: PublicPostListItem[];
  pagination: PaginationInfo;
};

export type PublicPostDetail = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  status: PostStatus;
  coverAsset: PublicAsset | null;
  attachments: PublicAttachment[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
};

export type PublicMediaItem = {
  id: string;
  kind: AttachmentKind;
  title: string;
  publishedAt: string;
  postSlug: string;
  postTitle: string;
  asset: PublicAsset;
};

export type PublicMediaResponse = {
  items: PublicMediaItem[];
  pagination: PaginationInfo;
};

export type SiteProfileLinkKind = 'email' | 'phone' | 'telegram' | 'vk' | 'link';

export type SiteProfileLink = {
  id: string;
  kind: SiteProfileLinkKind;
  label: string;
  url: string;
  sortOrder: number;
};

export type SiteProfile = {
  siteTitle: string;
  siteTagline: string;
  authorName: string;
  authorBio: string;
  contactEmail: string;
  avatarAssetId: string | null;
  avatarAsset: PublicAsset | null;
  backgroundColor: string;
  backgroundAssetId: string | null;
  backgroundAsset: PublicAsset | null;
  links: SiteProfileLink[];
  updatedAt: string;
};

export type ContactMessageRequest = {
  contact: string;
  message: string;
};

export type StatusSource = {
  name: string;
  enabled: boolean;
  reachable: boolean;
  url: string | null;
  message: string | null;
};

export type HostStatus = {
  cpuUsagePercent: number | null;
  load1: number | null;
  load5: number | null;
  load15: number | null;
  memoryTotalBytes: number | null;
  memoryAvailableBytes: number | null;
  memoryUsedBytes: number | null;
  diskTotalBytes: number | null;
  diskAvailableBytes: number | null;
  diskUsedBytes: number | null;
  uptimeSeconds: number | null;
};

export type ContainerStatus = {
  name: string;
  service: string;
  cpuUsagePercent: number | null;
  memoryUsageBytes: number | null;
  memoryWorkingSetBytes: number | null;
  filesystemUsageBytes: number | null;
  networkReceiveBytes: number;
  networkTransmitBytes: number;
};

export type StatusMonitor = {
  name: string;
  status: 'up' | 'down' | 'maintenance' | 'unknown';
  pingMs: number | null;
  url: string | null;
};

export type UptimeKumaStatus = {
  pageTitle: string;
  pageUrl: string;
  slug: string;
  totalMonitors: number;
  upMonitors: number;
  downMonitors: number;
  maintenanceMonitors: number;
  monitors: StatusMonitor[];
};

export type RuntimeStatusResponse = {
  status: 'ok' | 'degraded' | 'error';
  generatedAt: string;
  backendStatus: 'ok' | 'error';
  host: HostStatus | null;
  containers: ContainerStatus[];
  sources: StatusSource[];
  uptimeKuma: UptimeKumaStatus | null;
};
