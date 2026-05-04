// authStorage.ts
import type { AuthResponse, CurrentUserResponse } from "../types/auth";

const ACCESS_TOKEN_KEY = "epmsAccessToken";
const REFRESH_TOKEN_KEY = "epmsRefreshToken";
const USER_KEY = "epmsUser";

export const authStorage = {
  setSession(payload: AuthResponse) {
    localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);

    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        id: payload.id,
        email: payload.email,
        fullName: payload.fullName,
        employeeCode: payload.employeeCode,
        position: payload.position,
        roles: payload.roles ?? [],
        permissions: payload.permissions ?? [],
        dashboard: payload.dashboard,
        mustChangePassword: payload.mustChangePassword ?? false,
      })
    );
  },

  clearSession() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /** Persist profile fields from GET /api/auth/me (tokens unchanged). */
  setUserFromCurrent(payload: CurrentUserResponse) {
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        id: payload.id,
        email: payload.email,
        fullName: payload.fullName,
        employeeCode: payload.employeeCode,
        position: payload.position,
        roles: payload.roles ?? [],
        permissions: payload.permissions ?? [],
        dashboard: payload.dashboard,
        mustChangePassword: payload.mustChangePassword ?? false,
      })
    );
  },

  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      this.clearSession();
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getAccessToken();
  },
};