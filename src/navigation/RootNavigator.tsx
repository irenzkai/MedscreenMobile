import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isEmailVerified, isLoading, pendingPromotionData } = useAuth();
  const theme = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgMain }]}>
        <ActivityIndicator size="large" color={theme.brandAccent} />
      </View>
    );
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});