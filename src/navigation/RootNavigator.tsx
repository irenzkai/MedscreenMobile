import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isEmailVerified, isLoading } = useAuth();
  const theme = useTheme();

  // App Cold Boot Loading Indicator
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgMain }]}>
        <ActivityIndicator size="large" color={theme.brandAccent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        // Unauthenticated Guest Flow
        <AuthNavigator initialRouteName="Login" />
      ) : !isEmailVerified ? (
        // Authenticated but Email Unverified Guard
        <AuthNavigator initialRouteName="VerifyAccount" />
      ) : (
        // Authenticated Patient Application
        <AppNavigator />
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