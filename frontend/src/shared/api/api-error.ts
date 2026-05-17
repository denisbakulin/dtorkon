import axios from 'axios';

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return error.response?.data?.error?.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export function getApiErrorStatus(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.status ?? null;
  }

  return null;
}
