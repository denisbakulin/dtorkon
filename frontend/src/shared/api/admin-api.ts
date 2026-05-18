import { httpClient } from './http-client';
import type {
  AdminAnalytics,
  AdminPostDetail,
  AdminPostListResponse,
  AdminPostStatusFilter,
  AdminSession,
  CompleteUploadRequest,
  CreateAdminPostRequest,
  PresignUploadRequest,
  PresignUploadResponse,
  SiteProfile,
  TelegramSettings,
  TranscriptionSettings,
  UpdateSiteProfileRequest,
  UpdateAdminPostRequest,
} from './admin-contract';
import type { PublicAsset } from './blog-contract';

type LoginAdminRequest = {
  username: string;
  password: string;
};

type ListAdminPostsOptions = {
  status?: AdminPostStatusFilter;
  query?: string;
  signal?: AbortSignal;
};

export async function loginAdmin(payload: LoginAdminRequest) {
  const response = await httpClient.post<AdminSession>('/api/auth/login', payload);
  return response.data;
}

export async function getAdminSession(signal?: AbortSignal) {
  const response = await httpClient.get<AdminSession>('/api/auth/session', { signal });
  return response.data;
}

export async function logoutAdmin() {
  await httpClient.post('/api/auth/logout');
}

export async function getAdminPosts({
  status = 'all',
  query,
  signal,
}: ListAdminPostsOptions = {}) {
  const response = await httpClient.get<AdminPostListResponse>('/api/admin/posts', {
    params: {
      status,
      q: query?.trim() ? query.trim() : undefined,
    },
    signal,
  });

  return response.data;
}

export async function getAdminPost(postId: string, signal?: AbortSignal) {
  const response = await httpClient.get<AdminPostDetail>(`/api/admin/posts/${postId}`, {
    signal,
  });

  return response.data;
}

export async function createAdminPost(payload: CreateAdminPostRequest) {
  const response = await httpClient.post<AdminPostDetail>('/api/admin/posts', payload);
  return response.data;
}

export async function updateAdminPost(postId: string, payload: UpdateAdminPostRequest) {
  const response = await httpClient.patch<AdminPostDetail>(`/api/admin/posts/${postId}`, payload);
  return response.data;
}

export async function deleteAdminPost(postId: string) {
  await httpClient.delete(`/api/admin/posts/${postId}`);
}

export async function getAdminAnalytics(signal?: AbortSignal) {
  const response = await httpClient.get<AdminAnalytics>('/api/admin/analytics', { signal });
  return response.data;
}

export async function getAdminSiteProfile(signal?: AbortSignal) {
  const response = await httpClient.get<SiteProfile>('/api/admin/site-profile', { signal });
  return response.data;
}

export async function updateAdminSiteProfile(payload: UpdateSiteProfileRequest) {
  const response = await httpClient.patch<SiteProfile>('/api/admin/site-profile', payload);
  return response.data;
}

export async function presignAdminUpload(payload: PresignUploadRequest) {
  const response = await httpClient.post<PresignUploadResponse>('/api/admin/uploads/presign', payload);
  return response.data;
}

export async function uploadAdminAssetContent(params: {
  uploadUrl: string;
  method: string;
  mimeType: string;
  requiredHeaders: Record<string, string>;
  file: Blob;
  onProgress?: (progress: { loaded: number; total?: number; percent?: number }) => void;
}) {
  await httpClient.request({
    url: params.uploadUrl,
    method: params.method,
    data: params.file,
    headers: {
      'Content-Type': params.mimeType,
      ...params.requiredHeaders,
    },
    timeout: 60000,
    onUploadProgress: params.onProgress
      ? (event) => {
          const total = typeof event.total === 'number' && Number.isFinite(event.total) ? event.total : undefined;
          const loaded = typeof event.loaded === 'number' && Number.isFinite(event.loaded) ? event.loaded : 0;
          params.onProgress?.({
            loaded,
            percent: total && total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : undefined,
            total,
          });
        }
      : undefined,
  });
}

export async function completeAdminUpload(payload: CompleteUploadRequest) {
  const response = await httpClient.post<PublicAsset>('/api/admin/uploads/complete', payload);
  return response.data;
}

export async function transcribeAdminAsset(assetId: string) {
  const response = await httpClient.post<PublicAsset>(`/api/admin/assets/${assetId}/transcribe`);
  return response.data;
}

export async function deleteAdminAsset(assetId: string) {
  await httpClient.delete(`/api/admin/assets/${assetId}`);
}

export async function getAdminTranscriptionSettings(signal?: AbortSignal) {
  const response = await httpClient.get<TranscriptionSettings>('/api/admin/settings/transcription', {
    signal,
  });
  return response.data;
}

export async function setAdminGroqApiKey(apiKey: string) {
  const response = await httpClient.put<TranscriptionSettings>(
    '/api/admin/settings/transcription/groq-api-key',
    {
      apiKey,
    },
  );
  return response.data;
}

export async function clearAdminGroqApiKey() {
  await httpClient.delete('/api/admin/settings/transcription/groq-api-key');
}

export async function getAdminTelegramSettings(signal?: AbortSignal) {
  const response = await httpClient.get<TelegramSettings>('/api/admin/settings/telegram', { signal });
  return response.data;
}

export async function setAdminTelegramBotToken(apiKey: string) {
  const response = await httpClient.put<TelegramSettings>('/api/admin/settings/telegram/bot-token', {
    apiKey,
  });
  return response.data;
}

export async function clearAdminTelegramBotToken() {
  await httpClient.delete('/api/admin/settings/telegram/bot-token');
}

export async function setAdminTelegramAdminChatId(adminChatId: string) {
  const response = await httpClient.put<TelegramSettings>('/api/admin/settings/telegram/admin-chat-id', {
    adminChatId,
  });
  return response.data;
}

export async function setAdminTelegramMessageTemplate(messageTemplate: string) {
  const response = await httpClient.put<TelegramSettings>('/api/admin/settings/telegram/message-template', {
    messageTemplate,
  });
  return response.data;
}
