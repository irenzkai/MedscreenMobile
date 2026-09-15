import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
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
import { LightboxModal } from '../../components/common/LightboxModal';
import {
  formatCurrency,
  formatDate,
  formatTimeSlot,
  formatPatientName,
  formatAddress,
} from '../../utils/formatters';
import { CONFIG } from '../../constants/config';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'AppointmentDetail'>;

export const AppointmentDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { appointmentId } = route.params;
  const theme = useTheme();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Lightbox preview states
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [previewPdfUri, setPreviewPdfUri] = useState<string | null>(null);

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

  const isExpired = appointment.status === 'expired';
  const isBulk = !!appointment.batch_id;
  const isDependent = !!appointment.dependent_id;
  const categoryLabel = isBulk ? 'BULK' : isDependent ? 'DEPENDENT' : 'PERSONAL';

  const canResubmit =
    (appointment.status === 'returned' || appointment.status === 'canceled' || isExpired) &&
    appointment.status !== 'released';

  const canCancel =
    ['pending', 'approved', 'returned'].includes(appointment.status) && !isExpired;

  const openPreview = (uri: string, title: string) => {
    const fullUrl = uri.startsWith('http') ? uri : `${CONFIG.WEB_BASE_URL}/storage/${uri}`;
    const isPdf = fullUrl.toLowerCase().endsWith('.pdf');
    setPreviewTitle(title);
    if (isPdf) {
      setPreviewPdfUri(fullUrl);
      setPreviewImageUri(null);
    } else {
      setPreviewImageUri(fullUrl);
      setPreviewPdfUri(null);
    }
    setLightboxVisible(true);
  };

  const handleForwardResults = async () => {
    Alert.prompt
      ? Alert.prompt(
          'Forward Results',
          `Send encrypted PDF medical results for ${appointment.patient_name} to email:`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Send',
              onPress: async (email) => {
                try {
                  const res = await appointmentsApi.forwardResultEmail(appointment.id, email);
                  Alert.alert('Results Dispatched', res.message || 'Results have been forwarded.');
                } catch {
                  Alert.alert('Error', 'Could not forward results.');
                }
              },
            },
          ],
          'plain-text',
          appointment.patient_email || ''
        )
      : Alert.alert('Forward Results', `Send results to ${appointment.patient_email}?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send',
            onPress: async () => {
              try {
                const res = await appointmentsApi.forwardResultEmail(appointment.id);
                Alert.alert('Results Dispatched', res.message || 'Results have been forwarded.');
              } catch {
                Alert.alert('Error', 'Could not forward results.');
              }
            },
          },
        ]);
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
        {/* Status Alert Banner */}
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
                {appointment.patient_age} Years Old | {appointment.patient_sex?.toUpperCase() || 'N/A'}
              </Text>
            </View>
            <Badge status={appointment.status} isExpired={isExpired} size="md" />
          </View>

          {/* Feedback for Returned Status */}
          {appointment.status === 'returned' && appointment.return_reason && (
            <View style={[styles.noticeBox, { backgroundColor: 'rgba(220, 53, 69, 0.08)', borderColor: theme.danger }]}>
              <Ionicons name="warning" size={16} color={theme.danger} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.noticeTitle, { color: theme.danger }]}>Correction Needed</Text>
                <Text style={[styles.noticeText, { color: theme.textMain }]}>"{appointment.return_reason}"</Text>
              </View>
            </View>
          )}

          {/* Retesting Alert */}
          {appointment.status === 'retest' && (
            <View style={[styles.noticeBox, { backgroundColor: 'rgba(253, 126, 20, 0.08)', borderColor: theme.warning }]}>
              <Ionicons name="alert-circle" size={16} color={theme.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.noticeTitle, { color: theme.warning }]}>Action Required: Retesting Needed</Text>
                <Text style={[styles.noticeText, { color: theme.textMain }]}>
                  Please return to the Medscreen Diagnostic Laboratory as soon as possible. Your clinical sample requires recollection.
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Schedule & Location Card */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: theme.brandAccent }]}>
            <Ionicons name="calendar-outline" size={14} /> Schedule & Location
          </Text>
          <View style={styles.keyValueRow}>
            <Text style={[styles.keyText, { color: theme.textMuted }]}>Visit Date:</Text>
            <Text style={[styles.valText, { color: theme.textMain }]}>{formatDate(appointment.appointment_date)}</Text>
          </View>
          <View style={styles.keyValueRow}>
            <Text style={[styles.keyText, { color: theme.textMuted }]}>Time Slot:</Text>
            <Text style={[styles.valText, { color: theme.textMain }]}>{formatTimeSlot(appointment.time_slot)}</Text>
          </View>
          <View style={styles.keyValueRow}>
            <Text style={[styles.keyText, { color: theme.textMuted }]}>Contact Phone:</Text>
            <Text style={[styles.valText, { color: theme.textMain }]}>{appointment.patient_phone || 'N/A'}</Text>
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
                <Text style={[styles.testName, { color: theme.textMain }]}>{s.name.toUpperCase()}</Text>
                {s.preparation ? (
                  <Text style={[styles.testPrep, { color: theme.textMuted }]}>Prep: {s.preparation}</Text>
                ) : null}
              </View>
              <Text style={[styles.testPrice, { color: theme.textMain }]}>{formatCurrency(s.price)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.brandAccent }]}>TOTAL BILLING</Text>
            <Text style={[styles.totalAmount, { color: theme.brandAccent }]}>
              {formatCurrency(appointment.payment_amount || 0)}
            </Text>
          </View>
        </Card>

        {/* Doctor's Referral Attachment Card */}
        {appointment.referral_note && (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: theme.brandAccent }]}>
              <Ionicons name="attach-outline" size={14} /> Doctor's Referral Note
            </Text>
            <TouchableOpacity
              style={[styles.attachmentTrigger, { backgroundColor: theme.surfaceSubtle }]}
              onPress={() => openPreview(appointment.referral_note!, "Doctor's Referral Note")}>
              <Ionicons name="document-attach" size={24} color={theme.brandAccent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.attachName, { color: theme.textMain }]}>Referral Document Attached</Text>
                <Text style={[styles.attachSub, { color: theme.textMuted }]}>Tap to open preview</Text>
              </View>
              <Ionicons name="eye-outline" size={18} color={theme.brandAccent} />
            </TouchableOpacity>
          </Card>
        )}

        {/* Payment Settlement Card */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: theme.brandAccent }]}>
            <Ionicons name="card-outline" size={14} /> Payment Details
          </Text>
          <View style={styles.keyValueRow}>
            <Text style={[styles.keyText, { color: theme.textMuted }]}>Method:</Text>
            <Text style={[styles.valText, { color: theme.textMain }]}>{appointment.payment_method}</Text>
          </View>
          <View style={styles.keyValueRow}>
            <Text style={[styles.keyText, { color: theme.textMuted }]}>Status:</Text>
            <Text
              style={[
                styles.valText,
                { color: appointment.payment_status === 'paid' ? theme.success : theme.warning, fontWeight: '800' },
              ]}>
              {appointment.payment_status.toUpperCase()}
            </Text>
          </View>

          {/* Proof of Payment Receipt View */}
          {appointment.payment_receipt && (
            <TouchableOpacity
              style={[styles.attachmentTrigger, { backgroundColor: theme.surfaceSubtle, marginTop: Spacing.sm }]}
              onPress={() => openPreview(appointment.payment_receipt!, 'Proof of Payment Receipt')}>
              <Ionicons name="receipt-outline" size={24} color={theme.brandAccent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.attachName, { color: theme.textMain }]}>Proof of Payment Receipt</Text>
                <Text style={[styles.attachSub, { color: theme.textMuted }]}>Tap to view full receipt</Text>
              </View>
              <Ionicons name="eye-outline" size={18} color={theme.brandAccent} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Released Results Section */}
        {appointment.status === 'released' && (
          <Card style={[styles.sectionCard, { borderColor: theme.brandAccent, borderWidth: 1.5 }]}>
            <Text style={[styles.sectionTitle, { color: theme.brandAccent }]}>
              <Ionicons name="shield-checkmark" size={16} /> Clinical Results Released
            </Text>
            <Text style={[styles.releasedSub, { color: theme.textMuted }]}>
              Your clinical reports have been reviewed and approved by laboratory specialists.
            </Text>

            <View style={styles.resultsButtonsRow}>
              <Button
                title="Preview Result PDF"
                variant="primary"
                icon={<Ionicons name="document-text-outline" size={16} color="#1C232D" />}
                onPress={() =>
                  openPreview(
                    `${CONFIG.WEB_BASE_URL}/appointments/${appointment.id}/result/lab/preview`,
                    'Laboratory Result'
                  )
                }
                style={{ flex: 1 }}
              />
              <Button
                title="Forward"
                variant="outline"
                icon={<Ionicons name="mail-outline" size={16} color={theme.brandAccent} />}
                onPress={handleForwardResults}
                style={{ width: 110 }}
              />
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
              onPress={() => navigation.navigate('ResubmitAppointment', { appointmentId: appointment.id })}
              style={{ marginBottom: Spacing.sm }}
            />
          )}

          {canCancel && (
            <Button
              title="Cancel Appointment"
              variant="danger"
              size="md"
              icon={<Ionicons name="close-circle-outline" size={16} color="#FFFFFF" />}
              onPress={() => navigation.goBack()}
            />
          )}
        </View>
      </ScrollView>

      {/* Lightbox Modal */}
      <LightboxModal
        visible={lightboxVisible}
        onClose={() => setLightboxVisible(false)}
        title={previewTitle}
        imageUri={previewImageUri}
        pdfUri={previewPdfUri}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.md, paddingBottom: 60 },
  loadingText: { marginTop: Spacing.sm, fontSize: Typography.sizes.xs },
  errorTitle: { fontSize: Typography.sizes.md, fontWeight: '800', marginTop: Spacing.sm, marginBottom: Spacing.md },
  statusCard: { padding: Spacing.lg, marginBottom: Spacing.md },
  statusHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientHeading: { fontSize: Typography.sizes.md, fontWeight: '900', textTransform: 'uppercase' },
  demographicSub: { fontSize: Typography.sizes.xs, marginTop: 4 },
  noticeBox: { flexDirection: 'row', padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, marginTop: Spacing.md, gap: Spacing.xs, alignItems: 'center' },
  noticeTitle: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
  noticeText: { fontSize: Typography.sizes.xs - 1, marginTop: 2, lineHeight: 16 },
  sectionCard: { padding: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  keyValueRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  keyText: { fontSize: Typography.sizes.xs, fontWeight: '600' },
  valText: { fontSize: Typography.sizes.xs, fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: Spacing.sm },
  testItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs, borderBottomWidth: 1 },
  testName: { fontSize: Typography.sizes.xs, fontWeight: '700' },
  testPrep: { fontSize: Typography.sizes.xs - 2, marginTop: 2 },
  testPrice: { fontSize: Typography.sizes.xs, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, paddingTop: Spacing.sm },
  totalLabel: { fontSize: Typography.sizes.xs, fontWeight: '800', letterSpacing: 1 },
  totalAmount: { fontSize: Typography.sizes.lg, fontWeight: '900' },
  attachmentTrigger: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.sm },
  attachName: { fontSize: Typography.sizes.xs, fontWeight: '800' },
  attachSub: { fontSize: Typography.sizes.xs - 2, marginTop: 2 },
  releasedSub: { fontSize: Typography.sizes.xs, lineHeight: 18, marginBottom: Spacing.md },
  resultsButtonsRow: { flexDirection: 'row', gap: Spacing.sm },
  bottomActions: { marginTop: Spacing.md },
});