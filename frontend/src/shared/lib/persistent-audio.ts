export type AudioCollectionTrack = {
  id: string;
  src: string;
  title: string | null;
  subtitle: string | null;
};

export type AudioCollection = {
  id: string;
  title: string | null;
  subtitle: string | null;
  contextLabel: string | null;
  tracks: AudioCollectionTrack[];
};

export type AudioSnapshot = {
  src: string | null;
  trackId: string | null;
  title: string | null;
  subtitle: string | null;
  collection: AudioCollection | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
};

type AudioListener = (snapshot: AudioSnapshot) => void;

type PersistedAudioSnapshotV2 = {
  v: 2;
  src: string;
  trackId: string | null;
  title: string | null;
  subtitle: string | null;
  collection: AudioCollection | null;
  isPlaying: boolean;
  currentTime: number;
};

type PersistedAudioSnapshotV1 = {
  v: 1;
  src: string;
  title: string | null;
  subtitle: string | null;
  isPlaying: boolean;
  currentTime: number;
};

type PersistentAudioTarget = {
  src: string;
  title?: string | null;
  subtitle?: string | null;
  trackId?: string | null;
  collection?: AudioCollection | null;
};

const STORAGE_KEY = 'dtorkon:persistentAudio:v2';
const LEGACY_STORAGE_KEY = 'dtorkon:persistentAudio:v1';
const MEDIA_SESSION_ARTWORK = [
  {
    src: '/favicon.ico',
    sizes: '256x256',
    type: 'image/x-icon',
  },
];

let audio: HTMLAudioElement | null = null;
let listeners: Set<AudioListener> | null = null;
let bound = false;
let restored = false;
let mediaSessionBound = false;
let mediaSessionMetadataKey: string | null = null;
let persistTimer: number | null = null;
let persistInFlight = false;
let pendingSeekRatio: number | null = null;

let snapshot: AudioSnapshot = {
  src: null,
  trackId: null,
  title: null,
  subtitle: null,
  collection: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
};

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeCollectionTrack(track: AudioCollectionTrack): AudioCollectionTrack {
  return {
    id: track.id,
    src: track.src,
    title: normalizeText(track.title),
    subtitle: normalizeText(track.subtitle),
  };
}

function normalizeCollection(collection: AudioCollection | null | undefined): AudioCollection | null {
  if (!collection) return null;

  const tracks = collection.tracks
    .filter((track) => typeof track.src === 'string' && track.src)
    .map(normalizeCollectionTrack);

  if (tracks.length === 0) {
    return null;
  }

  return {
    id: collection.id,
    title: normalizeText(collection.title),
    subtitle: normalizeText(collection.subtitle),
    contextLabel: normalizeText(collection.contextLabel),
    tracks,
  };
}

function findTrackIndex(collection: AudioCollection | null, target: { trackId?: string | null; src?: string | null }) {
  if (!collection) return -1;
  if (target.trackId) {
    const byId = collection.tracks.findIndex((track) => track.id === target.trackId);
    if (byId >= 0) return byId;
  }
  if (target.src) {
    return collection.tracks.findIndex((track) => track.src === target.src);
  }
  return -1;
}

function createStandaloneCollection(track: AudioCollectionTrack): AudioCollection {
  return {
    id: `standalone:${track.id}`,
    title: null,
    subtitle: null,
    contextLabel: null,
    tracks: [track],
  };
}

function resolveTarget(params: PersistentAudioTarget) {
  const normalizedCollection = normalizeCollection(params.collection);
  const collectionTrackIndex = findTrackIndex(normalizedCollection, {
    src: params.src,
    trackId: params.trackId,
  });

  if (normalizedCollection && collectionTrackIndex >= 0) {
    const collectionTrack = normalizedCollection.tracks[collectionTrackIndex];
    return {
      collection: normalizedCollection,
      track: collectionTrack,
    };
  }

  const track: AudioCollectionTrack = {
    id: params.trackId || params.src,
    src: params.src,
    title: normalizeText(params.title),
    subtitle: normalizeText(params.subtitle),
  };

  return {
    collection: createStandaloneCollection(track),
    track,
  };
}

