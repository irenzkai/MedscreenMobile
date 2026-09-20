import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { PatientTabsParamList } from '../../navigation/PatientTabs';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../hooks/useTheme';
import { appointmentsApi } from '../../services/api/appointments';
import { Appointment } from '../../types';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ActionModal } from '../../components/common/ActionModal';
import { AppointmentCard } from '../../components/appointments/AppointmentCard';
import { LightboxModal } from '../../components/common/LightboxModal';
import {
  ScrollShortcutButton,
  useScrollShortcut,
} from '../../components/common/ScrollShortcutButton';
import { openWebUrl } from '../../utils/externalLinks';
import { EXTERNAL_ROUTES } from '../../constants/config';
import {
  isAppointmentExpired,
  getEffectiveAppointmentStatus,
  getCancellationPolicyDetails,
} from '../../utils/formatters';
import { Spacing, Typography, BorderRadius, StatusColors } from '../../constants/theme';

type RouteProps = RouteProp<PatientTabsParamList, 'Appointments'>;
type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

const STATUS_OPTIONS: Array<{ key: string; label: string; color: string }> = [
  { key: 'all', label: 'All Statuses', color: '#19D38C' },
  { key: 'pending', label: 'Pending', color: StatusColors.pending.text },
  { key: 'approved', label: 'Approved', color: StatusColors.approved.text },
  { key: 'retest', label: 'Retest Required', color: StatusColors.retest.text },
  { key: 'tested', label: 'Tested', color: StatusColors.tested.text },
  { key: 'encoded', label: 'Encoded', color: StatusColors.encoded.text },
  { key: 'released', label: 'Released', color: StatusColors.released.text },
  { key: 'returned', label: 'Returned', color: StatusColors.returned.text },
  { key: 'canceled', label: 'Canceled', color: StatusColors.canceled.text },
  { key: 'expired', label: 'Expired', color: StatusColors.expired.text },
];

