import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PatientTabsParamList } from '../../navigation/PatientTabs';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { appointmentsApi } from '../../services/api/appointments';
import { servicesApi } from '../../services/api/services';
import { Appointment, Service } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  formatCurrency,
  formatDate,
  formatTimeSlot,
  formatPatientName,
} from '../../utils/formatters';
import { alertBulkWebExclusive } from '../../utils/externalLinks';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<PatientTabsParamList, 'Dashboard'>,
  NativeStackNavigationProp<AppStackParamList>
>;

export const DashboardScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [popularServices, setPopularServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clinical clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      const [appData, svcList] = await Promise.all([
        appointmentsApi.getAppointments(),
        servicesApi.getServices(),
      ]);

      // Combine and get latest 5 appointments
      const combined = [...appData.self, ...appData.dependents].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRecentAppointments(combined.slice(0, 5));

      // Select popular recommended services
      const recommended = svcList.slice(0, 3);
      setPopularServices(recommended);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      {/* Top Clinical Header */}
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: Math.max(insets.top + Spacing.xs, 16),
            backgroundColor: theme.brandDark,
            borderBottomColor: theme.borderSecondary,
          },
        ]}>
        <View style={styles.headerContent}>
          <View style={styles.brandingRow}>
            <View style={[styles.logoIconCircle, { borderColor: theme.brandAccent }]}>
              <Ionicons name="fitness" size={20} color={theme.brandAccent} />
            </View>
            <Text style={styles.brandTitle}>
              MED<Text style={{ color: theme.brandAccent }}>SCREEN</Text>
            </Text>
          </View>

          {/* Notifications Trigger */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={[styles.notifBtn, { backgroundColor: theme.bgCard }]}
            hitSlop={8}>
            <Ionicons name="notifications-outline" size={20} color={theme.brandAccent} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.brandAccent}
            colors={[theme.brandAccent]}
          />
        }>
        {/* Welcome & Live Clock Banner */}
        <Card style={styles.welcomeCard}>
          <View style={styles.welcomeRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.welcomeSub, { color: theme.brandAccent }]}>PATIENT CARE PORTAL</Text>
              <Text style={[styles.welcomeTitle, { color: theme.textMain }]}>
                Welcome, <Text style={{ color: theme.brandAccent }}>{user?.first_name || 'Patient'}</Text>
              </Text>
              <Text style={[styles.welcomeDesc, { color: theme.textMuted }]}>
                Access real-time laboratory schedules and health records.
              </Text>
            </View>
            <View style={[styles.clockBox, { backgroundColor: theme.surfaceSubtle }]}>
              <Text style={[styles.clockDate, { color: theme.textMuted }]}>{formattedDate}</Text>
              <Text style={[styles.clockTime, { color: theme.brandAccent }]}>{formattedTime}</Text>
            </View>
          </View>
        </Card>

        {/* Quick Action Clinical Cards */}
        <Text style={[styles.sectionHeading, { color: theme.textMain }]}>Quick Actions</Text>
        <View style={styles.actionCardsGrid}>
          {/* Card 1: New Booking */}
          <Card
            style={styles.actionCard}
            onPress={() => navigation.navigate('CreateAppointment')}>
            <View style={[styles.actionIconWrap, { backgroundColor: theme.surfaceSubtle }]}>
              <Ionicons name="calendar-outline" size={24} color={theme.brandAccent} />
            </View>
            <Text style={[styles.actionCardTitle, { color: theme.textMain }]}>New Booking</Text>
            <Text style={[styles.actionCardDesc, { color: theme.textMuted }]}>
              Schedule laboratory tests for yourself or family.
            </Text>
            <View style={styles.actionArrow}>
              <Text style={[styles.actionCardLink, { color: theme.brandAccent }]}>Book Now</Text>
              <Ionicons name="arrow-forward" size={14} color={theme.brandAccent} />
            </View>
          </Card>

          {/* Card 2: Result Archive */}
          <Card
            style={styles.actionCard}
            onPress={() => navigation.navigate('MedicalHistory')}>
            <View style={[styles.actionIconWrap, { backgroundColor: theme.surfaceSubtle }]}>
              <Ionicons name="document-text-outline" size={24} color={theme.brandAccent} />
            </View>
            <Text style={[styles.actionCardTitle, { color: theme.textMain }]}>Result Archive</Text>
            <Text style={[styles.actionCardDesc, { color: theme.textMuted }]}>
              Securely view and preview your diagnostic results.
            </Text>
            <View style={styles.actionArrow}>
              <Text style={[styles.actionCardLink, { color: theme.brandAccent }]}>View History</Text>
              <Ionicons name="arrow-forward" size={14} color={theme.brandAccent} />
            </View>
          </Card>

          {/* Card 3: Dependents */}
          <Card
            style={styles.actionCard}
            onPress={() => navigation.navigate('ManageDependents')}>
            <View style={[styles.actionIconWrap, { backgroundColor: theme.surfaceSubtle }]}>
              <Ionicons name="people-outline" size={24} color={theme.brandAccent} />
            </View>
            <Text style={[styles.actionCardTitle, { color: theme.textMain }]}>Dependents</Text>
            <Text style={[styles.actionCardDesc, { color: theme.textMuted }]}>
              Manage profiles and bookings for minor children.
            </Text>
            <View style={styles.actionArrow}>
              <Text style={[styles.actionCardLink, { color: theme.brandAccent }]}>Manage</Text>
              <Ionicons name="arrow-forward" size={14} color={theme.brandAccent} />
            </View>
          </Card>

          {/* Card 4: Bulk Appointments (Locked - Web Exclusive) */}
          <Card
            style={styles.actionCard}
            onPress={alertBulkWebExclusive}>
            <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(255, 193, 7, 0.1)' }]}>
              <Ionicons name="business-outline" size={24} color={theme.warning} />
            </View>
            <View style={styles.lockedRow}>
              <Text style={[styles.actionCardTitle, { color: theme.textMain }]}>Corporate / Bulk</Text>
              <Ionicons name="lock-closed" size={12} color={theme.warning} />
            </View>
            <Text style={[styles.actionCardDesc, { color: theme.textMuted }]}>
              Batch bookings are exclusive to our web portal.
            </Text>
            <View style={styles.actionArrow}>
              <Text style={[styles.actionCardLink, { color: theme.warning }]}>Web Only</Text>
              <Ionicons name="open-outline" size={14} color={theme.warning} />
            </View>
          </Card>
        </View>

        {/* Recent Inquiries / Appointments Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: theme.textMain, marginBottom: 0 }]}>
            Recent Inquiries
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
            <Text style={[styles.viewAllText, { color: theme.brandAccent }]}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={theme.brandAccent} style={{ marginVertical: Spacing.lg }} />
        ) : recentAppointments.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              No recent appointment inquiries found.
            </Text>
            <Button
              title="Book Your First Appointment"
              size="sm"
              onPress={() => navigation.navigate('CreateAppointment')}
              style={{ marginTop: Spacing.sm }}
            />
          </Card>
        ) : (
          recentAppointments.map((app) => (
            <Card
              key={app.id}
              style={styles.recentItemCard}
              onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: app.id })}>
              <View style={styles.recentItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recentPatientName, { color: theme.textMain }]} numberOfLines={1}>
                    {formatPatientName(
                      app.patient_first_name,
                      app.patient_middle_name,
                      app.patient_last_name,
                      app.patient_suffix
                    )}
                  </Text>
                  <Text style={[styles.recentTests, { color: theme.textMuted }]} numberOfLines={1}>
                    {app.services?.map((s) => s.name).join(', ') || 'Diagnostic Tests'}
                  </Text>
                  <Text style={[styles.recentSchedule, { color: theme.brandAccent }]}>
                    {formatDate(app.appointment_date)} at {formatTimeSlot(app.time_slot)}
                  </Text>
                </View>
                <View style={styles.recentItemRight}>
                  <Badge status={app.status} isExpired={app.status === 'expired'} size="sm" />
                  <Text style={[styles.recentPrice, { color: theme.textMain }]}>
                    {formatCurrency(app.payment_amount || 0)}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}

        {/* Recommended Tests Catalog Section */}
        <View style={[styles.sectionHeaderRow, { marginTop: Spacing.lg }]}>
          <Text style={[styles.sectionHeading, { color: theme.textMain, marginBottom: 0 }]}>
            Recommended Tests
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Services')}>
            <Text style={[styles.viewAllText, { color: theme.brandAccent }]}>BROWSE ALL</Text>
          </TouchableOpacity>
        </View>

        {popularServices.map((svc) => (
          <Card key={svc.id} style={styles.recommendedCard}>
            <View style={styles.recHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recName, { color: theme.textMain }]}>{svc.name.toUpperCase()}</Text>
                <Text style={[styles.recDesc, { color: theme.textMuted }]} numberOfLines={2}>
                  {svc.description}
                </Text>
              </View>
              <Text style={[styles.recPrice, { color: theme.brandAccent }]}>
                {formatCurrency(svc.price)}
              </Text>
            </View>
            <View style={styles.recFooterRow}>
              <View style={[styles.sampleBadge, { backgroundColor: theme.surfaceSubtle }]}>
                <Ionicons name="water-outline" size={12} color={theme.danger} />
                <Text style={[styles.sampleBadgeText, { color: theme.textMuted }]}>
                  {svc.sample_required || 'Blood'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('CreateAppointment')}
                style={[styles.bookTestBtn, { backgroundColor: theme.brandAccent }]}>
                <Text style={styles.bookTestBtnText}>BOOK TEST</Text>
                <Ionicons name="chevron-forward" size={14} color="#1C232D" />
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topHeader: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  brandingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { padding: Spacing.md },
  welcomeCard: { padding: Spacing.lg, marginBottom: Spacing.lg },
  welcomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeSub: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  welcomeTitle: { fontSize: Typography.sizes.lg, fontWeight: '900', marginTop: 2 },
  welcomeDesc: { fontSize: Typography.sizes.xs, marginTop: 4, lineHeight: 16 },
  clockBox: { padding: Spacing.sm, borderRadius: BorderRadius.md, alignItems: 'flex-end', marginLeft: Spacing.sm },
  clockDate: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  clockTime: { fontSize: Typography.sizes.sm, fontWeight: '900', marginTop: 2 },
  sectionHeading: {
    fontSize: Typography.sizes.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  actionCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionCard: { width: '48%', padding: Spacing.md },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCardTitle: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
  actionCardDesc: { fontSize: 10, marginTop: 4, lineHeight: 14, minHeight: 28 },
  actionArrow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  actionCardLink: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  viewAllText: { fontSize: Typography.sizes.xs, fontWeight: '800', letterSpacing: 0.5 },
  emptyCard: { padding: Spacing.lg, alignItems: 'center', justifyContent: 'center', marginVertical: Spacing.xs },
  emptyText: { fontSize: Typography.sizes.xs, marginTop: Spacing.xs, textAlign: 'center' },
  recentItemCard: { marginBottom: Spacing.xs, padding: Spacing.md },
  recentItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recentPatientName: { fontSize: Typography.sizes.sm, fontWeight: '800', textTransform: 'uppercase' },
  recentTests: { fontSize: Typography.sizes.xs - 1, marginTop: 2 },
  recentSchedule: { fontSize: Typography.sizes.xs - 1, fontWeight: '700', marginTop: 4 },
  recentItemRight: { alignItems: 'flex-end', gap: 6 },
  recentPrice: { fontSize: Typography.sizes.xs, fontWeight: '800' },
  recommendedCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  recHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recName: { fontSize: Typography.sizes.sm, fontWeight: '800' },
  recDesc: { fontSize: Typography.sizes.xs - 1, marginTop: 2, lineHeight: 16 },
  recPrice: { fontSize: Typography.sizes.sm, fontWeight: '900', marginLeft: Spacing.sm },
  recFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  sampleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.sm },
  sampleBadgeText: { fontSize: 10, fontWeight: '700' },
  bookTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  bookTestBtnText: { color: '#1C232D', fontSize: 10, fontWeight: '800' },
});