import KeyboardVoiceRoundedIcon from '@mui/icons-material/KeyboardVoiceRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { normalizeMimeType } from '../../../shared/lib/media';

type VoiceRecorderPanelProps = {
  disabled?: boolean;
  onRecordingReady: (file: File) => Promise<void> | void;
};

type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'processing';

const RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
];

const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
};

function canRecordVoice() {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

function resolveRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  const supportedMimeType = RECORDER_MIME_CANDIDATES.find((candidate) =>
    MediaRecorder.isTypeSupported(candidate),
  );

  return normalizeMimeType(supportedMimeType ?? '');
}

function buildVoiceFileName(mimeType: string) {
  const extension = EXTENSION_BY_MIME[mimeType] ?? 'webm';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `voice-note-${timestamp}.${extension}`;
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function VoiceRecorderPanel({
  disabled = false,
  onRecordingReady,
}: VoiceRecorderPanelProps) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const isSupported = canRecordVoice();

  const resetTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startedAtRef.current = null;
    setDurationMs(0);
  };

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      stopMediaStream(streamRef.current);
      resetTimer();
    };
  }, []);

  const startRecording = async () => {
    if (!isSupported || disabled || status !== 'idle') {
      return;
    }

    setErrorMessage(null);
    setStatus('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = resolveRecorderMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        stopMediaStream(streamRef.current);
        streamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
        resetTimer();
        setStatus('idle');
        setErrorMessage('Не удалось завершить запись. Попробуй еще раз.');
      };

      recorder.onstop = async () => {
        const mimeType = normalizeMimeType(
          recorder.mimeType || preferredMimeType || chunksRef.current[0]?.type || 'audio/webm',
        );
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });

        stopMediaStream(streamRef.current);
        streamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
        resetTimer();

        if (audioBlob.size === 0) {
          setStatus('idle');
          setErrorMessage('Запись получилась пустой. Попробуй записать голосовое еще раз.');
          return;
        }

        const voiceFile = new File([audioBlob], buildVoiceFileName(mimeType), {
          type: mimeType,
          lastModified: Date.now(),
        });

        try {
          await onRecordingReady(voiceFile);
        } catch {
          setErrorMessage('Не удалось передать голосовое в upload flow.');
        } finally {
          setStatus('idle');
        }
      };

      recorder.start();
      startedAtRef.current = Date.now();
      setDurationMs(0);
      timerRef.current = window.setInterval(() => {
        if (startedAtRef.current) {
          setDurationMs(Date.now() - startedAtRef.current);
        }
      }, 250);
      setStatus('recording');
    } catch {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      recorderRef.current = null;
      chunksRef.current = [];
      resetTimer();
      setStatus('idle');
      setErrorMessage('Не удалось получить доступ к микрофону. Проверь разрешение браузера.');
    }
  };

  const stopRecording = () => {
    if (status !== 'recording' || !recorderRef.current) {
      return;
    }

    setStatus('processing');
    recorderRef.current.stop();
  };

  return (
    <Stack spacing={1.25}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        sx={{ alignItems: { sm: 'center' }, flexWrap: 'wrap' }}
      >
        <Button
          disabled={!isSupported || disabled || status !== 'idle'}
          onClick={() => {
            void startRecording();
          }}
          startIcon={
            status === 'requesting' ? (
              <CircularProgress color="inherit" size={18} />
            ) : (
              <KeyboardVoiceRoundedIcon />
            )
          }
          variant="outlined"
        >
          {status === 'requesting' ? 'Открываем микрофон...' : 'Записать голосовое'}
        </Button>

        {status === 'recording' ? (
          <>
            <Button
              color="error"
              onClick={stopRecording}
              startIcon={<StopRoundedIcon />}
              variant="contained"
            >
              Остановить
            </Button>
            <Chip color="primary" label={`Идет запись · ${formatDuration(durationMs)}`} />
          </>
        ) : null}

        {status === 'processing' ? (
          <Chip
            icon={<CircularProgress color="inherit" size={16} />}
            label="Готовим аудио к загрузке"
            variant="outlined"
          />
        ) : null}
      </Stack>

      <Typography color="text.secondary" variant="body2">
        {isSupported ? (
          <>
            Голосовое попадет в общий upload flow как обычный audio-asset и сохранится во
            вложениях поста.
          </>
        ) : (
          'В этом браузере запись голосовых недоступна. Можно загрузить готовый аудиофайл вручную.'
        )}
      </Typography>

      {errorMessage ? (
        <Alert severity="warning">{errorMessage}</Alert>
      ) : null}

      {status === 'recording' ? (
        <Box
          sx={{
            bgcolor: 'rgba(42, 171, 238, 0.06)',
            border: '1px solid rgba(42, 171, 238, 0.16)',
            borderRadius: 1,
            px: 1.5,
            py: 1.25,
          }}
        >
          <Typography variant="body2">
            Микрофон активен. После остановки запись автоматически загрузится в post attachments.
          </Typography>
        </Box>
      ) : null}
    </Stack>
  );
}
