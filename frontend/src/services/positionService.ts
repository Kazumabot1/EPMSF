import { isAxiosError } from 'axios';
import api from './api';
import type {
  PositionLevelRequest,
  PositionLevelResponse,
  PositionRequest,
  PositionResponse,
} from '../types/position';

const POSITION_LEVEL_ENDPOINT = '/api/position-levels';
const POSITION_ENDPOINT = '/api/positions';

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === 'string') {
      return data;
    }

    if (data && typeof data === 'object') {
      const maybeMessage = (data as { message?: unknown }).message;
      if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
        return maybeMessage;
      }
    }
  }

  return fallback;
};

export const positionService = {
  async createPositionLevel(payload: PositionLevelRequest): Promise<PositionLevelResponse> {
    try {
      const response = await api.post<PositionLevelResponse>(POSITION_LEVEL_ENDPOINT, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create position level.'));
    }
  },

  async getPositionLevels(): Promise<PositionLevelResponse[]> {
    try {
      const response = await api.get<PositionLevelResponse[]>(POSITION_LEVEL_ENDPOINT);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load position levels.'));
    }
  },

  async createPosition(payload: PositionRequest): Promise<PositionResponse> {
    try {
      const response = await api.post<PositionResponse>(POSITION_ENDPOINT, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create position.'));
    }
  },

  async getPositions(): Promise<PositionResponse[]> {
    try {
      const response = await api.get<PositionResponse[]>(POSITION_ENDPOINT);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load positions.'));
    }
  },

  async updatePosition(id: number, payload: PositionRequest): Promise<PositionResponse> {
    try {
      const response = await api.put<PositionResponse>(`${POSITION_ENDPOINT}/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update position.'));
    }
  },
};
