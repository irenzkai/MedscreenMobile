import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { LoadingScreen } from '../components/common/LoadingScreen';

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isEmailVerified, isLoading, pendingPromotionData } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  // If a promotion was triggered, mount directly to Register with prefilled params
  const unauthenticatedInitialRoute = pendingPromotionData ? 'Register' : 'Login';
  const navKey = !isAuthenticated
    ? pendingPromotionData
      ? 'auth-promote'
      : 'auth-guest'
    : !isEmailVerified
    ? 'auth-unverified'
    : 'app-patient';

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthNavigator
          key={navKey}
          initialRouteName={unauthenticatedInitialRoute}
          initialParams={
            pendingPromotionData
              ? {
                  Register: {
                    promoteId: pendingPromotionData.promoteId,
                    initialData: pendingPromotionData.initialData,
                  },
                }
              : undefined
          }
        />
      ) : !isEmailVerified ? (
        <AuthNavigator key={navKey} initialRouteName="VerifyAccount" />
      ) : (
        <AppNavigator key={navKey} />
      )}
    </NavigationContainer>
  );
};