import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { VerifyAccountScreen } from '../screens/auth/VerifyAccountScreen';
import { ReactivateAccountScreen } from '../screens/auth/ReactivateAccountScreen';
import { Sex } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Register:
    | {
        promoteId?: string;
        shadowAppointmentId?: string;
        initialData?: {
          firstName?: string;
          middleName?: string;
          lastName?: string;
          suffix?: string;
          birthdate?: string;
          sex?: Sex;
          province?: string;
          city?: string;
          barangay?: string;
          street?: string;
        };
      }
    | undefined;
  ForgotPassword: undefined;
  VerifyAccount: { email?: string } | undefined;
  ReactivateAccount: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC<{
  initialRouteName?: keyof AuthStackParamList;
  initialParams?: Partial<{ [K in keyof AuthStackParamList]: AuthStackParamList[K] }>;
}> = ({ initialRouteName = 'Login', initialParams }) => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bgMain },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        initialParams={initialParams?.Register}
      />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VerifyAccount" component={VerifyAccountScreen} />
      <Stack.Screen name="ReactivateAccount" component={ReactivateAccountScreen} />
    </Stack.Navigator>
  );
};