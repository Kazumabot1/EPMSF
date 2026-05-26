
import api from './api';

export type ProfileImageResponse = {
  profileImageData?: string | null;
  profileImageType?: string | null;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

const unwrap = <T,>(payload: any, fallback: T): T => {
  if (payload?.data?.data !== undefined) return payload.data.data as T;
  if (payload?.data !== undefined) return payload.data as T;
  return fallback;
};

const cache = new Map<number, ProfileImageResponse>();

export const profileImageService = {
  async getUserProfileImage(userId: number): Promise<ProfileImageResponse> {
    if (!userId || userId <= 0) return {};

    if (cache.has(userId)) {
      return cache.get(userId) ?? {};
    }

    const response = await api.get<ApiEnvelope<ProfileImageResponse>>(
      `/profile-images/users/${userId}`,
    );

    const image = unwrap<ProfileImageResponse>(response, {});
    cache.set(userId, image);

    return image;
  },

  async getUserProfileImages(userIds: number[]): Promise<Record<number, ProfileImageResponse>> {
    const cleanIds = Array.from(
      new Set(userIds.filter((id) => Number.isFinite(id) && id > 0)),
    );

    if (cleanIds.length === 0) return {};

    const missingIds = cleanIds.filter((id) => !cache.has(id));

    if (missingIds.length > 0) {
      const response = await api.get<ApiEnvelope<Record<number, ProfileImageResponse>>>(
        '/profile-images/users',
        {
          params: {
            userIds: missingIds.join(','),
          },
        },
      );

      const images = unwrap<Record<number, ProfileImageResponse>>(response, {});

      Object.entries(images).forEach(([id, image]) => {
        cache.set(Number(id), image);
      });

      missingIds.forEach((id) => {
        if (!cache.has(id)) {
          cache.set(id, {});
        }
      });
    }

    return cleanIds.reduce<Record<number, ProfileImageResponse>>((result, id) => {
      result[id] = cache.get(id) ?? {};
      return result;
    }, {});
  },

  clearCache() {
    cache.clear();
  },
};
