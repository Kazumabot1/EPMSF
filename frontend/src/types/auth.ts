export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  id: number;
  email: string;
  fullName: string;
  employeeCode: string;
  position: string;
  roles: string[];
  permissions: string[];
  dashboard: string;
}

export interface CurrentUserResponse {
  id: number;
  email: string;
  fullName: string;
  employeeCode: string;
  position: string;
  roles: string[];
  permissions: string[];
  dashboard: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}