function safeParsePersisted(raw: string | null): PersistedAudioSnapshotV2 | null {
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as Partial<PersistedAudioSnapshotV2> | null;
    if (!data || data.v !== 2) return null;
    if (typeof data.src !== 'string' || !data.src) return null;
    const collection = normalizeCollection(data.collection ?? null);
    return {
      v: 2,
      src: data.src,
      trackId: typeof data.trackId === 'string' && data.trackId ? data.trackId : null,
      title: normalizeText(data.title),
      subtitle: normalizeText(data.subtitle),
      collection,
      isPlaying: Boolean(data.isPlaying),
      currentTime: typeof data.currentTime === 'number' && Number.isFinite(data.currentTime) ? data.currentTime : 0,
    };
  } catch {
    return null;
  }
}

function safeParseLegacyPersisted(raw: string | null): PersistedAudioSnapshotV2 | null {
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as Partial<PersistedAudioSnapshotV1> | null;
    if (!data || data.v !== 1) return null;
    if (typeof data.src !== 'string' || !data.src) return null;
    const track: AudioCollectionTrack = {
      id: data.src,
      src: data.src,
      title: normalizeText(data.title),
      subtitle: normalizeText(data.subtitle),
    };
    return {
      v: 2,
      src: track.src,
      trackId: track.id,
      title: track.title,
      subtitle: track.subtitle,
      collection: createStandaloneCollection(track),
      isPlaying: Boolean(data.isPlaying),
      currentTime: typeof data.currentTime === 'number' && Number.isFinite(data.currentTime) ? data.currentTime : 0,
    };
  } catch {
    return null;
  }
}

function emitSnapshot() {
  syncMediaSession();
  listeners?.forEach((listener) => listener(snapshot));
}

function getMediaSession() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return null;
  }

  return navigator.mediaSession;
}

function setMediaSessionActionHandler(
  mediaSession: MediaSession,
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null,
) {
  try {
    mediaSession.setActionHandler(action, handler);
  } catch {
    // Some browsers expose Media Session but do not support every action.
  }
}

function bindMediaSessionActions() {
  const mediaSession = getMediaSession();
  if (!mediaSession || mediaSessionBound) return;

  mediaSessionBound = true;

  setMediaSessionActionHandler(mediaSession, 'play', () => {
    if (!snapshot.src) return;
    void playPersistentAudio({
      collection: snapshot.collection,
      src: snapshot.src,
      subtitle: snapshot.subtitle,
      title: snapshot.title,
      trackId: snapshot.trackId,
    });
  });
  setMediaSessionActionHandler(mediaSession, 'pause', () => pausePersistentAudio());
  setMediaSessionActionHandler(mediaSession, 'stop', () => clearPersistentAudio());
  setMediaSessionActionHandler(mediaSession, 'previoustrack', () => playPreviousPersistentAudio());
  setMediaSessionActionHandler(mediaSession, 'nexttrack', () => playNextPersistentAudio());
  setMediaSessionActionHandler(mediaSession, 'seekbackward', (details) => {
    seekPersistentAudioByDelta(-(details.seekOffset ?? 10));
  });
  setMediaSessionActionHandler(mediaSession, 'seekforward', (details) => {
    seekPersistentAudioByDelta(details.seekOffset ?? 10);
  });
  setMediaSessionActionHandler(mediaSession, 'seekto', (details) => {
    if (typeof details.seekTime === 'number') {
      seekPersistentAudioBySeconds(details.seekTime);
    }
  });
}

function syncMediaSessionPosition(mediaSession: MediaSession) {
  if (!snapshot.src || typeof mediaSession.setPositionState !== 'function') return;

  const duration = Number.isFinite(audio?.duration) ? audio!.duration : snapshot.duration;
  if (!Number.isFinite(duration) || duration <= 0) return;

  const currentTime = Number.isFinite(audio?.currentTime) ? audio!.currentTime : snapshot.currentTime;

  try {
    mediaSession.setPositionState({
      duration,
      playbackRate: audio?.playbackRate || 1,
      position: Math.max(0, Math.min(duration, currentTime || 0)),
    });
  } catch {
    // Position state is best-effort and may reject while metadata is loading.
  }
}

function syncMediaSession() {
  const mediaSession = getMediaSession();
  if (!mediaSession) return;

  bindMediaSessionActions();

  if (!snapshot.src) {
    mediaSession.metadata = null;
    mediaSession.playbackState = 'none';
    mediaSessionMetadataKey = null;
    return;
  }

  const title = snapshot.title || 'Audio';
  const artist = snapshot.subtitle || snapshot.collection?.contextLabel || 'dtorkon';
  const album = snapshot.collection?.title || snapshot.collection?.contextLabel || 'dtorkon';
  const metadataKey = [snapshot.src, title, artist, album].join('|');

  if (mediaSessionMetadataKey !== metadataKey) {
    mediaSession.metadata = new MediaMetadata({
      album,
      artist,
      artwork: MEDIA_SESSION_ARTWORK,
      title,
    });
    mediaSessionMetadataKey = metadataKey;
  }

  mediaSession.playbackState = snapshot.isPlaying ? 'playing' : 'paused';
  syncMediaSessionPosition(mediaSession);
}

