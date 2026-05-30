import { isAxiosError } from 'axios';

type ProblemLike = {
  message?: unknown;
  detail?: unknown;
  title?: unknown;
  status?: unknown;
  validationErrors?: unknown;
  existingTemplateId?: unknown;
};

export class ApiRequestError extends Error {
  readonly status?: number;
  readonly existingTemplateId?: number;

  constructor(
    message: string,
    init?: {
      status?: number;
      existingTemplateId?: number;
    },
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = init?.status;
    this.existingTemplateId = init?.existingTemplateId;
  }
}

function readExistingTemplateId(data: unknown): number | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  const value = (data as ProblemLike).existingTemplateId;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

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

const BACKEND_UNREACHABLE_MESSAGE =
  'Cannot reach the API server. Start the EPMS backend on http://localhost:8081 (MySQL must be running), then try again.';

export const isBackendUnreachableStatus = (status?: number): boolean =>
  status === 502 || status === 503 || status === 504;

const isBackendUnreachable = (error: {
  response?: { status?: number };
  code?: string;
  message?: string;
}): boolean => {
  const status = error.response?.status;
  if (isBackendUnreachableStatus(status)) {
    return true;
  }
  if (error.response != null) {
    return false;
  }
  const code = error.code ?? '';
  const message = error.message ?? '';
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNREFUSED' ||
    message.includes('Network Error') ||
    message.includes('ECONNREFUSED')
  );
};

export const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) {
    return fallback;
  }

  if (isBackendUnreachable(error)) {
    return BACKEND_UNREACHABLE_MESSAGE;
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
      return 'Access denied. You may need HR or HRADMIN permissions.';
    }
    if (status === 401) {
      return 'Session expired or not logged in. Please sign in again.';
    }
  }

  return fallback;
};

export const toApiRequestError = (error: unknown, fallback: string): ApiRequestError => {
  if (error instanceof ApiRequestError) {
    return error;
  }

  if (isAxiosError(error)) {
    return new ApiRequestError(extractApiErrorMessage(error, fallback), {
      status: error.response?.status,
      existingTemplateId: readExistingTemplateId(error.response?.data),
    });
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return new ApiRequestError(error.message);
  }

  return new ApiRequestError(fallback);
};

export const extractErrorMessage = (error: unknown, fallback = 'Something went wrong.'): string => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as {
      response?: {
        data?: {
          message?: string;
          error?: string;
          detail?: string;
        };
      };
    }).response;

    return (
      response?.data?.message ||
      response?.data?.error ||
      response?.data?.detail ||
      fallback
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};