type AudioSnapshot = {
  src: string | null;
  title: string | null;
  subtitle: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
};

type AudioListener = (snapshot: AudioSnapshot) => void;

type PersistedAudioSnapshotV1 = {
  v: 1;
  src: string;
  title: string | null;
  subtitle: string | null;
  isPlaying: boolean;
  currentTime: number;
};

const STORAGE_KEY = 'dtorkon:persistentAudio:v1';

let audio: HTMLAudioElement | null = null;
let listeners: Set<AudioListener> | null = null;
let bound = false;
let restored = false;
let persistTimer: number | null = null;
let persistInFlight = false;

let snapshot: AudioSnapshot = {
  src: null,
  title: null,
  subtitle: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
};

function safeParsePersisted(raw: string | null): PersistedAudioSnapshotV1 | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<PersistedAudioSnapshotV1> | null;
    if (!data || data.v !== 1) return null;
    if (typeof data.src !== 'string' || !data.src) return null;
    const title = typeof data.title === 'string' ? data.title : null;
    const subtitle = typeof data.subtitle === 'string' ? data.subtitle : null;
    const isPlaying = Boolean(data.isPlaying);
    const currentTime = typeof data.currentTime === 'number' && Number.isFinite(data.currentTime) ? data.currentTime : 0;
    return { v: 1, src: data.src, title, subtitle, isPlaying, currentTime };
  } catch {
    return null;
  }
}

function persistSnapshotNow() {
  if (!audio) return;
  if (!snapshot.src) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return;
  }

  const payload: PersistedAudioSnapshotV1 = {
    v: 1,
    src: snapshot.src,
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    isPlaying: snapshot.isPlaying,
    currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : snapshot.currentTime || 0,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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

function ensure() {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'metadata';
  }
  if (!listeners) {
    listeners = new Set();
  }

  if (!bound && audio) {
    bound = true;

    if (!restored) {
      restored = true;
      const persisted = safeParsePersisted(localStorage.getItem(STORAGE_KEY));
      if (persisted) {
        snapshot = {
          ...snapshot,
          src: persisted.src,
          title: persisted.title,
          subtitle: persisted.subtitle,
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
          listeners!.forEach((l) => l(snapshot));
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

    const syncDuration = () => {
      snapshot = {
        ...snapshot,
        duration: Number.isFinite(audio!.duration) ? audio!.duration : 0,
      };
    };

    const notify = () => {
      syncDuration();
      snapshot = {
        ...snapshot,
        isPlaying: !audio!.paused && !audio!.ended,
        currentTime: audio!.currentTime || 0,
      };
      listeners!.forEach((listener) => listener(snapshot));
      schedulePersistSnapshot();
    };

    audio.addEventListener('loadedmetadata', notify);
    audio.addEventListener('durationchange', notify);
    audio.addEventListener('canplay', notify);
    audio.addEventListener('timeupdate', notify);
    audio.addEventListener('play', notify);
    audio.addEventListener('pause', notify);
    audio.addEventListener('ended', () => {
      snapshot = { ...snapshot, isPlaying: false, currentTime: 0 };
      listeners!.forEach((listener) => listener(snapshot));
      schedulePersistSnapshot();
    });
  }
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

export async function playPersistentAudio(params: { src: string; title?: string | null; subtitle?: string | null }) {
  ensure();
  const nextTitle = params.title?.trim() || null;
  const nextSubtitle = params.subtitle?.trim() || null;

  const isSameSrc = snapshot.src === params.src;
  snapshot = {
    ...snapshot,
    src: params.src,
    title: nextTitle,
    subtitle: nextSubtitle,
    currentTime: isSameSrc ? snapshot.currentTime : 0,
  };

  if (audio!.src !== params.src) {
    audio!.src = params.src;
    audio!.load();
  }

  listeners!.forEach((l) => l(snapshot));
  schedulePersistSnapshot();

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
  audio!.pause();
  audio!.removeAttribute('src');
  audio!.load();
  snapshot = {
    src: null,
    title: null,
    subtitle: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  };
  listeners!.forEach((l) => l(snapshot));
  schedulePersistSnapshot();
}

export function togglePersistentAudio(params: { src: string; title?: string | null; subtitle?: string | null }) {
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

export function seekPersistentAudioByRatio(ratio: number) {
  ensure();
  if (!Number.isFinite(audio!.duration) || audio!.duration <= 0) return;
  audio!.currentTime = Math.max(0, Math.min(audio!.duration, ratio * audio!.duration));
  schedulePersistSnapshot();
}
