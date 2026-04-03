
import { User, UserRole, AuthResponse, VehicleType } from '@villagelink/shared';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/auth`;
const TOKEN_KEY = 'villagelink_token';
const USER_KEY = 'villagelink_user';

/** Read JSON body safely — Vite proxy returns empty/non-JSON 500 when API (port 3001) is down. */
async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text?.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: 'Invalid response from server' };
  }
}

function authErrorMessage(res: Response, data: Record<string, unknown>, fallback: string): string {
  const err = data.error;
  const msg = data.message;
  if (typeof err === 'string' && err) return err;
  if (typeof msg === 'string' && msg) return msg;
  if (res.status >= 502 || (res.status === 500 && !textHasJsonKeys(data))) {
    return 'Cannot reach API (backend). Start it on port 3001: npm run dev:backend — or use npm run dev:full with API + Vite.';
  }
  if (res.status === 503) return 'Service unavailable (often database offline). Check the API terminal logs.';
  if (res.status >= 500) return fallback;
  return fallback;
}

function textHasJsonKeys(data: Record<string, unknown>): boolean {
  return Object.keys(data).length > 0;
}

export const registerUser = async (name: string, role: UserRole, password: string, email: string, phone: string, capacity?: number, vehicleType?: VehicleType, address?: string, pincode?: string): Promise<AuthResponse> => {
  try {
    const endpoint = role === 'PASSENGER' ? `${API_URL}/register/user` : `${API_URL}/register/provider`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, password, email, phone, vehicleCapacity: capacity, vehicleType, address, pincode })
    });

    const data = await readApiJson(res);

    if (res.ok && data.success) {
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token as string);
      if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data as AuthResponse;
    } else {
      throw new Error(authErrorMessage(res, data, 'Registration failed'));
    }
  } catch (e: any) {
    return { success: false, message: e.message || "Network Error: Unable to reach server." };
  }
};

export const loginUser = async (loginId: string, password: string, expectedPanelType?: string): Promise<AuthResponse> => {
  const cleanLoginId = loginId.trim();
  const cleanPassword = password.trim();

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: cleanLoginId, password: cleanPassword, expectedPanelType })
    });

    const data = await readApiJson(res);

    if (res.ok && data.success) {
      localStorage.setItem(TOKEN_KEY, data.token as string);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data as AuthResponse;
    } else {
      return {
        success: false,
        message: authErrorMessage(res, data, 'Invalid ID or Password')
      };
    }
  } catch (e: any) {
    return { success: false, message: e.message || "Network Error: Unable to reach server." };
  }
};

export const loginViaFirebase = async (idToken: string): Promise<AuthResponse> => {
  try {
    const res = await fetch(`${API_URL}/login-firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    const data = await readApiJson(res);

    if (res.ok && data.success) {
      localStorage.setItem(TOKEN_KEY, data.token as string);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data as AuthResponse;
    } else {
      return { success: false, message: authErrorMessage(res, data, 'Firebase Login Failed') };
    }
  } catch (e: any) {
    return { success: false, message: e.message || "Network Error: Unable to reach server." };
  }
};

export const registerViaFirebase = async (idToken: string, name: string, role: UserRole, email?: string, vehicleCapacity?: number, vehicleType?: VehicleType, address?: string, pincode?: string): Promise<AuthResponse> => {
  try {
    const res = await fetch(`${API_URL}/register-firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, name, role, email, vehicleCapacity, vehicleType, address, pincode })
    });

    const data = await readApiJson(res);

    if (res.ok && data.success) {
      localStorage.setItem(TOKEN_KEY, data.token as string);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data as AuthResponse;
    } else {
      return { success: false, message: authErrorMessage(res, data, 'Firebase Registration Failed') };
    }
  } catch (e: any) {
    return { success: false, message: e.message || "Network Error: Unable to reach server." };
  }
};

export const logoutUser = async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      await fetch(`${API_URL}/logout`, { method: 'POST', headers: { 'Authorization': token } });
    } catch (e) { }
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const requestPasswordReset = async (identifier: string) => {
  try {
    const res = await fetch(`${API_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });
    return await readApiJson(res);
  } catch (e: any) {
    return { error: e.message };
  }
};

export const resetPassword = async (identifier: string, token: string, newPassword: string) => {
  try {
    const res = await fetch(`${API_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, token, newPassword })
    });
    return await readApiJson(res);
  } catch (e: any) {
    return { error: e.message };
  }
};

export const resetPasswordViaFirebase = async (idToken: string, newPassword: string) => {
  try {
    const res = await fetch(`${API_URL}/reset-password-firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, newPassword })
    });
    return await readApiJson(res);
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};