function persistSnapshotNow() {
  if (!audio) return;

  if (!snapshot.src) {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore
    }
    return;
  }

  const payload: PersistedAudioSnapshotV2 = {
    v: 2,
    src: snapshot.src,
    trackId: snapshot.trackId,
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    collection: snapshot.collection,
    isPlaying: snapshot.isPlaying,
    currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : snapshot.currentTime || 0,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore quota/private mode errors
  }
}

function schedulePersistSnapshot() {
  if (persistInFlight) return;
  if (persistTimer) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    persistInFlight = true;
    try {
      persistSnapshotNow();
    } finally {
      persistInFlight = false;
    }
  }, 500);
}

function syncDuration() {
  snapshot = {
    ...snapshot,
    duration: Number.isFinite(audio?.duration) ? audio!.duration : 0,
  };
}

function applyPendingSeek() {
  if (pendingSeekRatio === null) return;
  if (!Number.isFinite(audio?.duration) || audio!.duration <= 0) return;
  audio!.currentTime = Math.max(0, Math.min(audio!.duration, pendingSeekRatio * audio!.duration));
  pendingSeekRatio = null;
}

function getCurrentTrackIndex() {
  return findTrackIndex(snapshot.collection, {
    trackId: snapshot.trackId,
    src: snapshot.src,
  });
}

async function playTrackAtIndex(index: number) {
  if (!snapshot.collection) return;
  const nextTrack = snapshot.collection.tracks[index];
  if (!nextTrack) return;

  await playPersistentAudio({
    src: nextTrack.src,
    trackId: nextTrack.id,
    title: nextTrack.title,
    subtitle: nextTrack.subtitle,
    collection: snapshot.collection,
  });
}

function ensure() {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'metadata';
  }
  if (!listeners) {
    listeners = new Set();
  }

  if (bound || !audio) {
    return;
  }

  bound = true;

  if (!restored) {
    restored = true;
    const persisted = safeParsePersisted(localStorage.getItem(STORAGE_KEY)) ?? safeParseLegacyPersisted(localStorage.getItem(LEGACY_STORAGE_KEY));

    if (persisted) {
      snapshot = {
        ...snapshot,
        src: persisted.src,
        trackId: persisted.trackId,
        title: persisted.title,
        subtitle: persisted.subtitle,
        collection: persisted.collection,
        isPlaying: false,
        currentTime: persisted.currentTime,
      };

      audio.src = persisted.src;
      audio.load();

      const applyTimeAndMaybePlay = () => {
        audio!.removeEventListener('loadedmetadata', applyTimeAndMaybePlay);
        const dur = Number.isFinite(audio!.duration) ? audio!.duration : 0;
        if (dur > 0 && Number.isFinite(persisted.currentTime) && persisted.currentTime > 0) {
          audio!.currentTime = Math.max(0, Math.min(dur, persisted.currentTime));
        }
        if (persisted.isPlaying) {
          void audio!.play().catch(() => {
            // Autoplay/gesture errors are expected on some browsers.
          });
        }
        emitSnapshot();
      };

      audio.addEventListener('loadedmetadata', applyTimeAndMaybePlay);
    }

    window.addEventListener('pagehide', () => {
      try {
        if (persistTimer) {
          window.clearTimeout(persistTimer);
          persistTimer = null;
        }
        persistSnapshotNow();
      } catch {
        // ignore
      }
    });
  }

  const notify = () => {
    syncDuration();
    snapshot = {
      ...snapshot,
      isPlaying: !audio!.paused && !audio!.ended,
      currentTime: audio!.currentTime || 0,
    };
    emitSnapshot();
    schedulePersistSnapshot();
  };

  audio.addEventListener('loadedmetadata', () => {
    applyPendingSeek();
    notify();
  });
  audio.addEventListener('durationchange', notify);
  audio.addEventListener('canplay', notify);
  audio.addEventListener('timeupdate', notify);
  audio.addEventListener('play', notify);
  audio.addEventListener('pause', notify);
  audio.addEventListener('ended', () => {
    const currentIndex = getCurrentTrackIndex();
    const hasNextTrack = currentIndex >= 0 && !!snapshot.collection?.tracks[currentIndex + 1];

    if (hasNextTrack) {
      void playTrackAtIndex(currentIndex + 1);
      return;
    }

    snapshot = { ...snapshot, isPlaying: false, currentTime: 0 };
    emitSnapshot();
    schedulePersistSnapshot();
  });
}

