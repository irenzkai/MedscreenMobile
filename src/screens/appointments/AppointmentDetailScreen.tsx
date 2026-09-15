import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../hooks/useTheme';
import { appointmentsApi } from '../../services/api/appointments';
import { Appointment } from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ActionModal } from '../../components/common/ActionModal';
import { LightboxModal } from '../../components/common/LightboxModal';
import {
  resolveFileUrl,
  downloadFile,
  getAppointmentResultApiUrl,
  isImageDocument,
} from '../../utils/fileHelpers';
import {
  formatCurrency,
  formatDate,
  formatTimeSlot,
  formatPatientName,
  formatAddress,
  isAppointmentExpired,
  getEffectiveAppointmentStatus,
  calculatePatientAge,
} from '../../utils/formatters';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'AppointmentDetail'>;

interface ResultReportItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  previewUrl: string;
  downloadUrl: string;
  filename: string;
  isImage: boolean;
}

export const AppointmentDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { appointmentId } = route.params;
  const theme = useTheme();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [forwardLoading, setForwardLoading] = useState<boolean>(false);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);

  // Unified Modals State
  const [forwardConfirmVisible, setForwardConfirmVisible] = useState<boolean>(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState<boolean>(false);
  const [successModalConfig, setSuccessModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  // Lightbox modal state
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewTarget, setPreviewTarget] = useState<string | null>(null);
  const [activeDownloadUrl, setActiveDownloadUrl] = useState<string | null>(null);
  const [activeFilename, setActiveFilename] = useState<string>('document.pdf');

  const loadDetails = async () => {
    try {
      const res = await appointmentsApi.getAppointments();
      const match =
        res.self.find((a) => a.id === appointmentId) ||
        res.dependents.find((a) => a.id === appointmentId);
      if (match) {
        setAppointment(match);
      }
    } catch (err) {
      console.error('Failed to load appointment details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [appointmentId]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: theme.bgMain }]}>
        <ActivityIndicator size="large" color={theme.brandAccent} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>
          Loading appointment record...
        </Text>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: theme.bgMain }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
        <Text style={[styles.errorTitle, { color: theme.textMain }]}>Record Not Found</Text>
        <Button title="Go Back" variant="outline" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const isExpired = isAppointmentExpired(appointment);
  const effectiveStatus = getEffectiveAppointmentStatus(appointment);
  const displayAge = calculatePatientAge(appointment);

  const isBulk = !!appointment.batch_id;
  const isDependent = !!appointment.dependent_id;
  const categoryLabel = isBulk ? 'BULK' : isDependent ? 'DEPENDENT' : 'PERSONAL';

  const canResubmit =
    (effectiveStatus === 'returned' ||
      effectiveStatus === 'canceled' ||
      effectiveStatus === 'expired') &&
    appointment.status !== 'released';

  const canCancel =
    ['pending', 'approved', 'returned'].includes(effectiveStatus) && !isExpired;

  // Compile multiple available clinical reports for released appointments
  const availableReports: ResultReportItem[] = [];
  if (effectiveStatus === 'released') {
    const included = appointment.result?.included_reports || [];
    const serviceNames = (appointment.services || []).map((s) => s.name.toUpperCase());

    if (
      included.includes('lab') ||
      included.length === 0 ||
      serviceNames.some(
        (n) => !n.includes('X-RAY') && !n.includes('DRUG') && !n.includes('CERTIFICATE')
      )
    ) {
      const isScanImage = isImageDocument((appointment.result as any)?.lab_scan);
      availableReports.push({
        key: 'lab',
        label: 'Laboratory Examination Report',
        icon: 'flask-outline',
        previewUrl: isScanImage
          ? resolveFileUrl((appointment.result as any)?.lab_scan)
          : getAppointmentResultApiUrl(appointment.id, 'lab', 'preview'),
        downloadUrl: getAppointmentResultApiUrl(appointment.id, 'lab', 'download'),
        filename: `Medscreen_Lab_Result_${appointment.id}.pdf`,
        isImage: isScanImage,
      });
    }

    if (
      included.includes('radio') ||
      serviceNames.some((n) => n.includes('X-RAY') || n.includes('XRAY'))
    ) {
      const scanUri =
        (appointment.result as any)?.radio_scan || (appointment.result as any)?.xray_image;
      const isScanImage = isImageDocument(scanUri);
      availableReports.push({
        key: 'radio',
        label: 'Radiology / Chest X-Ray',
        icon: 'scan-outline',
        previewUrl: isScanImage
          ? resolveFileUrl(scanUri)
          : getAppointmentResultApiUrl(appointment.id, 'radio', 'preview'),
        downloadUrl: getAppointmentResultApiUrl(appointment.id, 'radio', 'download'),
        filename: `Medscreen_Radiology_${appointment.id}.pdf`,
        isImage: isScanImage,
      });
    }

    if (included.includes('drug') || serviceNames.some((n) => n.includes('DRUG TEST'))) {
      const isScanImage = isImageDocument((appointment.result as any)?.drug_test_scan);
      availableReports.push({
        key: 'drug',
        label: 'Drug Test Certificate (CCDT)',
        icon: 'shield-checkmark-outline',
        previewUrl: isScanImage
          ? resolveFileUrl((appointment.result as any)?.drug_test_scan)
          : getAppointmentResultApiUrl(appointment.id, 'drug', 'preview'),
        downloadUrl: getAppointmentResultApiUrl(appointment.id, 'drug', 'download'),
        filename: `Medscreen_DrugTest_${appointment.id}.pdf`,
        isImage: isScanImage,
      });
    }

    if (
      included.includes('med_cert') ||
      serviceNames.some((n) => n.includes('MEDICAL CERTIFICATE'))
    ) {
      const isScanImage = isImageDocument((appointment.result as any)?.med_cert_scan);
      availableReports.push({
        key: 'med_cert',
        label: 'Medical Fitness Certificate',
        icon: 'ribbon-outline',
        previewUrl: isScanImage
          ? resolveFileUrl((appointment.result as any)?.med_cert_scan)
          : getAppointmentResultApiUrl(appointment.id, 'med_cert', 'preview'),
        downloadUrl: getAppointmentResultApiUrl(appointment.id, 'med_cert', 'download'),
        filename: `Medscreen_MedCert_${appointment.id}.pdf`,
        isImage: isScanImage,
      });
    }
  }

  const openPreview = (
    uri: string,
    title: string,
    downloadEndpoint?: string,
    suggestedFilename?: string
  ) => {
    setPreviewTitle(title);
    setPreviewTarget(uri);
    setActiveDownloadUrl(downloadEndpoint || uri);
    setActiveFilename(suggestedFilename || 'document.pdf');
    setLightboxVisible(true);
  };

  const handleDownloadSpecificResult = async (item: ResultReportItem) => {
    setDownloadingKey(item.key);
    await downloadFile(item.downloadUrl, item.filename);
    setDownloadingKey(null);
  };

  // Forward Results via ActionModal
  const handleExecuteForwardResults = async () => {
    setForwardLoading(true);
    try {
      const res = await appointmentsApi.forwardResultEmail(appointment.id);
      setForwardConfirmVisible(false);
      setSuccessModalConfig({
        visible: true,
        title: 'Results Dispatched',
        message:
          res.message ||
          `Encrypted medical results have been securely sent to ${appointment.patient_email}.`,
      });
    } catch {
      setForwardConfirmVisible(false);
    } finally {
      setForwardLoading(false);
    }
  };

  // Cancel Appointment via ActionModal
  const handleExecuteCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await appointmentsApi.cancelAppointment(appointment.id);
      setCancelConfirmVisible(false);
      setSuccessModalConfig({
        visible: true,
        title: 'Appointment Canceled',
        message: res.message || 'Your appointment booking has been successfully canceled.',
      });
      loadDetails();
    } catch {
      setCancelConfirmVisible(false);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <Header
        title={`REF #${appointment.id}`}
        subtitle={`${categoryLabel} BOOKING`}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeaderRow}>
            <View>
              <Text style={[styles.patientHeading, { color: theme.textMain }]}>
                {formatPatientName(
                  appointment.patient_first_name,
                  appointment.patient_middle_name,
                  appointment.patient_last_name,
                  appointment.patient_suffix
                )}
              </Text>
              <Text style={[styles.demographicSub, { color: theme.textMuted }]}>
                {displayAge} | {appointment.patient_sex?.toUpperCase() || 'N/A'}
              </Text>
            </View>
            <Badge status={effectiveStatus} isExpired={isExpired} size="md" />
          </View>

          {effectiveStatus === 'returned' && appointment.return_reason && (
            <View
              style={[
                styles.noticeBox,
                { backgroundColor: 'rgba(220, 53, 69, 0.08)', borderColor: theme.danger },
              ]}>
              <Ionicons name="warning" size={16} color={theme.danger} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.noticeTitle, { color: theme.danger }]}>Correction Needed</Text>
                <Text style={[styles.noticeText, { color: theme.textMain }]}>
                  "{appointment.return_reason}"
                </Text>
              </View>
            </View>
          )}

          {effectiveStatus === 'retest' && (
            <View
              style={[
                styles.noticeBox,
                { backgroundColor: 'rgba(253, 126, 20, 0.08)', borderColor: theme.warning },
              ]}>
              <Ionicons name="alert-circle" size={16} color={theme.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.noticeTitle, { color: theme.warning }]}>
                  Action Required: Retesting Needed
                </Text>
                <Text style={[styles.noticeText, { color: theme.textMain }]}>
                  Please return to the Medscreen Diagnostic Laboratory as soon as possible. Your clinical sample requires recollection.
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Schedule & Location */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: theme.brandAccent }]}>
            <Ionicons name="calendar-outline" size={14} /> Schedule & Location
          </Text>
          <View style={styles.keyValueRow}>
            <Text style={[styles.keyText, { color: theme.textMuted }]}>Visit Date:</Text>
            <Text style={[styles.valText, { color: theme.textMain }]}>
              {formatDate(appointment.appointment_date)}
            </Text>
          </View>
          <View style={styles.keyValueRow}>
            <Text style={[styles.keyText, { color: theme.textMuted }]}>Time Slot:</Text>
            <Text style={[styles.valText, { color: theme.textMain }]}>
              {formatTimeSlot(appointment.time_slot)}
            </Text>
          </View>
          <View style={styles.keyValueRow}>
            <Text style={[styles.keyText, { color: theme.textMuted }]}>Contact Phone:</Text>
            <Text style={[styles.valText, { color: theme.textMain }]}>
              {appointment.patient_phone || 'N/A'}
            </Text>
          </View>
          <View style={styles.keyValueRow}>
            <Text style={[styles.keyText, { color: theme.textMuted }]}>Residential Address:</Text>
            <Text style={[styles.valText, { color: theme.textMain }]}>
              {formatAddress(
                appointment.patient_street,
                appointment.patient_barangay,
                appointment.patient_city,
                appointment.patient_province
              )}
            </Text>
          </View>
        </Card>

        {/* Laboratory Request Breakdown */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: theme.brandAccent }]}>
            <Ionicons name="flask-outline" size={14} /> Laboratory Test Breakdown
          </Text>
          {appointment.services?.map((s) => (
            <View key={s.id} style={[styles.testItemRow, { borderBottomColor: theme.borderColor }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.testName, { color: theme.textMain }]}>
                  {s.name.toUpperCase()}
                </Text>
                {s.preparation ? (
                  <Text style={[styles.testPrep, { color: theme.textMuted }]}>
                    Prep: {s.preparation}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.testPrice, { color: theme.textMain }]}>
                {formatCurrency(s.price)}
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.brandAccent }]}>TOTAL BILLING</Text>
            <Text style={[styles.totalAmount, { color: theme.brandAccent }]}>
              {formatCurrency(appointment.payment_amount || 0)}
            </Text>
          </View>
        </Card>

        {/* Doctor's Referral Note */}
        {appointment.referral_note ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: theme.brandAccent }]}>
              <Ionicons name="attach-outline" size={14} /> Doctor's Referral Note
            </Text>
            <TouchableOpacity
              style={[styles.attachmentTrigger, { backgroundColor: theme.surfaceSubtle }]}
              onPress={() =>
                openPreview(
                  appointment.referral_note!,
                  "Doctor's Referral Note",
                  undefined,
                  `referral_${appointment.id}.jpg`
                )
              }>
              <Ionicons name="document-attach" size={24} color={theme.brandAccent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.attachName, { color: theme.textMain }]}>
                  Referral Document Attached
                </Text>
                <Text style={[styles.attachSub, { color: theme.textMuted }]}>
                  Tap to view in-app
                </Text>
              </View>
              <Ionicons name="eye-outline" size={18} color={theme.brandAccent} />
            </TouchableOpacity>
          </Card>
        ) : null}

        {/* Payment Details with Refund Indication */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: theme.brandAccent }]}>
            <Ionicons name="card-outline" size={14} /> Payment Details
          </Text>
          <View style={styles.keyValueRow}>
            <Text style={[styles.keyText, { color: theme.textMuted }]}>Method:</Text>
            <Text style={[styles.valText, { color: theme.textMain }]}>
              {appointment.payment_method}
            </Text>
          </View>
          <View style={styles.keyValueRow}>
            <Text style={[styles.keyText, { color: theme.textMuted }]}>Status:</Text>
            <Text
              style={[
                styles.valText,
                {
                  color:
                    appointment.payment_status === 'paid'
                      ? theme.success
                      : appointment.payment_status === 'refunded'
                      ? theme.info
                      : theme.warning,
                  fontWeight: '800',
                },
              ]}>
              {appointment.payment_status.toUpperCase()}
            </Text>
          </View>

          {appointment.payment_receipt ? (
            <TouchableOpacity
              style={[
                styles.attachmentTrigger,
                { backgroundColor: theme.surfaceSubtle, marginTop: Spacing.sm },
              ]}
              onPress={() =>
                openPreview(
                  appointment.payment_receipt!,
                  'Proof of Payment Receipt',
                  undefined,
                  `receipt_${appointment.id}.jpg`
                )
              }>
              <Ionicons name="receipt-outline" size={24} color={theme.brandAccent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.attachName, { color: theme.textMain }]}>
                  Proof of Payment Receipt
                </Text>
                <Text style={[styles.attachSub, { color: theme.textMuted }]}>
                  Tap to view full receipt in-app
                </Text>
              </View>
              <Ionicons name="eye-outline" size={18} color={theme.brandAccent} />
            </TouchableOpacity>
          ) : null}
        </Card>

        {/* Released Results Section - Supports MULTIPLE RESULT DOCUMENTS */}
        {effectiveStatus === 'released' && (
          <Card style={[styles.sectionCard, { borderColor: theme.brandAccent, borderWidth: 1.5 }]}>
            <View style={styles.resultsHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.brandAccent, marginBottom: 2 }]}>
                  <Ionicons name="shield-checkmark" size={16} /> Clinical Results Released
                </Text>
                <Text style={[styles.releasedSub, { color: theme.textMuted }]}>
                  {availableReports.length} clinical document{availableReports.length > 1 ? 's' : ''} available
                </Text>
              </View>
              <Button
                title="Forward"
                variant="outline"
                size="sm"
                icon={<Ionicons name="mail-outline" size={14} color={theme.brandAccent} />}
                onPress={() => setForwardConfirmVisible(true)}
              />
            </View>

            <View style={styles.reportsList}>
              {availableReports.map((report) => (
                <View
                  key={report.key}
                  style={[styles.reportItemCard, { backgroundColor: theme.surfaceSubtle }]}>
                  <View style={styles.reportInfoRow}>
                    <Ionicons name={report.icon} size={20} color={theme.brandAccent} />
                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <Text style={[styles.reportItemTitle, { color: theme.textMain }]}>
                        {report.label}
                      </Text>
                      <Text style={[styles.reportItemSub, { color: theme.textMuted }]}>
                        {report.isImage ? 'Image Scan' : 'PDF Document'} • Ready for preview
                      </Text>
                    </View>
                  </View>

                  <View style={styles.reportButtonsRow}>
                    <TouchableOpacity
                      style={[styles.reportPreviewBtn, { backgroundColor: theme.brandAccent }]}
                      onPress={() =>
                        openPreview(
                          report.previewUrl,
                          report.label,
                          report.downloadUrl,
                          report.filename
                        )
                      }>
                      <Ionicons name="eye-outline" size={14} color="#1C232D" />
                      <Text style={styles.reportPreviewBtnText}>PREVIEW</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.reportDownloadBtn,
                        { borderColor: theme.brandAccent, backgroundColor: theme.bgCard },
                      ]}
                      disabled={downloadingKey === report.key}
                      onPress={() => handleDownloadSpecificResult(report)}>
                      {downloadingKey === report.key ? (
                        <ActivityIndicator size="small" color={theme.brandAccent} />
                      ) : (
                        <>
                          <Ionicons name="download-outline" size={14} color={theme.brandAccent} />
                          <Text style={[styles.reportDownloadBtnText, { color: theme.brandAccent }]}>
                            SAVE
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Bottom Actions Bar */}
        <View style={styles.bottomActions}>
          {canResubmit && (
            <Button
              title="Update & Resubmit"
              variant="primary"
              size="lg"
              icon={<Ionicons name="refresh" size={16} color="#1C232D" />}
              onPress={() =>
                navigation.navigate('ResubmitAppointment', { appointmentId: appointment.id })
              }
              style={{ marginBottom: Spacing.sm }}
            />
          )}

          {canCancel && (
            <Button
              title="Cancel Appointment"
              variant="danger"
              size="md"
              icon={<Ionicons name="close-circle-outline" size={16} color="#FFFFFF" />}
              onPress={() => setCancelConfirmVisible(true)}
            />
          )}
        </View>
      </ScrollView>

      {/* UNIFIED MODAL: Forward Results Confirmation */}
      <ActionModal
        visible={forwardConfirmVisible}
        type="info"
        icon="mail-outline"
        title="Forward Results"
        message={`Send an encrypted, password-protected PDF copy of your clinical results to ${appointment.patient_email}?`}
        confirmText="Send Results"
        cancelText="Cancel"
        confirmVariant="primary"
        loading={forwardLoading}
        onClose={() => setForwardConfirmVisible(false)}
        onConfirm={handleExecuteForwardResults}
      />

      {/* UNIFIED MODAL: Cancel Appointment Confirmation */}
      <ActionModal
        visible={cancelConfirmVisible}
        type="danger"
        icon="close-circle-outline"
        title="Cancel Appointment"
        message={`Are you sure you want to cancel Appointment #${appointment.id}? The reserved schedule slot will be reopened.`}
        confirmText="Cancel Booking"
        cancelText="Keep"
        confirmVariant="danger"
        loading={cancelLoading}
        onClose={() => setCancelConfirmVisible(false)}
        onConfirm={handleExecuteCancel}
      />

      {/* UNIFIED MODAL: General Success Notification */}
      <ActionModal
        visible={successModalConfig.visible}
        type="success"
        title={successModalConfig.title}
        message={successModalConfig.message}
        isSingleAction={true}
        confirmText="OK"
        onClose={() => setSuccessModalConfig((prev) => ({ ...prev, visible: false }))}
      />

      {/* Lightbox Modal */}
      <LightboxModal
        visible={lightboxVisible}
        onClose={() => setLightboxVisible(false)}
        title={previewTitle}
        imageUri={previewTarget}
        pdfUri={previewTarget}
        downloadUrl={activeDownloadUrl}
        filename={activeFilename}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.md, paddingBottom: 60 },
  loadingText: { marginTop: Spacing.sm, fontSize: Typography.sizes.xs },
  errorTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '800',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statusCard: { padding: Spacing.lg, marginBottom: Spacing.md },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientHeading: {
    fontSize: Typography.sizes.md,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  demographicSub: { fontSize: Typography.sizes.xs, marginTop: 4 },
  noticeBox: {
    flexDirection: 'row',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  noticeTitle: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
  noticeText: { fontSize: Typography.sizes.xs - 1, marginTop: 2, lineHeight: 16 },
  sectionCard: { padding: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  keyValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  keyText: { fontSize: Typography.sizes.xs, fontWeight: '600' },
  valText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.sm,
  },
  testItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
  },
  testName: { fontSize: Typography.sizes.xs, fontWeight: '700' },
  testPrep: { fontSize: Typography.sizes.xs - 2, marginTop: 2 },
  testPrice: { fontSize: Typography.sizes.xs, fontWeight: '700' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
  },
  totalLabel: { fontSize: Typography.sizes.xs, fontWeight: '800', letterSpacing: 1 },
  totalAmount: { fontSize: Typography.sizes.lg, fontWeight: '900' },
  attachmentTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  attachName: { fontSize: Typography.sizes.xs, fontWeight: '800' },
  attachSub: { fontSize: Typography.sizes.xs - 2, marginTop: 2 },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  releasedSub: { fontSize: Typography.sizes.xs, lineHeight: 18 },
  reportsList: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  reportItemCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  reportInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reportItemTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  reportItemSub: {
    fontSize: 10,
    marginTop: 2,
  },
  reportButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  reportPreviewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  reportPreviewBtnText: {
    color: '#1C232D',
    fontSize: 11,
    fontWeight: '800',
  },
  reportDownloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  reportDownloadBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  bottomActions: { marginTop: Spacing.md },
});