import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';

import { PatientTabs, PatientTabsParamList } from './PatientTabs';
import { AppointmentDetailScreen } from '../screens/appointments/AppointmentDetailScreen';
import { CreateAppointmentScreen } from '../screens/appointments/CreateAppointmentScreen';
import { ResubmitAppointmentScreen } from '../screens/appointments/ResubmitAppointmentScreen';
import { ManageDependentsScreen } from '../screens/dependents/ManageDependentsScreen';
import { CreateDependentScreen } from '../screens/dependents/CreateDependentScreen';
import { EditDependentScreen } from '../screens/dependents/EditDependentScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';

export type AppStackParamList = {
  PatientTabs: NavigatorScreenParams<PatientTabsParamList> | undefined;
  AppointmentDetail: { appointmentId: number };
  CreateAppointment: { initialTarget?: 'self' | 'dependent'; dependentId?: number } | undefined;
  ResubmitAppointment: { appointmentId: number };
  ManageDependents: undefined;
  CreateDependent: undefined;
  EditDependent: { dependentId: number };
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="PatientTabs"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bgMain },
        animation: 'slide_from_right',
      }}>
      {/* Bottom Tabs Hub */}
      <Stack.Screen name="PatientTabs" component={PatientTabs} />

      {/* Appointment Modals & Sub-Screens */}
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
      <Stack.Screen
        name="CreateAppointment"
        component={CreateAppointmentScreen}
        options={{
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="ResubmitAppointment" component={ResubmitAppointmentScreen} />

      {/* Family Dependents Management */}
      <Stack.Screen name="ManageDependents" component={ManageDependentsScreen} />
      <Stack.Screen name="CreateDependent" component={CreateDependentScreen} />
      <Stack.Screen name="EditDependent" component={EditDependentScreen} />

      {/* In-App Notifications */}
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
};