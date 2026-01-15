
import { User, UserRole, AuthResponse, VehicleType } from '../types';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/auth`;
const TOKEN_KEY = 'villagelink_token';
const USER_KEY = 'villagelink_user';

export const registerUser = async (name: string, role: UserRole, password: string, email: string, phone: string, capacity?: number, vehicleType?: VehicleType, address?: string, pincode?: string): Promise<AuthResponse> => {
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, password, email, phone, vehicleCapacity: capacity, vehicleType, address, pincode })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data;
    } else {
      throw new Error(data.error || "Registration failed");
    }
  } catch (e: any) {
    return { success: false, message: e.message || "Network Error: Unable to reach server." };
  }
};

export const loginUser = async (loginId: string, password: string): Promise<AuthResponse> => {
  const cleanLoginId = loginId.trim();
  const cleanPassword = password.trim();

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: cleanLoginId, password: cleanPassword })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data;
    } else {
      return { success: false, message: data.error || "Invalid ID or Password" };
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
    return await res.json();
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
    return await res.json();
  } catch (e: any) {
    return { error: e.message };
  }
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};
