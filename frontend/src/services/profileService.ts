import api from './api';

export interface UserProfile {
  userId: number;
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  profileImageData?: string | null;
  profileImageType?: string | null;
  role?: string | null;
  dashboard?: string | null;
  position?: string | null;
  employeeCode?: string | null;
  employeeId?: number | null;
  departmentId?: number | null;
  departmentName?: string | null;
}

export interface UpdateProfilePayload {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  profileImageData?: string;
  profileImageType?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const unwrap = <T,>(response: any, fallback: T): T => {
  return response?.data?.data ?? response?.data ?? fallback;
};

export const profileService = {
  async getMyProfile(): Promise<UserProfile> {
    const response = await api.get('/profile/me');
    return unwrap<UserProfile>(response, {} as UserProfile);
  },

  async updateMyProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    const response = await api.put('/profile/me', payload);
    return unwrap<UserProfile>(response, {} as UserProfile);
  },

  async changeMyPassword(payload: ChangePasswordPayload): Promise<void> {
    await api.put('/profile/me/password', payload);
  },
};