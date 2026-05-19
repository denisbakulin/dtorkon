import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { Alert, Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

import {
  getAdminCredentialsSettings,
  updateAdminCredentialsSettings,
} from '../../../shared/api/admin-api';
import type { AdminCredentialsSettings } from '../../../shared/api/admin-contract';
import { getApiErrorMessage } from '../../../shared/api/api-error';

export function CredentialsSettingsPanel() {
  const [settings, setSettings] = useState<AdminCredentialsSettings | null>(null);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [passwordDraft, setPasswordDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasChanges = useMemo(() => {
    if (!settings) {
      return false;
    }

    return usernameDraft.trim() !== settings.adminUsername || passwordDraft.trim().length > 0;
  }, [passwordDraft, settings, usernameDraft]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    getAdminCredentialsSettings(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setSettings(response);
          setUsernameDraft(response.adminUsername);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }
        setErrorMessage(getApiErrorMessage(error, 'Unable to load admin credentials settings.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const handleSave = async () => {
    if (!settings) {
      return;
    }

    const nextUsername = usernameDraft.trim();
    if (!nextUsername) {
      setErrorMessage('Login cannot be empty.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const nextSettings = await updateAdminCredentialsSettings({
        password: passwordDraft.trim() || undefined,
        username: nextUsername !== settings.adminUsername ? nextUsername : undefined,
      });

      setSettings(nextSettings);
      setUsernameDraft(nextSettings.adminUsername);
      setPasswordDraft('');
      setSuccessMessage('Admin access settings saved.');
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to save admin credentials settings.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetUsername = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const nextSettings = await updateAdminCredentialsSettings({ username: '' });
      setSettings(nextSettings);
      setUsernameDraft(nextSettings.adminUsername);
      setSuccessMessage('Admin login was reset to the .env value.');
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to reset admin login.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const nextSettings = await updateAdminCredentialsSettings({ password: '' });
      setSettings(nextSettings);
      setPasswordDraft('');
      setSuccessMessage('Admin password was reset to the .env value.');
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to reset admin password.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Paper sx={{ p: { xs: 3, md: 4 } }}>
      <Stack spacing={2.25}>
        <Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="h6">Admin access</Typography>
              <Typography color="text.secondary" variant="body2">
                Change the admin login and rotate the password without editing `.env` on the server.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip
                color={settings?.usernameOverridden ? 'success' : 'default'}
                label={settings?.usernameOverridden ? 'Login override active' : 'Login from .env'}
                variant="outlined"
              />
              <Chip
                color={settings?.passwordOverridden ? 'success' : 'default'}
                label={settings?.passwordOverridden ? 'Password override active' : 'Password from .env'}
                variant="outlined"
              />
            </Stack>
          </Stack>
        </Box>

        {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}
        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

        <Stack spacing={2}>
          <TextField
            disabled={isLoading || isSaving}
            helperText="Used on the next login attempt. Current sessions stay valid."
            label="Admin login"
            onChange={(event) => setUsernameDraft(event.target.value)}
            value={usernameDraft}
          />

          <TextField
            disabled={isLoading || isSaving}
            helperText="Leave blank to keep the current password. Saving a new one rotates the credential immediately."
            label="New password"
            onChange={(event) => setPasswordDraft(event.target.value)}
            type="password"
            value={passwordDraft}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Button
              disabled={isLoading || isSaving || !hasChanges}
              onClick={() => void handleSave()}
              startIcon={<SaveRoundedIcon />}
              variant="contained"
            >
              Save access settings
            </Button>
            <Button
              color="inherit"
              disabled={isLoading || isSaving || !settings?.usernameOverridden}
              onClick={() => void handleResetUsername()}
              startIcon={<DeleteOutlineRoundedIcon />}
              variant="outlined"
            >
              Reset login to .env
            </Button>
            <Button
              color="inherit"
              disabled={isLoading || isSaving || !settings?.passwordOverridden}
              onClick={() => void handleResetPassword()}
              startIcon={<DeleteOutlineRoundedIcon />}
              variant="outlined"
            >
              Reset password to .env
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
