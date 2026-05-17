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