export const AppointmentsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const { contentOffsetY, contentHeight, layoutHeight, handleScroll } = useScrollShortcut();

  const [activeTab, setActiveTab] = useState<'self' | 'family' | 'bulk'>(
    route.params?.initialTab || 'self'
  );
  const [selfAppointments, setSelfAppointments] = useState<Appointment[]>([]);
  const [dependentAppointments, setDependentAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [statusDropdownVisible, setStatusDropdownVisible] = useState<boolean>(false);

  // External site redirect modal
  const [bulkRedirectModalVisible, setBulkRedirectModalVisible] = useState<boolean>(false);

  // Confirmation & Success Modals
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string | React.ReactNode;
    confirmText: string;
    cancelText?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    onConfirm: () => Promise<void>;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: async () => {},
  });

  const [successModalConfig, setSuccessModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  // Lightbox modal state
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await appointmentsApi.getAppointments();
      setSelfAppointments(res.self || []);
      setDependentAppointments(res.dependents || []);
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

  const currentList = useMemo(() => {
    const list =
      activeTab === 'self'
        ? selfAppointments
        : activeTab === 'family'
        ? dependentAppointments
        : [];

    return list.filter((app) => {
      const effectiveStatus = getEffectiveAppointmentStatus(app);
      const matchesStatus =
        selectedStatus === 'all' || effectiveStatus === selectedStatus;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        app.id.toString().includes(q) ||
        (app.patient_name && app.patient_name.toLowerCase().includes(q)) ||
        (app.services && app.services.some((s) => s.name.toLowerCase().includes(q)));

      return matchesStatus && matchesSearch;
    });
  }, [activeTab, selfAppointments, dependentAppointments, searchQuery, selectedStatus]);

  const activeStatusObj =
    STATUS_OPTIONS.find((s) => s.key === selectedStatus) || STATUS_OPTIONS[0];

  const handlePromptCancel = (app: Appointment) => {
    // Uses the shared timezone-safe cancellation calculator
    const { isWithin24Hours, scheduledFormatted } = getCancellationPolicyDetails(app);
    const isPaid = app.payment_status === 'paid';

    setConfirmModalConfig({
      visible: true,
      title: 'Cancel Appointment',
      confirmText: 'Cancel',
      cancelText: 'Keep',
      icon: 'close-circle-outline',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await appointmentsApi.cancelAppointment(app.id);
          setConfirmModalConfig((prev) => ({ ...prev, visible: false }));
          setSuccessModalConfig({
            visible: true,
            title: 'Appointment Canceled',
            message: res.message || 'Your appointment booking has been successfully canceled.',
          });
          fetchAppointments();
        } catch {
          setConfirmModalConfig((prev) => ({ ...prev, visible: false }));
        } finally {
          setActionLoading(false);
        }
      },
      message: (
        <View style={styles.cancelModalContent}>
          <Text style={[styles.cancelModalPrompt, { color: theme.textMain }]}>
            Are you sure you want to cancel this appointment?
          </Text>

          {/* Cashless Booking Disclosures */}
          {app.payment_method === 'Cashless' ? (
            isPaid ? (
              isWithin24Hours ? (
                <View style={[styles.cancelAlertBox, { backgroundColor: 'rgba(255, 193, 7, 0.08)', borderColor: theme.warning }]}>
                  <View style={styles.cancelAlertHeader}>
                    <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                    <Text style={[styles.cancelAlertBadgeText, { color: theme.success }]}>
                      Payment Status: Confirmed Paid
                    </Text>
                  </View>
                  <Text style={[styles.cancelAlertBody, { color: theme.textMain }]}>
                    <Text style={[styles.policyHighlight, { color: theme.warning }]}>50% Fee Applies: </Text>
                    Because cancellation is requested within 24 hours of your slot ({scheduledFormatted}), a{' '}
                    <Text style={{ fontWeight: '800' }}>50% administrative cancellation fee</Text> applies. 50% will be refunded to your account.
                  </Text>
                </View>
              ) : (
                <View style={[styles.cancelAlertBox, { backgroundColor: 'rgba(25, 211, 140, 0.08)', borderColor: theme.brandAccent }]}>
                  <View style={styles.cancelAlertHeader}>
                    <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                    <Text style={[styles.cancelAlertBadgeText, { color: theme.success }]}>
                      Payment Status: Confirmed Paid
                    </Text>
                  </View>
                  <Text style={[styles.cancelAlertBody, { color: theme.textMain }]}>
                    <Text style={[styles.policyHighlight, { color: theme.brandAccent }]}>100% Full Refund Eligible: </Text>
                    You are canceling more than 24 hours in advance. Your paid cashless transaction is eligible for a{' '}
                    <Text style={{ fontWeight: '800' }}>100% full refund</Text>.
                  </Text>
                </View>
              )
            ) : (
              isWithin24Hours ? (
                <View style={[styles.cancelAlertBox, { backgroundColor: 'rgba(255, 193, 7, 0.08)', borderColor: theme.warning }]}>
                  <View style={styles.cancelAlertHeader}>
                    <Ionicons name="time" size={14} color={theme.warning} />
                    <Text style={[styles.cancelAlertBadgeText, { color: theme.warning }]}>
                      Payment Status: Pending Verification
                    </Text>
                  </View>
                  <Text style={[styles.cancelAlertBody, { color: theme.textMain }]}>
                    Your uploaded payment receipt has not been confirmed yet. Since you are canceling within 24 hours of your slot ({scheduledFormatted}), a{' '}
                    <Text style={{ fontWeight: '800' }}>50% administrative cancellation fee</Text> applies upon confirmation.
                  </Text>
                </View>
              ) : (
                <View style={[styles.cancelAlertBox, { backgroundColor: 'rgba(13, 202, 240, 0.08)', borderColor: theme.info }]}>
                  <View style={styles.cancelAlertHeader}>
                    <Ionicons name="time" size={14} color={theme.info} />
                    <Text style={[styles.cancelAlertBadgeText, { color: theme.info }]}>
                      Payment Status: Pending Verification
                    </Text>
                  </View>
                  <Text style={[styles.cancelAlertBody, { color: theme.textMain }]}>
                    Your uploaded payment receipt has not been confirmed yet. Since you are canceling more than 24 hours in advance, the booking will be canceled with no charge.
                  </Text>
                </View>
              )
            )
          ) : (
            /* Cash on Site Booking Disclosures */
            isWithin24Hours ? (
              <View style={[styles.cancelAlertBox, { backgroundColor: 'rgba(255, 193, 7, 0.08)', borderColor: theme.warning }]}>
                <Text style={[styles.cancelAlertBody, { color: theme.textMain }]}>
                  <Text style={[styles.policyHighlight, { color: theme.warning }]}>Notice: </Text>
                  Canceling within 24 hours of your scheduled appointment time ({scheduledFormatted}).
                </Text>
              </View>
            ) : (
              <View style={[styles.cancelAlertBox, { backgroundColor: 'rgba(108, 117, 125, 0.08)', borderColor: theme.borderColor }]}>
                <Text style={[styles.cancelAlertBody, { color: theme.textMuted }]}>
                  Free cancellation available for this cash booking (more than 24 hours in advance).
                </Text>
              </View>
            )
          )}
        </View>
      ),
    });
  };

  const handlePromptDeleteExpired = (app: Appointment) => {
    setConfirmModalConfig({
      visible: true,
      title: 'Remove Record',
      message: `Remove expired appointment from your patient appointment history?`,
      confirmText: 'Remove',
      cancelText: 'Keep',
      icon: 'trash-outline',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await appointmentsApi.softDeleteAppointment(app.id);
          setConfirmModalConfig((prev) => ({ ...prev, visible: false }));
          setSuccessModalConfig({
            visible: true,
            title: 'Record Removed',
            message: 'Expired appointment record has been removed.',
          });
          fetchAppointments();
        } catch {
          setConfirmModalConfig((prev) => ({ ...prev, visible: false }));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <Header
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
        <View style={styles.pageTitleBlock}>
          <Text style={[styles.pageMainTitle, { color: theme.brandAccent }]}>
            MY APPOINTMENTS
          </Text>
          <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>
            Manage schedules, review status, and track clinical results.
          </Text>
        </View>

        {/* Category Tabs */}
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
              Bulk
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <Input
          placeholder="Search by ID, name, or examination..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={{ marginBottom: Spacing.xs }}
        />

        {/* Status Filter */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setStatusDropdownVisible(true)}
          style={[
            styles.dropdownTrigger,
            { backgroundColor: theme.bgCard, borderColor: theme.borderColor },
          ]}>
          <View style={styles.dropdownLeft}>
            <Ionicons
              name="funnel-outline"
              size={16}
              color={theme.brandAccent}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.dropdownLabel, { color: theme.textMuted }]}>Status:</Text>
            <View style={[styles.statusBadgePreview, { borderColor: activeStatusObj.color }]}>
              <View style={[styles.statusDot, { backgroundColor: activeStatusObj.color }]} />
              <Text style={[styles.statusBadgeText, { color: theme.textMain }]}>
                {activeStatusObj.label}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
        </TouchableOpacity>

        {/* List Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.brandAccent} />
          </View>
        ) : activeTab === 'bulk' ? (
          <Card style={styles.lockedBulkCard}>
            <Ionicons name="business-outline" size={48} color={theme.warning} />
            <Text style={[styles.lockedTitle, { color: theme.textMain }]}>
              Bulk Portal
            </Text>
            <Text style={[styles.lockedMessage, { color: theme.textMuted }]}>
              Bulk spreadsheet imports and reservations are exclusive to the web portal.
            </Text>
            <Button
              title="Open Website"
              size="sm"
              onPress={() => setBulkRedirectModalVisible(true)}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        ) : currentList.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.textMain }]}>No Bookings</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              No appointments found with current filters.
            </Text>
          </Card>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
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
                onPress={() =>
                  navigation.navigate('AppointmentDetail', { appointmentId: app.id })
                }
                onResubmit={() =>
                  navigation.navigate('ResubmitAppointment', { appointmentId: app.id })
                }
                onCancel={() => handlePromptCancel(app)}
                onDeleteExpired={() => handlePromptDeleteExpired(app)}
                onViewResult={() =>
                  navigation.navigate('AppointmentDetail', { appointmentId: app.id })
                }
                onPreviewReferral={() => {
                  if (app.referral_note) {
                    setPreviewTitle(`Referral: REF #${app.id}`);
                    setPreviewUri(app.referral_note);
                    setLightboxVisible(true);
                  }
                }}
                onPreviewReceipt={() => {
                  if (app.payment_receipt) {
                    setPreviewTitle(`Receipt: REF #${app.id}`);
                    setPreviewUri(app.payment_receipt);
                    setLightboxVisible(true);
                  }
                }}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <ScrollShortcutButton
        scrollViewRef={scrollViewRef}
        contentOffsetY={contentOffsetY}
        contentHeight={contentHeight}
        layoutHeight={layoutHeight}
      />

      {/* UNIFIED MODAL: External Bulk Website Redirection */}
      <ActionModal
        visible={bulkRedirectModalVisible}
        type="info"
        icon="globe-outline"
        title="Open Web Portal"
        message="Bulk spreadsheet imports, employee list verification, and enterprise bookings are managed on our official website. Proceed to open in your browser?"
        confirmText="Visit Portal"
        cancelText="Stay Here"
        confirmVariant="primary"
        onClose={() => setBulkRedirectModalVisible(false)}
        onConfirm={() => {
          setBulkRedirectModalVisible(false);
          openWebUrl(EXTERNAL_ROUTES.BULK_APPOINTMENT);
        }}
      />

      {/* UNIFIED MODAL: Confirmation for Cancel / Delete */}
      <ActionModal
        visible={confirmModalConfig.visible}
        type="danger"
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText={confirmModalConfig.confirmText}
        cancelText={confirmModalConfig.cancelText}
        icon={confirmModalConfig.icon}
        loading={actionLoading}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, visible: false }))}
        onConfirm={confirmModalConfig.onConfirm}
      />

      {/* UNIFIED MODAL: Action Success Acknowledgement */}
      <ActionModal
        visible={successModalConfig.visible}
        type="success"
        title={successModalConfig.title}
        message={successModalConfig.message}
        isSingleAction={true}
        confirmText="OK"
        onClose={() => setSuccessModalConfig((prev) => ({ ...prev, visible: false }))}
      />

      {/* Status Filter Modal */}
      <Modal
        visible={statusDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusDropdownVisible(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setStatusDropdownVisible(false)}
          style={styles.modalOverlay}>
          <View
            style={[
              styles.dropdownModalCard,
              { backgroundColor: theme.bgCard, borderColor: theme.borderColor },
            ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textMain }]}>
                Filter Appointments by Status
              </Text>
              <TouchableOpacity onPress={() => setStatusDropdownVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {STATUS_OPTIONS.map((item) => {
                const isSelected = selectedStatus === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => {
                      setSelectedStatus(item.key);
                      setStatusDropdownVisible(false);
                    }}
                    style={[
                      styles.statusOptionRow,
                      {
                        backgroundColor: isSelected ? theme.surfaceSubtle : 'transparent',
                        borderBottomColor: theme.borderColor,
                      },
                    ]}>
                    <View style={styles.optionLeft}>
                      <View style={[styles.statusDot, { backgroundColor: item.color }]} />
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color: isSelected ? theme.brandAccent : theme.textMain,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}>
                        {item.label}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={18} color={theme.brandAccent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Lightbox Modal */}
      <LightboxModal
        visible={lightboxVisible}
        onClose={() => setLightboxVisible(false)}
        title={previewTitle}
        imageUri={previewUri}
        downloadUrl={previewUri}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.md },
  pageTitleBlock: { marginVertical: Spacing.sm },
  pageMainTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pageSubtitle: { fontSize: Typography.sizes.xs, marginTop: 2 },
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
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillText: {
    fontSize: Typography.sizes.xs - 2,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  dropdownLeft: { flexDirection: 'row', alignItems: 'center' },
  dropdownLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    marginRight: 6,
  },
  statusBadgePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: Typography.sizes.xs - 1, fontWeight: '800' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 40 },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: Spacing.xs,
  },
  emptySubtitle: { fontSize: Typography.sizes.xs, textAlign: 'center', marginTop: 4 },
  lockedBulkCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  lockedTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: Spacing.xs,
  },
  lockedMessage: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  dropdownModalCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  modalTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optionLabel: { fontSize: Typography.sizes.xs },

  // Cancellation Policy Disclosure inside Modal
  cancelModalContent: {
    width: '100%',
    marginTop: Spacing.xs,
  },
  cancelModalPrompt: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  cancelAlertBox: {
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: 4,
  },
  cancelAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cancelAlertBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cancelAlertBody: {
    fontSize: Typography.sizes.xs - 1,
    lineHeight: 16,
  },
  policyHighlight: {
    fontWeight: '800',
  },
});