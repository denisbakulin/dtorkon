import type { AttachmentKind, PublicAsset } from '../api/blog-contract';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.aac': 'audio/aac',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.m4a': 'audio/mp4',
  '.md': 'text/markdown',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.txt': 'text/plain',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.zip': 'application/zip',
};

const AUDIO_EXTENSIONS = new Set([
  '.aac',
  '.m4a',
  '.mp3',
  '.ogg',
  '.wav',
]);

const VIDEO_EXTENSIONS = new Set([
  '.mkv',
  '.mov',
  '.mp4',
  '.webm',
]);

export const FILE_UPLOAD_ACCEPT = [
  '.aac',
  '.docx',
  '.m4a',
  '.md',
  '.mkv',
  '.mov',
  '.mp3',
  '.mp4',
  '.ogg',
  '.pdf',
  '.png',
  '.txt',
  '.wav',
  '.webm',
  '.webp',
  '.zip',
  'audio/aac',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
].join(',');

export function normalizeMimeType(mimeType: string) {
  return mimeType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

export function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '');
}

function toTitleCase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed[0]!.toUpperCase() + trimmed.slice(1);
}

export function prettifyMediaName(fileName: string) {
  const baseName = stripFileExtension(fileName);

  // Example: voice-note-2026-05-16T07-31-54-690Z
  const voiceNoteMatch = /^(voice-note)-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})(?:-(\d{2}))?(?:-(\d{3}))?Z$/.exec(baseName);
  if (voiceNoteMatch) {
    const [, prefix, datePart, hh, mm] = voiceNoteMatch;
    const labelPrefix = prefix === 'voice-note' ? 'Voice note' : toTitleCase(prefix.replace(/[-_]+/g, ' '));
    return `${labelPrefix} ${datePart} ${hh}:${mm}`;
  }

  const genericIsoTail = /-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})(?:-(\d{2}))?(?:-(\d{3}))?Z$/.exec(baseName);
  if (genericIsoTail) {
    const [matched, datePart, hh, mm] = genericIsoTail;
    const prefix = baseName.slice(0, baseName.length - matched.length).replace(/[-_]+/g, ' ');
    const labelPrefix = toTitleCase(prefix);
    return `${labelPrefix || 'Media'} ${datePart} ${hh}:${mm}`;
  }

  return baseName.replace(/[-_]+/g, ' ');
}

export function getFileExtension(fileName: string) {
  const match = /\.[^.]+$/.exec(fileName.toLowerCase());
  return match?.[0] ?? '';
}

export function resolveFileMimeType(file: Pick<File, 'name' | 'type'>) {
  const normalizedType = normalizeMimeType(file.type);
  return normalizedType || MIME_BY_EXTENSION[getFileExtension(file.name)] || 'application/octet-stream';
}

export function getAttachmentKindFromMimeType(mimeType: string): AttachmentKind {
  const normalizedType = normalizeMimeType(mimeType);
  if (normalizedType.startsWith('image/')) {
    return 'image';
  }
  if (normalizedType.startsWith('audio/')) {
    return 'audio';
  }
  if (normalizedType.startsWith('video/')) {
    return 'video';
  }
  return 'file';
}

export function getAssetKind(asset: Pick<PublicAsset, 'mimeType'>): AttachmentKind {
  return getAttachmentKindFromMimeType(asset.mimeType);
}

export function isAudioMimeType(mimeType: string) {
  return normalizeMimeType(mimeType).startsWith('audio/');
}

export function isVideoMimeType(mimeType: string) {
  return normalizeMimeType(mimeType).startsWith('video/');
}

function urlHasExtension(url: string, extensions: Set<string>) {
  try {
    const pathname = new URL(url, 'https://dtorkon.local').pathname;
    return extensions.has(getFileExtension(pathname));
  } catch {
    return extensions.has(getFileExtension(url));
  }
}

export function isAudioUrl(url: string) {
  return urlHasExtension(url, AUDIO_EXTENSIONS);
}

export function isVideoUrl(url: string) {
  return urlHasExtension(url, VIDEO_EXTENSIONS);
}
