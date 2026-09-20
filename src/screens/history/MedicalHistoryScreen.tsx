import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { historyApi } from '../../services/api/history';
import { Appointment, HistoryRecord, HistoryPermissionStatus } from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { NoticeBox } from '../../components/common/NoticeBox';
import { LightboxModal } from '../../components/common/LightboxModal';
import {
  resolveFileUrl,
  downloadFile,
  isImageDocument,
  isPdfDocument,
} from '../../utils/fileHelpers';
import {
  formatCurrency,
  formatDate,
  formatTimeSlot,
  formatPatientName,
  isAppointmentExpired,
  getEffectiveAppointmentStatus,
  calculatePatientAge,
} from '../../utils/formatters';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export const MedicalHistoryScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView | null>(null);

  const [activeTab, setActiveTab] = useState<'appointments' | 'records'>('appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [existingRecords, setExistingRecords] = useState<HistoryRecord[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<HistoryPermissionStatus>('none');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [handshakeLoading, setHandshakeLoading] = useState<boolean>(false);
  const [noticeMessage, setNoticeMessage] = useState<{
    type: 'danger' | 'warning' | 'info' | 'success';
    text: string;
  } | null>(null);

  // Lightbox preview states
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [activeDownloadUrl, setActiveDownloadUrl] = useState<string | null>(null);
  const [activeFilename, setActiveFilename] = useState<string>('document.pdf');

  const showError = (text: string) => {
    setNoticeMessage({ type: 'danger', text });
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  const showSuccess = (text: string) => {
    setNoticeMessage({ type: 'success', text });
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  const fetchHistory = useCallback(async () => {
    try {
      const data = await historyApi.getMedicalHistory();
      setAppointments(data.appointments || []);
      setExistingRecords(data.existingRecords || []);
      setPermissionStatus(data.permissionStatus || 'none');
    } catch (error) {
      console.error('Error loading medical history:', error);
      showError('Unable to sync medical records from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleRequestDigitization = async () => {
    setHandshakeLoading(true);
    try {
      const res = await historyApi.requestDigitization();
      if (res.success) {
        setPermissionStatus('pending_staff');
        showSuccess('Your request has been dispatched to laboratory staff for verification.');
      }
    } catch {
      showError('Could not send digitization request. Please try again.');
    } finally {
      setHandshakeLoading(false);
    }
  };

  const handleAcceptPermission = async () => {
    setHandshakeLoading(true);
    try {
      const res = await historyApi.acceptDigitizationRequest();
      if (res.success) {
        setPermissionStatus('granted');
        showSuccess('Your laboratory archive access has been authorized and initialized.');
        fetchHistory();
      }
    } catch {
      showError('Could not authorize data digitization.');
    } finally {
      setHandshakeLoading(false);
    }
  };

  const openPreview = (filePath: string, label: string) => {
    const fullUrl = resolveFileUrl(filePath);
    const isImage = isImageDocument(fullUrl);
    const isPdf = isPdfDocument(fullUrl);
    setPreviewTitle(label);
    setPreviewUri(fullUrl);
    setActiveDownloadUrl(fullUrl);
    setActiveFilename(isImage ? `${label}.jpg` : isPdf ? `${label}.pdf` : `${label}.docx`);
    setLightboxVisible(true);
  };

  const handleDownloadScan = (filePath: string, label: string) => {
    const fullUrl = resolveFileUrl(filePath);
    const isImage = isImageDocument(fullUrl);
    const ext = isImage ? 'jpg' : 'pdf';
    downloadFile(fullUrl, `${label}.${ext}`);
  };

  // Clinically accurate status footer resolver
  const renderAppointmentFooterStatus = (app: Appointment) => {
    const isExpired = isAppointmentExpired(app);
    const effectiveStatus = getEffectiveAppointmentStatus(app);

    if (effectiveStatus === 'released') {
      return (
        <TouchableOpacity
          style={[styles.viewReportBtn, { backgroundColor: theme.brandAccent }]}
          onPress={() =>
            navigation.navigate('AppointmentDetail', { appointmentId: app.id })
          }>
          <Ionicons name="document-text-outline" size={12} color="#1C232D" />
          <Text style={styles.viewReportBtnText}>VIEW REPORT</Text>
        </TouchableOpacity>
      );
    }

    if (isExpired || effectiveStatus === 'expired') {
      return (
        <Text style={[styles.processingText, { color: theme.danger }]}>
          Expired (Past 24-hr schedule)
        </Text>
      );
    }

    if (effectiveStatus === 'canceled') {
      return (
        <Text style={[styles.processingText, { color: theme.textMuted }]}>
          Appointment Canceled
        </Text>
      );
    }

    if (effectiveStatus === 'returned') {
      return (
        <Text style={[styles.processingText, { color: theme.danger }]}>
          Corrections Requested
        </Text>
      );
    }

    if (effectiveStatus === 'retest') {
      return (
        <Text style={[styles.processingText, { color: theme.warning }]}>
          Retesting Required
        </Text>
      );
    }

    if (effectiveStatus === 'pending') {
      return (
        <Text style={[styles.processingText, { color: theme.textMuted }]}>
          Awaiting clinic review...
        </Text>
      );
    }

    if (effectiveStatus === 'approved') {
      return (
        <Text style={[styles.processingText, { color: theme.brandAccent }]}>
          Approved • Awaiting Visit
        </Text>
      );
    }

    if (effectiveStatus === 'tested') {
      return (
        <Text style={[styles.processingText, { color: theme.textMuted }]}>
          Sample Collected • In Processing
        </Text>
      );
    }

    if (effectiveStatus === 'encoded') {
      return (
        <Text style={[styles.processingText, { color: theme.textMuted }]}>
          Results Under Validation...
        </Text>
      );
    }

    return (
      <Text style={[styles.processingText, { color: theme.textMuted }]}>
        Processing...
      </Text>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <Header
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('PatientTabs', { screen: 'Appointments' })}
            style={[styles.headerBtn, { backgroundColor: theme.surfaceSubtle }]}
            hitSlop={8}>
            <Ionicons name="calendar-outline" size={16} color={theme.brandAccent} />
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>
        {/* Title Block */}
        <View style={styles.pageTitleBlock}>
          <Text style={[styles.pageMainTitle, { color: theme.brandAccent }]}>
            LABORATORY HISTORY
          </Text>
          <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>
            Clinical archive for:{' '}
            <Text style={{ color: theme.brandAccent, fontWeight: '800' }}>
              {user?.name?.toUpperCase() || ''}
            </Text>
          </Text>
        </View>

        {noticeMessage ? (
          <NoticeBox
            type={noticeMessage.type}
            message={noticeMessage.text}
            onClose={() => setNoticeMessage(null)}
            style={{ marginBottom: Spacing.sm }}
          />
        ) : null}

        {/* Navigation Tabs */}
        <View style={styles.tabPillsRow}>
          <TouchableOpacity
            onPress={() => {
              setActiveTab('appointments');
              setNoticeMessage(null);
            }}
            style={[
              styles.tabPill,
              {
                backgroundColor:
                  activeTab === 'appointments' ? theme.brandAccent : theme.bgCard,
                borderColor:
                  activeTab === 'appointments' ? theme.brandAccent : theme.borderColor,
              },
            ]}>
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'appointments' ? '#1C232D' : theme.textMuted },
              ]}>
              Appointment History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setActiveTab('records');
              setNoticeMessage(null);
            }}
            style={[
              styles.tabPill,
              {
                backgroundColor:
                  activeTab === 'records' ? theme.brandAccent : theme.bgCard,
                borderColor:
                  activeTab === 'records' ? theme.brandAccent : theme.borderColor,
              },
            ]}>
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'records' ? '#1C232D' : theme.textMuted },
              ]}>
              Laboratory Records
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={theme.brandAccent} />
          </View>
        ) : activeTab === 'appointments' ? (
          <ScrollView
            ref={scrollViewRef}
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
            {appointments.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="folder-outline" size={40} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.textMain }]}>
                  No Past Bookings
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                  Your appointment booking timeline will appear here.
                </Text>
              </Card>
            ) : (
              appointments.map((app) => {
                const isExpired = isAppointmentExpired(app);
                const effectiveStatus = getEffectiveAppointmentStatus(app);
                const patientAge = calculatePatientAge(app);

                return (
                  <Card
                    key={app.id}
                    style={styles.historyCard}
                    onPress={() =>
                      navigation.navigate('AppointmentDetail', { appointmentId: app.id })
                    }>
                    <View style={styles.historyCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.appDate, { color: theme.textMain }]}>
                          {formatDate(app.appointment_date)} • {formatTimeSlot(app.time_slot)}
                        </Text>
                        <Text
                          style={[styles.appPatient, { color: theme.textMuted }]}
                          numberOfLines={1}>
                          {formatPatientName(
                            app.patient_first_name,
                            app.patient_middle_name,
                            app.patient_last_name,
                            app.patient_suffix
                          )}{' '}
                          • {patientAge}
                        </Text>
                      </View>
                      <Badge status={effectiveStatus} isExpired={isExpired} size="sm" />
                    </View>

                    <Text
                      style={[styles.servicesList, { color: theme.textMain }]}
                      numberOfLines={2}>
                      {app.services?.map((s) => s.name).join(', ') || 'Diagnostic Tests'}
                    </Text>

                    <View
                      style={[
                        styles.historyCardFooter,
                        { borderTopColor: theme.borderColor },
                      ]}>
                      <Text style={[styles.totalBill, { color: theme.brandAccent }]}>
                        {formatCurrency(app.payment_amount || 0)}
                      </Text>

                      {renderAppointmentFooterStatus(app)}
                    </View>
                  </Card>
                );
              })
            )}
          </ScrollView>
        ) : (
          <ScrollView
            ref={scrollViewRef}
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
            {permissionStatus === 'none' && (
              <Card style={styles.handshakeCard}>
                <View
                  style={[
                    styles.handshakeIconWrap,
                    { backgroundColor: theme.surfaceSubtle },
                  ]}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={44}
                    color={theme.brandAccent}
                  />
                </View>
                <Text style={[styles.handshakeTitle, { color: theme.textMain }]}>
                  Historical Data Connection
                </Text>
                <Text style={[styles.handshakeDesc, { color: theme.textMuted }]}>
                  Your legacy physical lab records are not digitized yet. Request our
                  clinical personnel to scan and compile your historical records.
                </Text>
                <Button
                  title="Request Data Import"
                  variant="primary"
                  loading={handshakeLoading}
                  onPress={handleRequestDigitization}
                  style={{ width: '100%' }}
                />
              </Card>
            )}

            {permissionStatus === 'pending_staff' && (
              <Card style={styles.handshakeCard}>
                <View
                  style={[
                    styles.handshakeIconWrap,
                    { backgroundColor: 'rgba(13, 202, 240, 0.1)' },
                  ]}>
                  <Ionicons name="time-outline" size={44} color={theme.info} />
                </View>
                <Text style={[styles.handshakeTitle, { color: theme.textMain }]}>
                  Awaiting Laboratory Review
                </Text>
                <Text style={[styles.handshakeDesc, { color: theme.textMuted }]}>
                  Your data import request has been dispatched. A laboratory technician is
                  reviewing and compiling your physical archives.
                </Text>
              </Card>
            )}

            {permissionStatus === 'pending_patient' && (
              <Card style={styles.handshakeCard} variant="warning">
                <View
                  style={[
                    styles.handshakeIconWrap,
                    { backgroundColor: 'rgba(255, 193, 7, 0.1)' },
                  ]}>
                  <Ionicons name="key-outline" size={44} color={theme.warning} />
                </View>
                <Text style={[styles.handshakeTitle, { color: theme.textMain }]}>
                  Permission Required
                </Text>
                <Text style={[styles.handshakeDesc, { color: theme.textMuted }]}>
                  The laboratory is requesting your permission to digitize your past physical
                  examination results under the Philippine Data Privacy Act.
                </Text>
                <Button
                  title="Allow Digitization"
                  variant="primary"
                  loading={handshakeLoading}
                  onPress={handleAcceptPermission}
                  style={{ width: '100%' }}
                />
              </Card>
            )}

            {permissionStatus === 'granted' && (
              <View>
                {existingRecords.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Ionicons name="document-outline" size={40} color={theme.textMuted} />
                    <Text style={[styles.emptyTitle, { color: theme.textMain }]}>
                      No Digitized Records Yet
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                      Permission has been granted. As soon as clinic staff scans your legacy
                      documents, they will appear here.
                    </Text>
                  </Card>
                ) : (
                  existingRecords.map((record) => (
                    <Card key={record.id} style={styles.historyCard}>
                      <View style={styles.historyCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.appDate, { color: theme.textMain }]}>
                            {formatDate(record.date_of_record)}
                          </Text>
                          <Text style={[styles.appPatient, { color: theme.textMuted }]}>
                            Requested by: {record.requested_by.toUpperCase()}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.filesBadge,
                            { backgroundColor: theme.surfaceSubtle },
                          ]}>
                          <Text
                            style={[
                              styles.filesBadgeText,
                              { color: theme.brandAccent },
                            ]}>
                            {record.scans.length}{' '}
                            {record.scans.length === 1 ? 'FILE' : 'FILES'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.procBadgesRow}>
                        {record.tests_requested.map((testName, i) => (
                          <View
                            key={i}
                            style={[
                              styles.procBadge,
                              { backgroundColor: theme.surfaceSubtle },
                            ]}>
                            <Text style={[styles.procBadgeText, { color: theme.textMain }]}>
                              {testName}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {record.scans.map((scan, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.scanItemRow,
                            { backgroundColor: theme.surfaceSubtle },
                          ]}>
                          <Ionicons
                            name="document-attach-outline"
                            size={18}
                            color={theme.brandAccent}
                          />
                          <View style={{ flex: 1, marginHorizontal: 8 }}>
                            <Text
                              style={[styles.scanLabel, { color: theme.textMain }]}
                              numberOfLines={1}>
                              {scan.label}
                            </Text>
                            {scan.certificate_no ? (
                              <Text style={[styles.certNo, { color: theme.brandAccent }]}>
                                Cert #{scan.certificate_no}
                              </Text>
                            ) : null}
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              onPress={() => openPreview(scan.file_path, scan.label)}
                              style={[
                                styles.previewFileBtn,
                                { backgroundColor: theme.brandAccent },
                              ]}>
                              <Text style={styles.previewFileBtnText}>PREVIEW</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDownloadScan(scan.file_path, scan.label)}
                              style={[
                                styles.downloadFileIconBtn,
                                {
                                  borderColor: theme.brandAccent,
                                  backgroundColor: theme.bgCard,
                                },
                              ]}>
                              <Ionicons
                                name="download-outline"
                                size={14}
                                color={theme.brandAccent}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </Card>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Lightbox Modal */}
      <LightboxModal
        visible={lightboxVisible}
        onClose={() => setLightboxVisible(false)}
        title={previewTitle}
        imageUri={previewUri}
        pdfUri={previewUri}
        downloadUrl={activeDownloadUrl}
        filename={activeFilename}
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
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 40 },
  historyCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appDate: { fontSize: Typography.sizes.sm, fontWeight: '800' },
  appPatient: { fontSize: Typography.sizes.xs, marginTop: 2 },
  servicesList: {
    fontSize: Typography.sizes.xs,
    marginVertical: Spacing.sm,
    lineHeight: 18,
  },
  historyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: 4,
  },
  totalBill: { fontSize: Typography.sizes.md, fontWeight: '900' },
  viewReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  viewReportBtnText: { color: '#1C232D', fontSize: 10, fontWeight: '800' },
  downloadReportBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: { fontSize: Typography.sizes.xs, fontStyle: 'italic' },
  handshakeCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  handshakeIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  handshakeTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  handshakeDesc: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginVertical: Spacing.sm,
    lineHeight: 18,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    marginVertical: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  filesBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  filesBadgeText: { fontSize: 10, fontWeight: '800' },
  procBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginVertical: Spacing.xs,
  },
  procBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  procBadgeText: { fontSize: 10, fontWeight: '700' },
  scanItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  scanLabel: { fontSize: Typography.sizes.xs, fontWeight: '700' },
  certNo: { fontSize: 10, fontWeight: '800', marginTop: 1 },
  previewFileBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
  },
  previewFileBtnText: { color: '#1C232D', fontSize: 10, fontWeight: '800' },
  downloadFileIconBtn: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});