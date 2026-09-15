import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, Sex, Dependent } from '../types';
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
  unverified?: boolean;
}

export interface PendingPromotionData {
  promoteId: string;
  initialData: {
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    birthdate: string;
    sex: Sex;
    province: string;
    city: string;
    barangay: string;
    street: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  pendingPromotionData: PendingPromotionData | null;
  clearPendingPromotion: () => void;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  logoutAndRegister: (dependent: Dependent, parentUser?: User | null) => Promise<void>;
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
  const [pendingPromotionData, setPendingPromotionData] = useState<PendingPromotionData | null>(null);

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

    registerUnauthorizedListener(() => {
      setUser(null);
      setToken(null);
    });
  }, []);

  const persistUser = async (updatedUser: User | null) => {
    setUser(updatedUser);
    if (updatedUser) {
      await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    } else {
      await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
    }
  };

  const clearPendingPromotion = () => {
    setPendingPromotionData(null);
  };

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/login', {
        email: email.trim(),
        password,
      });
      const { token: receivedToken, user: receivedUser, unverified } = response.data;

      if (receivedToken && receivedUser) {
        await setStoredToken(receivedToken);
        await persistUser(receivedUser);
        setToken(receivedToken);

        const isUnverified = unverified || !receivedUser.email_verified_at;
        return {
          success: true,
          unverified: isUnverified,
        };
      }

      return {
        success: false,
        message: response.data.message || 'Login failed. Please check your credentials.',
      };
    } catch (error: any) {
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

  const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/register', payload);
      const { token: receivedToken, user: receivedUser } = response.data;
      if (receivedToken && receivedUser) {
        await setStoredToken(receivedToken);
        await persistUser(receivedUser);
        setToken(receivedToken);
        clearPendingPromotion();
        return { success: true, unverified: true };
      }
      clearPendingPromotion();
      return {
        success: true,
        unverified: true,
        message: response.data?.message || 'Registration completed. Please verify your email.',
      };
    } catch (error) {
      return {
        success: false,
        message: extractErrorMessage(error),
      };
    }
  };

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

  const verifyOtp = async (otp: string, email?: string): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/verify-otp', {
        otp: otp.trim(),
        email: email || user?.email,
      });

      if (response.data?.success) {
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

  /**
   * Promotes a dependent to an independent account by saving bio-data, logging out the parent,
   * and queuing the registration view with prefilled parameters.
   */
  const logoutAndRegister = async (dep: Dependent, parentUser?: User | null): Promise<void> => {
    const promotionPayload: PendingPromotionData = {
      promoteId: String(dep.id),
      initialData: {
        firstName: dep.first_name || '',
        middleName: dep.middle_name && dep.middle_name !== 'N/A' ? dep.middle_name : '',
        lastName: dep.last_name || '',
        suffix: dep.suffix || '',
        birthdate: dep.birthdate ? dep.birthdate.split('T')[0] : '',
        sex: dep.sex || 'Male',
        province: dep.province || parentUser?.province || '',
        city: dep.city || parentUser?.city || '',
        barangay: dep.barangay || parentUser?.barangay || '',
        street: dep.street || parentUser?.street || '',
      },
    };

    setPendingPromotionData(promotionPayload);
    await logout();
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
        pendingPromotionData,
        clearPendingPromotion,
        login,
        register,
        logout,
        logoutAndRegister,
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