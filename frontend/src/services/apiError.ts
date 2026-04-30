import { isAxiosError } from 'axios';

type ProblemLike = {
  message?: unknown;
  detail?: unknown;
  title?: unknown;
  status?: unknown;
  validationErrors?: unknown;
};

function joinValidationErrors(validationErrors: unknown): string | null {
  if (!validationErrors || typeof validationErrors !== 'object') {
    return null;
  }
  const msgs = Object.values(validationErrors as Record<string, string>).filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  if (!msgs.length) return null;
  return msgs.join(' ');
}

export const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) {
    return fallback;
  }

  const status = error.response?.status;
  const data = error.response?.data;

  if (typeof data === 'string' && data.trim().length > 0) {
    return data;
  }

  if (data && typeof data === 'object') {
    const obj = data as ProblemLike;

    if (typeof obj.message === 'string' && obj.message.trim().length > 0) {
      return obj.message.trim();
    }

    const fromFields = joinValidationErrors(obj.validationErrors);
    if (fromFields) {
      return fromFields;
    }

    // RFC 7807 Problem Details (Spring Boot often sends only detail/title)
    if (typeof obj.detail === 'string' && obj.detail.trim().length > 0) {
      return obj.detail.trim();
    }

    if (typeof obj.title === 'string' && typeof status === 'number') {
      return `${obj.title} (HTTP ${status})`;
    }
  }

  if (typeof status === 'number') {
    if (status === 403) {
      return 'Access denied. You may need HR or ADMIN permissions.';
    }
    if (status === 401) {
      return 'Session expired or not logged in. Please sign in again.';
    }
  }

  return fallback;
};
