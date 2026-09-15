import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { Typography, Spacing } from '../constants/theme';

import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { AppointmentsScreen } from '../screens/appointments/AppointmentsScreen';
import { ServicesScreen } from '../screens/services/ServicesScreen';
import { MedicalHistoryScreen } from '../screens/history/MedicalHistoryScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';

export type PatientTabsParamList = {
  Dashboard: undefined;
  Appointments: { initialTab?: 'self' | 'family' | 'bulk'; highlightId?: number } | undefined;
  Services: undefined;
  MedicalHistory: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<PatientTabsParamList>();

export const PatientTabs: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.brandAccent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.brandDark,
          borderTopColor: theme.borderSecondary,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: Typography.sizes.xs - 2,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse-outline';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Services') {
            iconName = focused ? 'flask' : 'flask-outline';
          } else if (route.name === 'MedicalHistory') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }

          return (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons name={iconName} size={22} color={color} />
            </View>
          );
        },
      })}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{ tabBarLabel: 'Bookings' }}
      />
      <Tab.Screen
        name="Services"
        component={ServicesScreen}
        options={{ tabBarLabel: 'Tests' }}
      />
      <Tab.Screen
        name="MedicalHistory"
        component={MedicalHistoryScreen}
        options={{ tabBarLabel: 'History' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  activeIconWrap: {
    transform: [{ translateY: -1 }],
  },
});