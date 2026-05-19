import { httpClient } from './http-client';
import type {
  AttachmentKind,
  ContactMessageRequest,
  PublicMediaResponse,
  PublicPostDetail,
  PublicPostListResponse,
  PublicProjectDetail,
  PublicProjectListResponse,
  RuntimeStatusResponse,
  SiteProfile,
} from './blog-contract';

type GetPublicPostsOptions = {
  page?: number;
  pageSize?: number;
  q?: string;
  signal?: AbortSignal;
};

export async function getPublicPosts({
  page = 1,
  pageSize = 9,
  q,
  signal,
}: GetPublicPostsOptions = {}) {
  const response = await httpClient.get<PublicPostListResponse>('/api/posts', {
    params: {
      page,
      page_size: pageSize,
      q: q?.trim() ? q.trim() : undefined,
    },
    signal,
  });

  return response.data;
}

export async function getPublicPost(slug: string, signal?: AbortSignal) {
  const response = await httpClient.get<PublicPostDetail>(`/api/posts/${slug}`, {
    signal,
  });

  return response.data;
}

export async function getPublicMedia(options: {
  page?: number;
  pageSize?: number;
  kind?: AttachmentKind | null;
  signal?: AbortSignal;
} = {}) {
  const { page = 1, pageSize = 24, kind, signal } = options;

  const response = await httpClient.get<PublicMediaResponse>('/api/media', {
    params: {
      page,
      page_size: pageSize,
      kind: kind ?? undefined,
    },
    signal,
  });

  return response.data;
}

export async function getPublicProjects(signal?: AbortSignal) {
  const response = await httpClient.get<PublicProjectListResponse>('/api/projects', { signal });
  return response.data;
}

export async function getPublicProject(slug: string, signal?: AbortSignal) {
  const response = await httpClient.get<PublicProjectDetail>(`/api/projects/${slug}`, { signal });
  return response.data;
}

export async function getSiteProfile(signal?: AbortSignal) {
  const response = await httpClient.get<SiteProfile>('/api/site-profile', { signal });
  return response.data;
}

export async function getRuntimeStatus(signal?: AbortSignal) {
  const response = await httpClient.get<RuntimeStatusResponse>('/api/status', { signal });
  return response.data;
}

export async function sendContactMessage(payload: ContactMessageRequest) {
  await httpClient.post('/api/contact/messages', payload);
}
