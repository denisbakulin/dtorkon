import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import {
  clearAdminGroqApiKey,
  getAdminTranscriptionSettings,
  setAdminGroqApiKey,
} from '../../../shared/api/admin-api';
import { getApiErrorMessage } from '../../../shared/api/api-error';

export function TranscriptionSettingsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<{
    groqConfigured: boolean;
    groqApiBase: string;
    groqSpeechModel: string;
  } | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isConfigured = Boolean(settings?.groqConfigured);

  const statusChip = useMemo(
    () =>
      isConfigured ? (
        <Chip color="success" label="Groq configured" variant="outlined" />
      ) : (
        <Chip color="warning" label="Groq key missing" variant="outlined" />
      ),
    [isConfigured],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        const response = await getAdminTranscriptionSettings();
        if (!cancelled) {
          setSettings(response);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(getApiErrorMessage(loadError, 'Unable to load transcription settings.'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (!apiKeyDraft.trim()) {
      setError('Enter a Groq API key to save.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      const nextSettings = await setAdminGroqApiKey(apiKeyDraft.trim());
      setSettings(nextSettings);
      setApiKeyDraft('');
      setSuccess('Groq API key saved.');
    } catch (saveError: unknown) {
      setError(getApiErrorMessage(saveError, 'Unable to save Groq API key.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      await clearAdminGroqApiKey();
      const nextSettings = await getAdminTranscriptionSettings();
      setSettings(nextSettings);
      setApiKeyDraft('');
      setSuccess('Groq API key removed.');
    } catch (clearError: unknown) {
      setError(getApiErrorMessage(clearError, 'Unable to remove Groq API key.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Paper sx={{ p: { xs: 3, md: 4 } }}>
      <Stack spacing={2}>
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6">Transcription</Typography>
              <Typography color="text.secondary" variant="body2">
                Audio/video transcription uses Groq Speech-to-Text.
              </Typography>
            </Box>
            {statusChip}
          </Stack>
        </Box>

        {error ? <Alert severity="warning">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}

        <Stack spacing={1.25}>
          <TextField
            disabled={isLoading || isSaving}
            helperText={
              isConfigured
                ? 'Key is stored in SQLite. Paste a new key to rotate it.'
                : 'Paste a Groq API key to enable transcription.'
            }
            label="Groq API key"
            onChange={(event) => setApiKeyDraft(event.target.value)}
            placeholder={isConfigured ? '••••••••••••••••' : ''}
            type="password"
            value={apiKeyDraft}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: { sm: 'center' } }}>
            <Button
              disabled={isLoading || isSaving}
              onClick={() => void handleSave()}
              startIcon={<SaveRoundedIcon />}
              variant="contained"
            >
              Save key
            </Button>
            <Button
              color="inherit"
              disabled={isLoading || isSaving || !isConfigured}
              onClick={() => void handleClear()}
              variant="outlined"
            >
              Remove key
            </Button>
            {settings ? (
              <Typography color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace' }} variant="caption">
                {settings.groqApiBase} • {settings.groqSpeechModel}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}

