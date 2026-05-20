import { isAxiosError } from 'axios';
import api from './api';
import type {
  PositionDetailResponse,
  PositionLevelRequest,
  PositionLevelResponse,
  PositionRequest,
  PositionResponse,
} from '../types/position';

const POSITION_LEVEL_ENDPOINT = '/position-levels';
const POSITION_ENDPOINT = '/positions';

const unwrap = <T,>(response: { data: any }): T => {
  const body = response.data;

  if (body && typeof body === 'object' && 'data' in body) {
    return body.data as T;
  }

  return body as T;
};

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === 'string') {
      return data;
    }

    if (data && typeof data === 'object') {
      const maybeMessage = (data as { message?: unknown; error?: unknown }).message;
      if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
        return maybeMessage;
      }

      const maybeError = (data as { error?: unknown }).error;
      if (typeof maybeError === 'string' && maybeError.trim().length > 0) {
        return maybeError;
      }
    }
  }

  return fallback;
};

export const positionService = {
  async createPositionLevel(payload: PositionLevelRequest): Promise<PositionLevelResponse> {
    try {
      const response = await api.post<PositionLevelResponse>(POSITION_LEVEL_ENDPOINT, payload);
      return unwrap<PositionLevelResponse>(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create position level.'));
    }
  },

  async getPositionLevels(): Promise<PositionLevelResponse[]> {
    try {
      const response = await api.get<PositionLevelResponse[]>(POSITION_LEVEL_ENDPOINT);
      return unwrap<PositionLevelResponse[]>(response) ?? [];
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load position levels.'));
    }
  },

  async updatePositionLevel(
    id: number,
    payload: PositionLevelRequest,
  ): Promise<PositionLevelResponse> {
    try {
      const response = await api.put<PositionLevelResponse>(
        `${POSITION_LEVEL_ENDPOINT}/${id}`,
        payload,
      );
      return unwrap<PositionLevelResponse>(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update position level.'));
    }
  },

  async deactivatePositionLevel(id: number, reason: string): Promise<void> {
    try {
      await api.delete(`${POSITION_LEVEL_ENDPOINT}/${id}`, { data: { reason } });
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to deactivate position level.'));
    }
  },

  async createPosition(payload: PositionRequest): Promise<PositionResponse> {
    try {
      const response = await api.post<PositionResponse>(POSITION_ENDPOINT, payload);
      return unwrap<PositionResponse>(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create position.'));
    }
  },

  async getPositions(): Promise<PositionResponse[]> {
    try {
      const response = await api.get<PositionResponse[]>(POSITION_ENDPOINT);
      return unwrap<PositionResponse[]>(response) ?? [];
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load positions.'));
    }
  },

  async getPositionDetails(id: number): Promise<PositionDetailResponse> {
    try {
      const response = await api.get<PositionDetailResponse>(`${POSITION_ENDPOINT}/${id}/details`);
      return unwrap<PositionDetailResponse>(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load position details.'));
    }
  },

  async updatePosition(id: number, payload: PositionRequest): Promise<PositionResponse> {
    try {
      const response = await api.put<PositionResponse>(`${POSITION_ENDPOINT}/${id}`, payload);
      return unwrap<PositionResponse>(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update position.'));
    }
  },
};