type AudioSnapshot = {
  src: string | null;
  title: string | null;
  subtitle: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
};

type AudioListener = (snapshot: AudioSnapshot) => void;

let audio: HTMLAudioElement | null = null;
let listeners: Set<AudioListener> | null = null;
let bound = false;

let snapshot: AudioSnapshot = {
  src: null,
  title: null,
  subtitle: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
};

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

  try {
    await audio!.play();
  } catch {
    // Autoplay/gesture errors are expected on some browsers.
  }
}

export function pausePersistentAudio() {
  ensure();
  audio!.pause();
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
}
