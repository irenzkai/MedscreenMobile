import { apiClient } from './client';
import { User } from '../../types';
import { RegisterPayload } from '../../context/AuthContext';

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface UpdateProfilePayload {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  email: string;
  phone: string;
  birthdate: string;
  sex: 'Male' | 'Female';
  street: string;
  barangay: string;
  city: string;
  province: string;
}

export interface UpdatePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export const authApi = {
  // Login
  login: async (email: string, password: string) => {
    const response = await apiClient.post<{ token: string; user: User }>('/login', {
      email: email.trim(),
      password,
    });
    return response.data;
  },

  // Registration
  register: async (payload: RegisterPayload) => {
    const response = await apiClient.post<{ token: string; user: User; message?: string }>('/register', payload);
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await apiClient.post<{ message?: string }>('/logout');
    return response.data;
  },

  // Password Recovery
  forgotPassword: async (payload: ForgotPasswordPayload) => {
    const response = await apiClient.post<{ message?: string; status?: string }>('/forgot-password', payload);
    return response.data;
  },

  resetPassword: async (payload: ResetPasswordPayload) => {
    const response = await apiClient.post<{ message?: string; status?: string }>('/reset-password', payload);
    return response.data;
  },

  // Verification & OTP
  sendVerificationOtp: async (email?: string) => {
    const response = await apiClient.post<{ success: boolean; message?: string }>('/email/verification-otp', { email });
    return response.data;
  },

  verifyEmailOtp: async (otp: string, email?: string) => {
    const response = await apiClient.post<{ success: boolean; message?: string; email?: string }>('/verify-otp', {
      otp: otp.trim(),
      email,
    });
    return response.data;
  },

  changeUnverifiedEmail: async (email: string) => {
    const response = await apiClient.post<{ message?: string }>('/email/change', {
      email: email.trim().toLowerCase(),
    });
    return response.data;
  },

  // Account Reactivation
  sendReactivationOtp: async () => {
    const response = await apiClient.post<{ success: boolean; message?: string }>('/reactivate/resend-otp');
    return response.data;
  },

  verifyReactivationOtp: async (otp: string) => {
    const response = await apiClient.post<{ token: string; user: User; message?: string }>('/reactivate/verify-otp', {
      otp: otp.trim(),
    });
    return response.data;
  },

  // Profile Management
  getProfile: async () => {
    const response = await apiClient.get<{ user: User }>('/profile');
    return response.data;
  },

  updateProfile: async (payload: UpdateProfilePayload) => {
    const response = await apiClient.patch<{ success: boolean; user: User; message?: string }>('/profile', payload);
    return response.data;
  },

  updatePassword: async (payload: UpdatePasswordPayload) => {
    const response = await apiClient.put<{ success: boolean; message?: string }>('/profile/password', payload);
    return response.data;
  },

  deleteAccount: async (password: string) => {
    const response = await apiClient.delete<{ success: boolean; redirect?: string }>('/profile', {
      data: { password },
    });
    return response.data;
  },
};