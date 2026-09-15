import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, Sex } from '../types';
import {
  apiClient,
  extractErrorMessage,
  getStoredToken,
  registerUnauthorizedListener,
  removeStoredToken,
  setStoredToken,
  USER_STORAGE_KEY,
} from '../services/api/client';

export interface RegisterPayload {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  birthdate: string;
  sex: Sex;
  province: string;
  city: string;
  barangay: string;
  street: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  promoted_dependent_id?: number | null;
  shadow_appointment_id?: number | null;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  deactivated?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  sendOtp: (email?: string) => Promise<AuthResponse>;
  verifyOtp: (otp: string, email?: string) => Promise<AuthResponse>;
  changeUnverifiedEmail: (newEmail: string) => Promise<AuthResponse>;
  sendReactivationOtp: () => Promise<AuthResponse>;
  verifyReactivationOtp: (otp: string) => Promise<AuthResponse>;
  refreshUserProfile: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session on app cold boot
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await getStoredToken();
        const storedUserJson = await SecureStore.getItemAsync(USER_STORAGE_KEY);

        if (storedToken && storedUserJson) {
          setToken(storedToken);
          setUser(JSON.parse(storedUserJson));
        }
      } catch (error) {
        console.error('Session restoration error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Register 401 callback to reset state when server rejects token
    registerUnauthorizedListener(() => {
      setUser(null);
      setToken(null);
    });
  }, []);

  // Persist updated user object to local secure storage
  const persistUser = async (updatedUser: User | null) => {
    setUser(updatedUser);
    if (updatedUser) {
      await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    } else {
      await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
    }
  };

  /**
   * Log In patient
   */
  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/login', {
        email: email.trim(),
        password,
      });

      const { token: receivedToken, user: receivedUser } = response.data;

      if (receivedToken && receivedUser) {
        await setStoredToken(receivedToken);
        await persistUser(receivedUser);
        setToken(receivedToken);
        return { success: true };
      }

      return {
        success: false,
        message: response.data.message || 'Login failed. Please check your credentials.',
      };
    } catch (error: any) {
      // Check for soft-deleted / deactivated user response
      if (
        error.response?.data?.errors?.deactivated ||
        error.response?.data?.deactivated
      ) {
        return {
          success: false,
          deactivated: true,
          message:
            error.response?.data?.errors?.deactivated?.[0] ||
            'Your account is currently deactivated. You must reactivate it to log in.',
        };
      }

      return {
        success: false,
        message: extractErrorMessage(error),
      };
    }
  };

  /**
   * Register new patient account
   */
  const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/register', payload);
      const { token: receivedToken, user: receivedUser } = response.data;

      if (receivedToken && receivedUser) {
        await setStoredToken(receivedToken);
        await persistUser(receivedUser);
        setToken(receivedToken);
        return { success: true };
      }

      return {
        success: true,
        message: response.data?.message || 'Registration completed. Please verify your email.',
      };
    } catch (error) {
      return {
        success: false,
        message: extractErrorMessage(error),
      };
    }
  };

  /**
   * Dispatches a 6-digit email OTP for verification
   */
  const sendOtp = async (email?: string): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/email/verification-otp', {
        email: email || user?.email,
      });

      return {
        success: true,
        message: response.data?.message || 'Verification code sent to your email.',
      };
    } catch (error) {
      return {
        success: false,
        message: extractErrorMessage(error),
      };
    }
  };

  /**
   * Verifies the 6-digit OTP code entered by the user
   */
  const verifyOtp = async (otp: string, email?: string): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/verify-otp', {
        otp: otp.trim(),
        email: email || user?.email,
      });

      if (response.data?.success) {
        // Refresh local user verification state
        if (user) {
          const verifiedUser: User = {
            ...user,
            email_verified_at: new Date().toISOString(),
          };
          await persistUser(verifiedUser);
        }
        return {
          success: true,
          message: response.data?.message || 'Your email has been successfully verified!',
        };
      }

      return {
        success: false,
        message: response.data?.message || 'The entered code is incorrect or expired.',
      };
    } catch (error) {
      return {
        success: false,
        message: extractErrorMessage(error),
      };
    }
  };

  /**
   * Correct unverified email directly from the verification hub
   */
  const changeUnverifiedEmail = async (newEmail: string): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/email/change', {
        email: newEmail.trim().toLowerCase(),
      });

      if (user) {
        const updatedUser: User = {
          ...user,
          email: newEmail.trim().toLowerCase(),
          email_verified_at: null,
        };
        await persistUser(updatedUser);
      }

      return {
        success: true,
        message: response.data?.message || 'Email updated. A new code has been dispatched.',
      };
    } catch (error) {
      return {
        success: false,
        message: extractErrorMessage(error),
      };
    }
  };

  /**
   * Resend Reactivation OTP for soft-deleted account
   */
  const sendReactivationOtp = async (): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/reactivate/resend-otp');
      return {
        success: true,
        message: response.data?.message || 'Reactivation code sent to your email.',
      };
    } catch (error) {
      return {
        success: false,
        message: extractErrorMessage(error),
      };
    }
  };

  /**
   * Verify Reactivation OTP and restore account session
   */
  const verifyReactivationOtp = async (otp: string): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/reactivate/verify-otp', {
        otp: otp.trim(),
      });

      const { token: receivedToken, user: receivedUser } = response.data;
      if (receivedToken && receivedUser) {
        await setStoredToken(receivedToken);
        await persistUser(receivedUser);
        setToken(receivedToken);
      }

      return {
        success: true,
        message: response.data?.message || 'Welcome back! Your account has been reactivated.',
      };
    } catch (error) {
      return {
        success: false,
        message: extractErrorMessage(error),
      };
    }
  };

  /**
   * Fetch latest profile from backend database
   */
  const refreshUserProfile = async (): Promise<void> => {
    try {
      const response = await apiClient.get('/profile');
      if (response.data?.user) {
        await persistUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to sync profile info:', error);
    }
  };

  /**
   * Log out patient
   */
  const logout = async (): Promise<void> => {
    try {
      await apiClient.post('/logout');
    } catch (error) {
      // Proceed with local cleanup regardless of network result
    } finally {
      await removeStoredToken();
      setUser(null);
      setToken(null);
    }
  };

  const isAuthenticated = !!token && !!user;
  const isEmailVerified = !!user?.email_verified_at;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isEmailVerified,
        login,
        register,
        logout,
        sendOtp,
        verifyOtp,
        changeUnverifiedEmail,
        sendReactivationOtp,
        verifyReactivationOtp,
        refreshUserProfile,
        setUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};