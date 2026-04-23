const ACCESS_TOKEN_KEY = 'epmsAccessToken';
const REFRESH_TOKEN_KEY = 'epmsRefreshToken';
const USER_KEY = 'epmsUser';

type SessionPayload = {
  accessToken: string;
  refreshToken: string;
  dashboard: string;
  fullName: string;
  email: string;
  position?: string;
  employeeCode?: string;
};

export const authStorage = {
  setSession(payload: SessionPayload) {
    localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);

    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        dashboard: payload.dashboard,
        fullName: payload.fullName,
        email: payload.email,
        position: payload.position ?? '',
        employeeCode: payload.employeeCode ?? '',
      })
    );
  },

  clearSession() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
      return null;
    }
  },

  isLoggedIn() {
    return !!localStorage.getItem(ACCESS_TOKEN_KEY);
  },
};