import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import {
  Alert,
  Box,
  Button,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

import {
  clearAdminTelegramBotToken,
  getAdminTelegramSettings,
  setAdminTelegramAdminChatId,
  setAdminTelegramBotToken,
  setAdminTelegramMessageTemplate,
} from '../../../shared/api/admin-api';
import type { TelegramSettings } from '../../../shared/api/admin-contract';
import { getApiErrorMessage } from '../../../shared/api/api-error';

const TEMPLATE_HELPER =
  'Переменные: {contact}, {message}, {ip}. Пример:\nНовое сообщение с сайта\\nКонтакт: {contact}\\n\\n{message}';

export function TelegramSettingsPanel() {
  const [settings, setSettings] = useState<TelegramSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [botTokenDraft, setBotTokenDraft] = useState('');
  const [adminChatIdDraft, setAdminChatIdDraft] = useState('');
  const [templateDraft, setTemplateDraft] = useState('');
  const isDirty = useMemo(() => {
    return (
      botTokenDraft.trim().length > 0 ||
      adminChatIdDraft !== (settings?.adminChatId ?? '') ||
      templateDraft !== (settings?.messageTemplate ?? '')
    );
  }, [adminChatIdDraft, botTokenDraft, settings?.adminChatId, settings?.messageTemplate, templateDraft]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    getAdminTelegramSettings(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setSettings(response);
          setAdminChatIdDraft(response.adminChatId ?? '');
          setTemplateDraft(response.messageTemplate ?? '');
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }
        setErrorMessage(getApiErrorMessage(error, 'Не удалось загрузить Telegram-настройки.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const handleSave = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let next = settings;

      if (botTokenDraft.trim()) {
        next = await setAdminTelegramBotToken(botTokenDraft.trim());
        setBotTokenDraft('');
      }

      if (adminChatIdDraft !== (next?.adminChatId ?? '')) {
        next = await setAdminTelegramAdminChatId(adminChatIdDraft.trim());
      }

      if (templateDraft !== (next?.messageTemplate ?? '')) {
        next = await setAdminTelegramMessageTemplate(templateDraft);
      }

      if (next) {
        setSettings(next);
        setAdminChatIdDraft(next.adminChatId ?? '');
        setTemplateDraft(next.messageTemplate ?? '');
      }

      setSuccessMessage('Telegram-настройки сохранены.');
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Не удалось сохранить Telegram-настройки.'));
    }
  };

  const handleClearToken = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await clearAdminTelegramBotToken();
      const next = await getAdminTelegramSettings();
      setSettings(next);
      setSuccessMessage('Telegram bot token удалён.');
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'Не удалось удалить Telegram bot token.'));
    }
  };

  return (
    <Paper sx={{ p: { xs: 3, md: 4 } }}>
      <Stack spacing={2.25}>
        <Box>
          <Typography variant="h6">Связь (Telegram)</Typography>
          <Typography color="text.secondary" variant="body2">
            Публичная форма отправляет сообщение в Telegram-чат администратора через Bot API.
          </Typography>
        </Box>

        {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}
        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

        {isLoading ? (
          <Stack spacing={1.5}>
            <Skeleton height={52} />
            <Skeleton height={52} />
            <Skeleton height={160} />
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Alert severity={settings?.botConfigured ? 'success' : 'info'}>
              {settings?.botConfigured
                ? 'Bot token настроен (учитывается .env и/или ключ из SQLite).'
                : 'Bot token не настроен — форма связи будет недоступна.'}
            </Alert>

            <TextField
              label="Bot token (вставьте новый для обновления)"
              onChange={(event) => setBotTokenDraft(event.target.value)}
              placeholder="123456:ABCDEF..."
              type="password"
              value={botTokenDraft}
            />

            <TextField
              helperText="Telegram chat id (user или group). Пример: 123456789 или -1001234567890"
              label="Admin chat id"
              onChange={(event) => setAdminChatIdDraft(event.target.value)}
              value={adminChatIdDraft}
            />

            <TextField
              helperText={TEMPLATE_HELPER}
              label="Шаблон сообщения"
              minRows={4}
              multiline
              onChange={(event) => setTemplateDraft(event.target.value)}
              value={templateDraft}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <Button
                disabled={!isDirty}
                onClick={() => void handleSave()}
                startIcon={<SaveRoundedIcon />}
                variant="contained"
              >
                Save
              </Button>
              <Button
                color="error"
                onClick={() => void handleClearToken()}
                startIcon={<DeleteOutlineRoundedIcon />}
                variant="outlined"
              >
                Clear token
              </Button>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

