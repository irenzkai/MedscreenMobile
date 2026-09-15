import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { PatientTabsParamList } from '../../navigation/PatientTabs';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../hooks/useTheme';
import { appointmentsApi } from '../../services/api/appointments';
import { Appointment, AppointmentStatus } from '../../types';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { AppointmentCard } from '../../components/appointments/AppointmentCard';
import { alertBulkWebExclusive } from '../../utils/externalLinks';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type RouteProps = RouteProp<PatientTabsParamList, 'Appointments'>;
type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export const AppointmentsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const [activeTab, setActiveTab] = useState<'self' | 'family' | 'bulk'>(
    route.params?.initialTab || 'self'
  );
  const [selfAppointments, setSelfAppointments] = useState<Appointment[]>([]);
  const [dependentAppointments, setDependentAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await appointmentsApi.getAppointments();
      setSelfAppointments(res.self);
      setDependentAppointments(res.dependents);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  // Filter current tab appointments by search query and clinical status
  const currentList = useMemo(() => {
    const list = activeTab === 'self' ? selfAppointments : activeTab === 'family' ? dependentAppointments : [];
    return list.filter((app) => {
      // Status filtering
      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'expired' && app.status === 'expired') ||
        app.status === selectedStatusFilter;

      // Search filtering
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        app.id.toString().includes(q) ||
        (app.patient_name && app.patient_name.toLowerCase().includes(q)) ||
        (app.services && app.services.some((s) => s.name.toLowerCase().includes(q)));

      return matchesStatus && matchesSearch;
    });
  }, [activeTab, selfAppointments, dependentAppointments, searchQuery, selectedStatusFilter]);

  const handleCancelAppointment = (appointment: Appointment) => {
    const scheduledDate = new Date(`${appointment.appointment_date}T${appointment.time_slot}`);
    const now = new Date();
    const hoursRemaining = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    const isCashlessPaid = appointment.payment_method === 'Cashless' && appointment.payment_status === 'paid';
    const isUnder24Hours = hoursRemaining < 24 && hoursRemaining >= 0;

    let feeNotice = 'Free cancellation is available for this booking.';
    if (isCashlessPaid) {
      feeNotice = isUnder24Hours
        ? 'Notice: Since you are canceling within 24 hours of your schedule, a 50% administrative cancellation fee applies (50% will be refunded).'
        : 'Notice: Canceling more than 24 hours in advance qualifies your paid cashless booking for a 100% full refund.';
    }

    Alert.alert(
      'Cancel Appointment?',
      `Are you sure you want to cancel Appointment #${appointment.id}?\n\n${feeNotice}`,
      [
        { text: 'Keep Appointment', style: 'cancel' },
        {
          text: 'Confirm Cancellation',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await appointmentsApi.cancelAppointment(appointment.id);
              if (res.success) {
                Alert.alert('Canceled', res.message || 'Appointment successfully canceled.');
                fetchAppointments();
              }
            } catch (err) {
              Alert.alert('Error', 'Could not cancel appointment. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteExpired = (appointment: Appointment) => {
    Alert.alert(
      'Remove Expired Record?',
      'Are you sure you want to remove this expired appointment from your dashboard view?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await appointmentsApi.softDeleteAppointment(appointment.id);
              fetchAppointments();
            } catch {
              Alert.alert('Error', 'Could not remove expired record.');
            }
          },
        },
      ]
    );
  };

  const statusFilters: Array<{ key: string; label: string }> = [
    { key: 'all', label: 'ALL' },
    { key: 'pending', label: 'PENDING' },
    { key: 'approved', label: 'APPROVED' },
    { key: 'retest', label: 'RETEST' },
    { key: 'tested', label: 'TESTED' },
    { key: 'released', label: 'RELEASED' },
    { key: 'returned', label: 'RETURNED' },
    { key: 'canceled', label: 'CANCELED' },
    { key: 'expired', label: 'EXPIRED' },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <Header
        title="Appointments"
        subtitle="Manage Schedules & Status"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateAppointment')}
            style={[styles.bookHeaderBtn, { backgroundColor: theme.brandAccent }]}
            hitSlop={8}>
            <Ionicons name="add" size={16} color="#1C232D" />
            <Text style={styles.bookHeaderBtnText}>BOOK</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>
        {/* Navigation Category Pills */}
        <View style={styles.tabPillsRow}>
          <TouchableOpacity
            onPress={() => setActiveTab('self')}
            style={[
              styles.tabPill,
              {
                backgroundColor: activeTab === 'self' ? theme.brandAccent : theme.bgCard,
                borderColor: activeTab === 'self' ? theme.brandAccent : theme.borderColor,
              },
            ]}>
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'self' ? '#1C232D' : theme.textMuted },
              ]}>
              Myself ({selfAppointments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('family')}
            style={[
              styles.tabPill,
              {
                backgroundColor: activeTab === 'family' ? theme.brandAccent : theme.bgCard,
                borderColor: activeTab === 'family' ? theme.brandAccent : theme.borderColor,
              },
            ]}>
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'family' ? '#1C232D' : theme.textMuted },
              ]}>
              Family ({dependentAppointments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('bulk')}
            style={[
              styles.tabPill,
              {
                backgroundColor: activeTab === 'bulk' ? theme.brandAccent : theme.bgCard,
                borderColor: activeTab === 'bulk' ? theme.brandAccent : theme.borderColor,
              },
            ]}>
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'bulk' ? '#1C232D' : theme.textMuted },
              ]}>
              Corporate / Bulk
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <Input
          placeholder="Search by ID, name, or examination..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={{ marginBottom: Spacing.sm }}
        />

        {/* Status Filter Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusFilterScroll}>
          {statusFilters.map((sf) => (
            <TouchableOpacity
              key={sf.key}
              onPress={() => setSelectedStatusFilter(sf.key)}
              style={[
                styles.filterPill,
                {
                  backgroundColor:
                    selectedStatusFilter === sf.key ? theme.brandAccent : theme.bgCard,
                  borderColor:
                    selectedStatusFilter === sf.key ? theme.brandAccent : theme.borderColor,
                },
              ]}>
              <Text
                style={[
                  styles.filterPillText,
                  { color: selectedStatusFilter === sf.key ? '#1C232D' : theme.textMuted },
                ]}>
                {sf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Appointments List View */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.brandAccent} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              Loading appointment schedules...
            </Text>
          </View>
        ) : activeTab === 'bulk' ? (
          /* Locked Bulk Tab Notice */
          <Card style={styles.lockedBulkCard}>
            <Ionicons name="business-outline" size={48} color={theme.warning} />
            <Text style={[styles.lockedTitle, { color: theme.textMain }]}>
              Corporate & Bulk Appointments
            </Text>
            <Text style={[styles.lockedMessage, { color: theme.textMuted }]}>
              Batch bookings and company spreadsheet compilations are managed exclusively through our web portal for administrative verification and bulk billing.
            </Text>
            <Button
              title="Open Web Portal"
              variant="primary"
              size="md"
              icon={<Ionicons name="open-outline" size={16} color="#1C232D" />}
              onPress={alertBulkWebExclusive}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        ) : currentList.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={44} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.textMain }]}>
              No Bookings Found
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              {searchQuery || selectedStatusFilter !== 'all'
                ? 'No appointments match your filters.'
                : 'You have no scheduled appointments in this category.'}
            </Text>
            <Button
              title="Book New Appointment"
              size="sm"
              onPress={() => navigation.navigate('CreateAppointment')}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.brandAccent}
                colors={[theme.brandAccent]}
              />
            }>
            {currentList.map((app) => (
              <AppointmentCard
                key={app.id}
                appointment={app}
                onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: app.id })}
                onResubmit={() => navigation.navigate('ResubmitAppointment', { appointmentId: app.id })}
                onCancel={() => handleCancelAppointment(app)}
                onDeleteExpired={() => handleDeleteExpired(app)}
                onViewResult={() => navigation.navigate('AppointmentDetail', { appointmentId: app.id })}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, padding: Spacing.md },
  bookHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  bookHeaderBtnText: { color: '#1C232D', fontSize: 11, fontWeight: '800' },
  tabPillsRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillText: { fontSize: Typography.sizes.xs - 1, fontWeight: '800', textTransform: 'uppercase' },
  statusFilterScroll: { paddingVertical: Spacing.xs, marginBottom: Spacing.sm, gap: Spacing.xs },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillText: { fontSize: Typography.sizes.xs - 2, fontWeight: '800' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: Typography.sizes.xs, marginTop: Spacing.sm },
  listContent: { paddingBottom: 40 },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: Typography.sizes.md, fontWeight: '800', textTransform: 'uppercase', marginTop: Spacing.sm },
  emptySubtitle: { fontSize: Typography.sizes.xs, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  lockedBulkCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  lockedTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
  },
  lockedMessage: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
});