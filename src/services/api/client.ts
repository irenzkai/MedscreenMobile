import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '../../constants/config';

export const TOKEN_STORAGE_KEY = 'medscreen_patient_token';
export const USER_STORAGE_KEY = 'medscreen_patient_user';

// Create Axios client instance with 60s timeout for Render spin-up tolerance
export const apiClient: AxiosInstance = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 60000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Secure token storage helpers
export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('Error reading auth token from SecureStore:', error);
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.error('Error saving auth token to SecureStore:', error);
  }
}

export async function removeStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
  } catch (error) {
    console.error('Error deleting auth token from SecureStore:', error);
  }
}

// Global 401 Unauthorized listener to automatically reset auth state
type UnauthorizedListener = () => void;
let onUnauthorizedCallback: UnauthorizedListener | null = null;

export function registerUnauthorizedListener(callback: UnauthorizedListener): void {
  onUnauthorizedCallback = callback;
}

// Request Interceptor: Attach Bearer token automatically
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getStoredToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Unify error parsing and handle 401 sessions
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    if (error.response?.status === 401) {
      await removeStoredToken();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Standardized API Error Parser
 * Extracts Laravel validation bags, exception messages, and network errors
 */
export function extractErrorMessage(error: any): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data;

    // Laravel FormRequest validation errors { errors: { field: ["Error msg"] } }
    if (data.errors && typeof data.errors === 'object') {
      const firstFieldKey = Object.keys(data.errors)[0];
      if (firstFieldKey && Array.isArray(data.errors[firstFieldKey])) {
        return data.errors[firstFieldKey][0];
      }
    }

    // Default Laravel error message payload
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'A network error occurred. Please verify your internet connection and try again.';
}