export function getPersistentAudioSnapshot(): AudioSnapshot {
  ensure();
  return snapshot;
}

export function subscribePersistentAudio(listener: AudioListener) {
  ensure();
  listeners!.add(listener);
  listener(snapshot);
  return () => {
    listeners!.delete(listener);
  };
}

export async function playPersistentAudio(params: PersistentAudioTarget) {
  ensure();

  const { collection, track } = resolveTarget(params);
  const isSameSrc = snapshot.src === track.src;

  snapshot = {
    ...snapshot,
    src: track.src,
    trackId: track.id,
    title: track.title,
    subtitle: track.subtitle,
    collection,
    currentTime: isSameSrc ? snapshot.currentTime : 0,
    duration: isSameSrc ? snapshot.duration : 0,
  };

  emitSnapshot();
  schedulePersistSnapshot();

  if (!isSameSrc) {
    pendingSeekRatio = null;
    audio!.pause();
    audio!.src = track.src;
    audio!.load();
  }

  try {
    await audio!.play();
  } catch {
    // Autoplay/gesture errors are expected on some browsers.
  }
}

export function pausePersistentAudio() {
  ensure();
  audio!.pause();
  schedulePersistSnapshot();
}

export function clearPersistentAudio() {
  ensure();
  pendingSeekRatio = null;
  audio!.pause();
  audio!.removeAttribute('src');
  audio!.load();
  snapshot = {
    src: null,
    trackId: null,
    title: null,
    subtitle: null,
    collection: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  };
  emitSnapshot();
  schedulePersistSnapshot();
}

export function togglePersistentAudio(params: PersistentAudioTarget) {
  ensure();
  const isActive = snapshot.src === params.src;
  if (!isActive) {
    void playPersistentAudio(params);
    return;
  }

  if (audio!.paused) {
    void playPersistentAudio(params);
    return;
  }

  pausePersistentAudio();
}

export function playPreviousPersistentAudio() {
  ensure();
  const currentIndex = getCurrentTrackIndex();
  if (currentIndex > 0) {
    void playTrackAtIndex(currentIndex - 1);
  }
}

export function playNextPersistentAudio() {
  ensure();
  const currentIndex = getCurrentTrackIndex();
  if (currentIndex >= 0 && snapshot.collection?.tracks[currentIndex + 1]) {
    void playTrackAtIndex(currentIndex + 1);
  }
}

export function seekPersistentAudioByRatio(ratio: number) {
  ensure();
  const safeRatio = Math.max(0, Math.min(1, ratio));
  if (!Number.isFinite(audio!.duration) || audio!.duration <= 0) {
    pendingSeekRatio = safeRatio;
    return;
  }
  const nextTime = Math.max(0, Math.min(audio!.duration, safeRatio * audio!.duration));
  audio!.currentTime = nextTime;
  snapshot = {
    ...snapshot,
    currentTime: nextTime,
  };
  emitSnapshot();
  schedulePersistSnapshot();
}

export function seekPersistentAudioBySeconds(seconds: number) {
  ensure();
  if (!Number.isFinite(seconds)) return;

  const duration = Number.isFinite(audio!.duration) ? audio!.duration : snapshot.duration;
  const maxTime = duration > 0 ? duration : Number.POSITIVE_INFINITY;
  const nextTime = Math.max(0, Math.min(maxTime, seconds));

  if (!Number.isFinite(nextTime)) return;

  audio!.currentTime = nextTime;
  snapshot = {
    ...snapshot,
    currentTime: nextTime,
  };
  emitSnapshot();
  schedulePersistSnapshot();
}

export function seekPersistentAudioByDelta(deltaSeconds: number) {
  ensure();
  const baseTime = Number.isFinite(audio!.currentTime) ? audio!.currentTime : snapshot.currentTime;
  seekPersistentAudioBySeconds(baseTime + deltaSeconds);
}

export function hasPersistentAudioPreviousTrack() {
  ensure();
  return getCurrentTrackIndex() > 0;
}

export function hasPersistentAudioNextTrack() {
  ensure();
  const currentIndex = getCurrentTrackIndex();
  return currentIndex >= 0 && !!snapshot.collection?.tracks[currentIndex + 1];
}
