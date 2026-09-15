import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../hooks/useTheme';
import { appointmentsApi } from '../../services/api/appointments';
import { servicesApi } from '../../services/api/services';
import {
  Appointment,
  Service,
  PaymentProvider,
  SlotOccupancyResponse,
  Sex,
  PaymentMethod,
} from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ServiceItem } from '../../components/appointments/ServiceItem';
import { TimeSlotPicker } from '../../components/appointments/TimeSlotPicker';
import { LightboxModal } from '../../components/common/LightboxModal';
import {
  validateName,
  validateSuffix,
  validateBirthdate,
  validatePhone,
  validateRequired,
} from '../../utils/validators';
import {
  formatCurrency,
  formatDisplayPhone,
  formatToStandardPhone,
} from '../../utils/formatters';
import { CONFIG } from '../../constants/config';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ResubmitAppointment'>;

interface AttachedFile {
  uri: string;
  name: string;
  mimeType: string;
}

export const ResubmitAppointmentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { appointmentId } = route.params;
  const theme = useTheme();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Demographics
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [noMiddleName, setNoMiddleName] = useState(false);
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [sex, setSex] = useState<Sex>('Male');
  const [birthdate, setBirthdate] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [street, setStreet] = useState('');

  // Tests & Schedule
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [occupancyData, setOccupancyData] = useState<SlotOccupancyResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Payment & Attachments
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [receiptFile, setReceiptFile] = useState<AttachedFile | null>(null);
  const [referralFile, setReferralFile] = useState<AttachedFile | null>(null);

  // Lightbox
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const [appRes, svcList, provList] = await Promise.all([
          appointmentsApi.getAppointments(),
          servicesApi.getServices(),
          servicesApi.getPaymentProviders(),
        ]);

        setAllServices(svcList);
        setPaymentProviders(provList);
        if (provList.length > 0) setSelectedProvider(provList[0]);

        const match =
          appRes.self.find((a) => a.id === appointmentId) ||
          appRes.dependents.find((a) => a.id === appointmentId);

        if (match) {
          setAppointment(match);
          setFirstName(match.patient_first_name || '');
          setMiddleName(match.patient_middle_name === 'N/A' ? '' : match.patient_middle_name || '');
          setNoMiddleName(match.patient_middle_name === 'N/A');
          setLastName(match.patient_last_name || '');
          setSuffix(match.patient_suffix || '');
          setSex(match.patient_sex || 'Male');
          setBirthdate(match.patient_birthdate ? match.patient_birthdate.split('T')[0] : '');
          setPhoneDisplay(formatDisplayPhone(match.patient_phone));
          setStreet(match.patient_street || '');
          setPaymentMethod(match.payment_method);
          setSelectedServiceIds(match.services ? match.services.map((s) => s.id) : []);
        }
      } catch (err) {
        console.error('Failed to initialize resubmit form:', err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [appointmentId]);

  const handleDateChange = async (dateStr: string) => {
    setAppointmentDate(dateStr);
    setSelectedSlot(null);
    if (!dateStr) return;

    setLoadingSlots(true);
    try {
      const res = await appointmentsApi.checkSlots(dateStr, appointmentId);
      setOccupancyData(res);
    } catch {
      Alert.alert('Error', 'Unable to check time slot availability.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleToggleTest = (svc: Service) => {
    setSelectedServiceIds((prev) =>
      prev.includes(svc.id) ? prev.filter((id) => id !== svc.id) : [...prev, svc.id]
    );
  };

  const totalBill = useMemo(() => {
    return allServices
      .filter((s) => selectedServiceIds.includes(s.id))
      .reduce((sum, s) => sum + Number(s.price), 0);
  }, [allServices, selectedServiceIds]);

  const pickFile = async (type: 'referral' | 'receipt') => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const file = res.assets[0];
        const attached = {
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType || 'image/jpeg',
        };
        if (type === 'referral') setReferralFile(attached);
        else setReceiptFile(attached);
      }
    } catch {
      Alert.alert('File Picker Error', 'Could not select document.');
    }
  };

  const handleResubmit = async () => {
    if (!appointment) return;

    const fnErr = validateName(firstName, 'First Name');
    const lnErr = validateName(lastName, 'Last Name');
    const bdayErr = validateBirthdate(birthdate, !!appointment.dependent_id);
    const phoneErr = validatePhone(formatToStandardPhone(phoneDisplay));
    const streetErr = validateRequired(street, 'Street');

    if (fnErr || lnErr || bdayErr || phoneErr || streetErr) {
      Alert.alert('Omissions Found', 'Please correct the highlighted errors before submitting.');
      return;
    }

    if (selectedServiceIds.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one laboratory test.');
      return;
    }

    if (!appointmentDate || !selectedSlot) {
      Alert.alert('Schedule Required', 'Please choose a new preferred visit date and available time slot.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('patient_first_name', firstName.trim().toUpperCase());
      formData.append('patient_middle_name', noMiddleName ? 'N/A' : middleName.trim().toUpperCase() || 'N/A');
      formData.append('patient_last_name', lastName.trim().toUpperCase());
      if (suffix.trim()) formData.append('patient_suffix', suffix.trim().toUpperCase());
      formData.append('patient_sex', sex);
      formData.append('patient_birthdate', birthdate.trim());
      formData.append('patient_phone', formatToStandardPhone(phoneDisplay));
      formData.append('patient_province', appointment.patient_province || '');
      formData.append('patient_city', appointment.patient_city || '');
      formData.append('patient_barangay', appointment.patient_barangay || '');
      formData.append('patient_street', street.trim().toUpperCase());
      formData.append('appointment_date', appointmentDate);
      formData.append('time_slot', selectedSlot);
      formData.append('payment_method', paymentMethod);

      selectedServiceIds.forEach((id) => formData.append('service_ids[]', String(id)));

      if (referralFile) {
        formData.append('referral_note', {
          uri: referralFile.uri,
          name: referralFile.name,
          type: referralFile.mimeType,
        } as any);
      }

      if (paymentMethod === 'Cashless' && receiptFile) {
        formData.append('payment_receipt', {
          uri: receiptFile.uri,
          name: receiptFile.name,
          type: receiptFile.mimeType,
        } as any);
      }

      const res = await appointmentsApi.resubmitAppointment(appointment.id, formData);
      if (res.success) {
        Alert.alert(
          'Appointment Resubmitted',
          'Your schedule adjustments and updated information have been submitted for approval.',
          [{ text: 'OK', onPress: () => navigation.navigate('Appointments') }]
        );
      }
    } catch (err: any) {
      Alert.alert('Resubmission Failed', err?.message || 'Could not resubmit appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: theme.bgMain }]}>
        <ActivityIndicator size="large" color={theme.brandAccent} />
      </View>
    );
  }

  const isPaidRollover = appointment?.payment_status === 'paid';

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <Header
        title={`Resubmit #${appointmentId}`}
        subtitle="Schedule & Details Correction"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Status Context Banner */}
        {appointment?.status === 'returned' && appointment.return_reason && (
          <Card variant="danger" style={styles.alertCard}>
            <Ionicons name="warning" size={20} color={theme.danger} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: theme.danger }]}>Action Required: Correction Requested</Text>
              <Text style={[styles.alertMsg, { color: theme.textMain }]}>"{appointment.return_reason}"</Text>
            </View>
          </Card>
        )}

        {isPaidRollover && (
          <Card variant="accent" style={styles.alertCard}>
            <Ionicons name="shield-checkmark" size={20} color={theme.brandAccent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: theme.brandAccent }]}>Payment Rollover Active</Text>
              <Text style={[styles.alertMsg, { color: theme.textMain }]}>
                Your previously confirmed payment will be rolled over. No new payment receipt is needed.
              </Text>
            </View>
          </Card>
        )}

        {/* Demographics Card */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.cardHeading, { color: theme.brandAccent }]}>1. Patient Details</Text>
          <Input label="First Name" value={firstName} onChangeText={setFirstName} isRequired />
          <View style={styles.middleNameHeader}>
            <Text style={[styles.smallLabel, { color: theme.textMuted }]}>MIDDLE NAME</Text>
            <View style={styles.switchRow}>
              <Text style={[styles.noneText, { color: theme.textMuted }]}>None</Text>
              <Switch
                value={noMiddleName}
                onValueChange={(val) => {
                  setNoMiddleName(val);
                  if (val) setMiddleName('');
                }}
                thumbColor={noMiddleName ? theme.brandAccent : '#CCC'}
              />
            </View>
          </View>
          {!noMiddleName && <Input value={middleName} onChangeText={setMiddleName} />}
          <Input label="Last Name" value={lastName} onChangeText={setLastName} isRequired />
          <Input label="Suffix" value={suffix} onChangeText={setSuffix} placeholder="e.g. JR" />
          <Input label="Birthdate" value={birthdate} onChangeText={setBirthdate} isRequired />
          <Input
            label="Contact Phone"
            prefixText="09"
            value={phoneDisplay}
            onChangeText={(t) => setPhoneDisplay(t.replace(/[^0-9]/g, '').slice(0, 9))}
            keyboardType="number-pad"
            isRequired
          />
          <Input label="Street / House No." value={street} onChangeText={setStreet} isRequired />
        </Card>

        {/* Tests Card */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.cardHeading, { color: theme.brandAccent }]}>2. Medical Examinations</Text>
          {allServices.map((svc) => (
            <ServiceItem
              key={svc.id}
              service={svc}
              selected={selectedServiceIds.includes(svc.id)}
              onToggle={handleToggleTest}
            />
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.textMuted }]}>Total Bill:</Text>
            <Text style={[styles.totalVal, { color: theme.brandAccent }]}>{formatCurrency(totalBill)}</Text>
          </View>
        </Card>

        {/* Schedule Card */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.cardHeading, { color: theme.brandAccent }]}>3. Select New Visit Schedule</Text>
          <Input
            label="Preferred Date (YYYY-MM-DD)"
            value={appointmentDate}
            onChangeText={handleDateChange}
            placeholder="YYYY-MM-DD"
            isRequired
          />
          <TimeSlotPicker
            date={appointmentDate}
            selectedSlot={selectedSlot}
            onSelectSlot={(slot) => setSelectedSlot(slot)}
            occupancyData={occupancyData}
            loading={loadingSlots}
          />
        </Card>

        {/* Submit */}
        <Button
          title="Submit Resubmission"
          onPress={handleResubmit}
          loading={submitting}
          size="lg"
          style={{ marginTop: Spacing.md }}
        />
      </ScrollView>

      <LightboxModal
        visible={lightboxVisible}
        onClose={() => setLightboxVisible(false)}
        title={lightboxTitle}
        imageUri={lightboxUri}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.md, paddingBottom: 60 },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, marginBottom: Spacing.md },
  alertTitle: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
  alertMsg: { fontSize: Typography.sizes.xs - 1, marginTop: 2, lineHeight: 16 },
  sectionCard: { padding: Spacing.md, marginBottom: Spacing.md },
  cardHeading: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  middleNameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noneText: { fontSize: Typography.sizes.xs, fontWeight: '600' },
  smallLabel: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  totalLabel: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
  totalVal: { fontSize: Typography.sizes.lg, fontWeight: '900' },
});