import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
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
  SlotOccupancyResponse,
  Sex,
  PaymentMethod,
} from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { NoticeBox } from '../../components/common/NoticeBox';
import { ActionModal } from '../../components/common/ActionModal';
import { WizardProgressBar } from '../../components/appointments/WizardProgressBar';
import { ServiceItem } from '../../components/appointments/ServiceItem';
import { TimeSlotPicker } from '../../components/appointments/TimeSlotPicker';
import { LightboxModal } from '../../components/common/LightboxModal';
import { DatePickerModal } from '../../components/common/DatePickerModal';
import { AddressSelector } from '../../components/common/AddressSelector';
import {
  ScrollShortcutButton,
  useScrollShortcut,
} from '../../components/common/ScrollShortcutButton';
import {
  validateName,
  validateSuffix,
  validateBirthdate,
  validatePhone,
  validateRequired,
  calculateAge,
} from '../../utils/validators';
import {
  formatCurrency,
  formatDisplayPhone,
  formatToStandardPhone,
} from '../../utils/formatters';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ResubmitAppointment'>;

interface AttachedFile {
  uri: string;
  name: string;
  mimeType: string;
}

const RESUBMIT_STEP_LABELS = ['Details', 'Services', 'Schedule', 'Payment'];

export const ResubmitAppointmentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { appointmentId } = route.params;
  const theme = useTheme();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const { contentOffsetY, contentHeight, layoutHeight, handleScroll } = useScrollShortcut();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Demographics (Step 1)
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [noMiddleName, setNoMiddleName] = useState(false);
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [sex, setSex] = useState<Sex>('Male');
  const [birthdate, setBirthdate] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');

  // Address (Step 1)
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [barangay, setBarangay] = useState('');
  const [street, setStreet] = useState('');

  // Referral File (Step 1)
  const [referralFile, setReferralFile] = useState<AttachedFile | null>(null);

  // Tests & Search (Step 2)
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [testSearch, setTestSearch] = useState('');

  // Schedule (Step 3)
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedSlotDisplay, setSelectedSlotDisplay] = useState<string>('');
  const [occupancyData, setOccupancyData] = useState<SlotOccupancyResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotFetchError, setSlotFetchError] = useState<string | null>(null);

  // Payment (Step 4)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [receiptFile, setReceiptFile] = useState<AttachedFile | null>(null);

  // Modals & Popups
  const [showBirthdatePicker, setShowBirthdatePicker] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Unified Success Modal
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');

  const showError = (msg: string) => {
    setErrorBanner(msg);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  const applyAppointmentData = (match: Appointment) => {
    setFirstName(match.patient_first_name || '');
    setMiddleName(
      match.patient_middle_name === 'N/A' ? '' : match.patient_middle_name || ''
    );
    setNoMiddleName(match.patient_middle_name === 'N/A');
    setLastName(match.patient_last_name || '');
    setSuffix(match.patient_suffix || '');
    setSex((match.patient_sex as Sex) || 'Male');
    setBirthdate(
      match.patient_birthdate ? match.patient_birthdate.split('T')[0] : ''
    );
    setPhoneDisplay(formatDisplayPhone(match.patient_phone));
    setProvince(match.patient_province || '');
    setCity(match.patient_city || '');
    setBarangay(match.patient_barangay || '');
    setStreet(match.patient_street || '');
    setPaymentMethod(match.payment_method);
    setSelectedServiceIds(match.services ? match.services.map((s) => s.id) : []);

    if (match.appointment_date) {
      const rawDate = match.appointment_date.split('T')[0];
      setAppointmentDate(rawDate);
      handleDateChange(rawDate);
    }
  };

  useEffect(() => {
    const initData = async () => {
      try {
        const [appRes, svcList] = await Promise.all([
          appointmentsApi.getAppointments(),
          servicesApi.getServices(),
        ]);
        setAllServices(svcList);

        const match =
          appRes.self.find((a) => a.id === appointmentId) ||
          appRes.dependents.find((a) => a.id === appointmentId);

        if (match) {
          setAppointment(match);
          applyAppointmentData(match);
        }
      } catch (err) {
        console.error('Failed to initialize resubmit form:', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [appointmentId]);

  const handleResetToOriginal = () => {
    if (appointment) {
      setFieldErrors({});
      setErrorBanner(null);
      applyAppointmentData(appointment);
    }
  };

  const cleanIncompatibleServices = (newSex: Sex) => {
    setSelectedServiceIds((prev) =>
      prev.filter((id) => {
        const s = allServices.find((item) => item.id === id);
        if (!s) return true;
        if (s.gender_restriction === 'female' && newSex === 'Male') return false;
        if (s.gender_restriction === 'male' && newSex === 'Female') return false;
        return true;
      })
    );
  };

  const handleSexChange = (newSex: Sex) => {
    setSex(newSex);
    cleanIncompatibleServices(newSex);
  };

  const handleDateChange = async (dateStr: string) => {
    if (!dateStr) return;
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr < todayStr) {
      showError('Preferred visit date cannot be in the past.');
      return;
    }

    setAppointmentDate(dateStr);
    setSelectedSlot(null);
    setSelectedSlotDisplay('');
    setLoadingSlots(true);
    setSlotFetchError(null);

    try {
      const depId = appointment?.dependent_id ?? undefined;
      const res = await appointmentsApi.checkSlots(dateStr, appointmentId, depId);
      setOccupancyData(res);
    } catch {
      setSlotFetchError('Unable to check time slot availability. Please tap retry below.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleToggleTest = (svc: Service) => {
    if (svc.gender_restriction === 'female' && sex === 'Male') {
      showError(`"${svc.name}" is restricted to Female patients only.`);
      return;
    }
    if (svc.gender_restriction === 'male' && sex === 'Female') {
      showError(`"${svc.name}" is restricted to Male patients only.`);
      return;
    }

    setErrorBanner(null);
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
        const attached: AttachedFile = {
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType || 'image/jpeg',
        };
        if (type === 'referral') setReferralFile(attached);
        else setReceiptFile(attached);
      }
    } catch {
      showError('Could not access document picker.');
    }
  };

  const validateStep = (): boolean => {
    const errs: Record<string, string> = {};
    setErrorBanner(null);

    if (currentStep === 1) {
      const fnErr = validateName(firstName, 'First Name');
      if (fnErr) errs.firstName = fnErr;
      else if (!firstName.trim()) errs.firstName = 'First Name is required.';

      if (!noMiddleName && middleName.trim()) {
        const mnErr = validateName(middleName, 'Middle Name');
        if (mnErr) errs.middleName = mnErr;
      }

      const lnErr = validateName(lastName, 'Last Name');
      if (lnErr) errs.lastName = lnErr;
      else if (!lastName.trim()) errs.lastName = 'Last Name is required.';

      if (suffix.trim()) {
        const sfxErr = validateSuffix(suffix);
        if (sfxErr) errs.suffix = sfxErr;
      }

      const bdayErr = validateBirthdate(birthdate, !!appointment?.dependent_id);
      if (bdayErr) errs.birthdate = bdayErr;

      const phoneErr = validatePhone(formatToStandardPhone(phoneDisplay));
      if (phoneErr) errs.phone = phoneErr;

      const streetErr = validateRequired(street, 'Street address');
      if (streetErr) errs.street = streetErr;

      if (!province.trim()) errs.province = 'Province is required.';
      if (!city.trim()) errs.city = 'City / Municipality is required.';
      if (!barangay.trim()) errs.barangay = 'Barangay is required.';

      setFieldErrors(errs);
      if (Object.keys(errs).length > 0) {
        showError('Please correct the highlighted omissions before continuing.');
        return false;
      }
    } else if (currentStep === 2) {
      if (selectedServiceIds.length === 0) {
        showError('Please select at least one laboratory examination.');
        return false;
      }
    } else if (currentStep === 3) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (!appointmentDate || appointmentDate < todayStr) {
        showError('Please choose a valid visit date (today or in the future).');
        return false;
      }
      if (!selectedSlot) {
        showError('Please select an available appointment time block.');
        return false;
      }
    } else if (currentStep === 4) {
      const isPaid = appointment?.payment_status === 'paid';
      if (!isPaid && paymentMethod === 'Cashless' && !receiptFile) {
        showError('Please upload your payment transaction receipt.');
        return false;
      }
    }

    setFieldErrors({});
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleBack = () => {
    setFieldErrors({});
    setErrorBanner(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleFinalSubmit = async () => {
    if (!validateStep() || !appointment) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('patient_first_name', firstName.trim().toUpperCase());
      formData.append(
        'patient_middle_name',
        noMiddleName ? 'N/A' : middleName.trim().toUpperCase() || 'N/A'
      );
      formData.append('patient_last_name', lastName.trim().toUpperCase());
      if (suffix.trim()) formData.append('patient_suffix', suffix.trim().toUpperCase());
      formData.append('patient_sex', sex);
      formData.append('patient_birthdate', birthdate.trim());
      formData.append('patient_phone', formatToStandardPhone(phoneDisplay));
      formData.append('patient_province', province.trim().toUpperCase());
      formData.append('patient_city', city.trim().toUpperCase());
      formData.append('patient_barangay', barangay.trim().toUpperCase());
      formData.append('patient_street', street.trim().toUpperCase());
      formData.append('appointment_date', appointmentDate);
      formData.append('time_slot', selectedSlot || '');
      formData.append('payment_method', paymentMethod);

      selectedServiceIds.forEach((id) =>
        formData.append('service_ids[]', String(id))
      );

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
      if (res.success || (res as any).appointment) {
        setSuccessModalMessage(
          res.message ||
            'Your schedule adjustments and updated details have been submitted for clinical review.'
        );
        setSuccessModalVisible(true);
      }
    } catch (err: any) {
      showError(err?.message || 'Could not resubmit appointment. Please try again.');
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
  const liveAge = birthdate ? calculateAge(birthdate) : null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <Header
        title={`Resubmit #${appointmentId}`}
        subtitle={`Step ${currentStep} of 4: ${RESUBMIT_STEP_LABELS[currentStep - 1]}`}
        showBack
        onBack={() => (currentStep > 1 ? handleBack() : navigation.goBack())}
      />

      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <WizardProgressBar
          currentStep={currentStep}
          totalSteps={4}
          stepLabels={RESUBMIT_STEP_LABELS}
        />

        {errorBanner ? (
          <NoticeBox
            type="danger"
            message={errorBanner}
            onClose={() => setErrorBanner(null)}
            style={{ marginBottom: Spacing.md }}
          />
        ) : null}

        {/* Correction Feedback from Laboratory Staff */}
        {appointment?.status === 'returned' && appointment.return_reason && (
          <NoticeBox
            type="danger"
            title="Correction Requested"
            message={`"${appointment.return_reason}"`}
            style={{ marginBottom: Spacing.md }}
          />
        )}

        {/* STEP 1: PATIENT INFORMATION */}
        {currentStep === 1 && (
          <View>
            <View style={styles.stepTitleRow}>
              <View>
                <Text style={[styles.stepTitle, { color: theme.textMain }]}>
                  Patient Details
                </Text>
                <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
                  Correct patient identification, home address, and doctor referrals.
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleResetToOriginal}
                style={[
                  styles.resetHeaderBtn,
                  { borderColor: theme.brandAccent, backgroundColor: theme.surfaceSubtle },
                ]}
                hitSlop={8}>
                <Ionicons name="refresh-outline" size={12} color={theme.brandAccent} />
                <Text style={[styles.resetHeaderBtnText, { color: theme.brandAccent }]}>
                  RESET
                </Text>
              </TouchableOpacity>
            </View>

            <Card style={styles.stepCard}>
              <Input
                label="First Name"
                value={firstName}
                onChangeText={(t) => {
                  setFirstName(t);
                  if (fieldErrors.firstName) setFieldErrors((prev) => ({ ...prev, firstName: '' }));
                }}
                error={fieldErrors.firstName}
                isRequired
              />

              <View style={styles.middleNameHeader}>
                <Text style={[styles.smallLabel, { color: theme.textMuted }]}>MIDDLE NAME</Text>
                <View style={styles.switchRow}>
                  <Text style={[styles.noneText, { color: theme.textMuted }]}>None</Text>
                  <Switch
                    value={noMiddleName}
                    onValueChange={(val) => {
                      setNoMiddleName(val);
                      if (val) {
                        setMiddleName('');
                        setFieldErrors((prev) => ({ ...prev, middleName: '' }));
                      }
                    }}
                    thumbColor={noMiddleName ? theme.brandAccent : '#CCC'}
                  />
                </View>
              </View>
              {!noMiddleName && (
                <Input
                  value={middleName}
                  onChangeText={(t) => {
                    setMiddleName(t);
                    if (fieldErrors.middleName) setFieldErrors((prev) => ({ ...prev, middleName: '' }));
                  }}
                  error={fieldErrors.middleName}
                  placeholder="Middle Name"
                />
              )}

              <Input
                label="Last Name"
                value={lastName}
                onChangeText={(t) => {
                  setLastName(t);
                  if (fieldErrors.lastName) setFieldErrors((prev) => ({ ...prev, lastName: '' }));
                }}
                error={fieldErrors.lastName}
                isRequired
              />

              <Input
                label="Suffix"
                value={suffix}
                onChangeText={(t) => {
                  setSuffix(t);
                  if (fieldErrors.suffix) setFieldErrors((prev) => ({ ...prev, suffix: '' }));
                }}
                placeholder="e.g. JR, SR, III"
                error={fieldErrors.suffix}
              />

              {/* Birthdate */}
              <View style={styles.bdayFieldWrapper}>
                <Text style={[styles.smallLabel, { color: theme.textMuted, marginBottom: 4 }]}>
                  BIRTHDATE *
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowBirthdatePicker(true)}
                  style={[
                    styles.bdayTrigger,
                    {
                      backgroundColor: theme.bgCard,
                      borderColor: fieldErrors.birthdate ? theme.danger : theme.borderColor,
                      borderWidth: fieldErrors.birthdate ? 1.5 : 1,
                    },
                  ]}>
                  <Ionicons name="calendar" size={18} color={theme.brandAccent} style={{ marginRight: 8 }} />
                  <Text
                    style={[
                      styles.bdayTriggerText,
                      { color: birthdate ? theme.textMain : theme.textMuted },
                    ]}>
                    {birthdate ? birthdate : 'Tap to Select Birthdate'}
                  </Text>
                  {liveAge !== null && (
                    <View style={[styles.agePill, { backgroundColor: theme.surfaceSubtle }]}>
                      <Text style={[styles.agePillText, { color: theme.brandAccent }]}>
                        {liveAge} YRS OLD
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                {fieldErrors.birthdate ? (
                  <Text style={[styles.errorInline, { color: theme.danger }]}>
                    {fieldErrors.birthdate}
                  </Text>
                ) : null}
              </View>

              {/* Sex */}
              <Text style={[styles.smallLabel, { color: theme.textMuted, marginBottom: 6 }]}>
                SEX *
              </Text>
              <View style={styles.sexRow}>
                {(['Male', 'Female'] as Sex[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => handleSexChange(s)}
                    style={[
                      styles.sexBtn,
                      {
                        borderColor: sex === s ? theme.brandAccent : theme.borderColor,
                        backgroundColor: sex === s ? theme.surfaceSubtle : theme.bgCard,
                      },
                    ]}>
                    <Text
                      style={{
                        color: sex === s ? theme.brandAccent : theme.textMain,
                        fontWeight: '700',
                      }}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Contact Phone */}
              <Input
                label="Contact Phone"
                prefixText="09"
                value={phoneDisplay}
                onChangeText={(t) => {
                  setPhoneDisplay(t.replace(/[^0-9]/g, '').slice(0, 9));
                  if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                }}
                keyboardType="number-pad"
                error={fieldErrors.phone}
                isRequired
              />

              {/* Address */}
              <Text style={[styles.cardHeading, { color: theme.brandAccent, marginTop: Spacing.md }]}>
                Residential Address (PSGC)
              </Text>
              <AddressSelector
                province={province}
                city={city}
                barangay={barangay}
                street={street}
                errorStreet={fieldErrors.street}
                errorProvince={fieldErrors.province}
                errorCity={fieldErrors.city}
                errorBarangay={fieldErrors.barangay}
                onAddressChange={(addr) => {
                  setProvince(addr.province);
                  setCity(addr.city);
                  setBarangay(addr.barangay);
                  setStreet(addr.street);
                  setFieldErrors((prev) => ({
                    ...prev,
                    province: '',
                    city: '',
                    barangay: '',
                    street: '',
                  }));
                }}
              />

              {/* Referral Attachment */}
              <View style={[styles.attachmentBox, { borderTopColor: theme.borderColor }]}>
                <Text style={[styles.smallLabel, { color: theme.textMuted }]}>
                  DOCTOR'S REFERRAL NOTE (OPTIONAL)
                </Text>
                {referralFile ? (
                  <View style={styles.fileRow}>
                    <Ionicons name="document-text" size={20} color={theme.brandAccent} />
                    <Text style={[styles.fileName, { color: theme.textMain }]} numberOfLines={1}>
                      {referralFile.name}
                    </Text>
                    <TouchableOpacity onPress={() => setReferralFile(null)}>
                      <Ionicons name="close-circle" size={20} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Button
                    title="Upload Referral Note (Image/PDF)"
                    variant="outline"
                    size="sm"
                    icon={<Ionicons name="attach" size={16} color={theme.brandAccent} />}
                    onPress={() => pickFile('referral')}
                    style={{ marginTop: 6 }}
                  />
                )}
              </View>
            </Card>
          </View>
        )}

        {/* STEP 2: TEST SELECTION WITH DEDICATED SEARCH BAR */}
        {currentStep === 2 && (
          <View>
            <Text style={[styles.stepTitle, { color: theme.textMain }]}>
              Medical Examinations
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
              Add or revise requested diagnostic tests for a{' '}
              <Text style={{ color: theme.brandAccent, fontWeight: '800' }}>
                {sex.toUpperCase()}
              </Text>{' '}
              patient.
            </Text>

            {/* Dedicated Test Search Bar */}
            <Input
              placeholder="Search tests by examination name..."
              value={testSearch}
              onChangeText={setTestSearch}
              containerStyle={{ marginBottom: Spacing.sm }}
            />

            {allServices
              .filter(
                (s) =>
                  !testSearch ||
                  s.name.toLowerCase().includes(testSearch.toLowerCase())
              )
              .map((svc) => {
                const isRestricted =
                  (svc.gender_restriction === 'female' && sex === 'Male') ||
                  (svc.gender_restriction === 'male' && sex === 'Female');

                return (
                  <ServiceItem
                    key={svc.id}
                    service={svc}
                    selected={selectedServiceIds.includes(svc.id)}
                    onToggle={handleToggleTest}
                    disabled={isRestricted}
                    disabledReason={isRestricted ? `Unavailable for ${sex} patients` : undefined}
                  />
                );
              })}

            <Card style={[styles.stepCard, { marginTop: Spacing.sm }]}>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: theme.textMuted }]}>Total Bill:</Text>
                <Text style={[styles.totalVal, { color: theme.brandAccent }]}>
                  {formatCurrency(totalBill)}
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* STEP 3: VISIT SCHEDULE */}
        {currentStep === 3 && (
          <View>
            <Text style={[styles.stepTitle, { color: theme.textMain }]}>
              Select New Schedule
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
              Pick your preferred visit date and an open 1-hour appointment block.
            </Text>

            <Card style={styles.stepCard}>
              <View style={styles.bdayFieldWrapper}>
                <Text style={[styles.smallLabel, { color: theme.textMuted, marginBottom: 4 }]}>
                  PREFERRED DATE *
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowSchedulePicker(true)}
                  style={[
                    styles.bdayTrigger,
                    { backgroundColor: theme.bgCard, borderColor: theme.borderColor },
                  ]}>
                  <Ionicons name="calendar-outline" size={18} color={theme.brandAccent} style={{ marginRight: 8 }} />
                  <Text
                    style={[
                      styles.bdayTriggerText,
                      { color: appointmentDate ? theme.textMain : theme.textMuted },
                    ]}>
                    {appointmentDate ? appointmentDate : 'Tap to Select Visit Date'}
                  </Text>
                </TouchableOpacity>
              </View>

              {slotFetchError ? (
                <View style={{ marginBottom: Spacing.sm }}>
                  <NoticeBox type="danger" title="Occupancy Unavailable" message={slotFetchError} />
                  <Button
                    title="Retry Slot Check"
                    variant="outline-secondary"
                    size="sm"
                    onPress={() => appointmentDate && handleDateChange(appointmentDate)}
                    style={{ marginTop: 6 }}
                  />
                </View>
              ) : null}

              <TimeSlotPicker
                date={appointmentDate}
                selectedSlot={selectedSlot}
                onSelectSlot={(slot, disp) => {
                  setSelectedSlot(slot);
                  setSelectedSlotDisplay(disp);
                }}
                occupancyData={occupancyData}
                loading={loadingSlots}
              />
            </Card>
          </View>
        )}

        {/* STEP 4: PAYMENT & REVIEW */}
        {currentStep === 4 && (
          <View>
            <Text style={[styles.stepTitle, { color: theme.textMain }]}>
              Payment & Final Review
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
              Review your adjusted booking total and verify payment arrangement.
            </Text>

            <Card style={[styles.stepCard, { borderColor: theme.brandAccent }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.sumLabel, { color: theme.textMuted }]}>
                  Total Resubmission Bill
                </Text>
                <Text style={[styles.sumPrice, { color: theme.brandAccent }]}>
                  {formatCurrency(totalBill)}
                </Text>
              </View>
              <Text style={[styles.sumDetail, { color: theme.textMain }]}>
                {selectedServiceIds.length} Tests Selected • {appointmentDate} at{' '}
                {selectedSlotDisplay}
              </Text>
            </Card>

            {isPaidRollover ? (
              <NoticeBox
                type="success"
                title="Payment Rollover Confirmed"
                message="Your previous payment has already been verified and locked. It is automatically rolled over to this new schedule—no new receipt upload is required."
                style={{ marginTop: Spacing.sm }}
              />
            ) : (
              <Card style={[styles.stepCard, { marginTop: Spacing.sm }]}>
                <Text style={[styles.cardHeading, { color: theme.brandAccent }]}>
                  Payment Method
                </Text>
                <View style={styles.payMethodsRow}>
                  <TouchableOpacity
                    onPress={() => setPaymentMethod('Cash')}
                    style={[
                      styles.payMethodBtn,
                      {
                        borderColor:
                          paymentMethod === 'Cash' ? theme.brandAccent : theme.borderColor,
                        backgroundColor:
                          paymentMethod === 'Cash' ? theme.surfaceSubtle : theme.bgCard,
                      },
                    ]}>
                    <Ionicons
                      name="cash-outline"
                      size={24}
                      color={paymentMethod === 'Cash' ? theme.brandAccent : theme.textMuted}
                    />
                    <Text style={[styles.payMethodTitle, { color: theme.textMain }]}>
                      Cash on Site
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setPaymentMethod('Cashless')}
                    style={[
                      styles.payMethodBtn,
                      {
                        borderColor:
                          paymentMethod === 'Cashless' ? theme.brandAccent : theme.borderColor,
                        backgroundColor:
                          paymentMethod === 'Cashless' ? theme.surfaceSubtle : theme.bgCard,
                      },
                    ]}>
                    <Ionicons
                      name="qr-code-outline"
                      size={24}
                      color={paymentMethod === 'Cashless' ? theme.brandAccent : theme.textMuted}
                    />
                    <Text style={[styles.payMethodTitle, { color: theme.textMain }]}>
                      Online / E-Wallet
                    </Text>
                  </TouchableOpacity>
                </View>

                {paymentMethod === 'Cashless' && (
                  <View style={styles.receiptUploadBox}>
                    {receiptFile ? (
                      <View style={styles.fileRow}>
                        <Ionicons name="receipt" size={20} color={theme.brandAccent} />
                        <Text style={[styles.fileName, { color: theme.textMain }]} numberOfLines={1}>
                          {receiptFile.name}
                        </Text>
                        <TouchableOpacity onPress={() => setReceiptFile(null)}>
                          <Ionicons name="close-circle" size={20} color={theme.danger} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Button
                        title="Upload New Payment Receipt"
                        variant="primary"
                        size="sm"
                        icon={<Ionicons name="cloud-upload-outline" size={16} color="#1C232D" />}
                        onPress={() => pickFile('receipt')}
                        style={{ marginTop: 6 }}
                      />
                    )}
                  </View>
                )}
              </Card>
            )}
          </View>
        )}

        {/* Wizard Footer Actions */}
        <View style={styles.wizardFooter}>
          {currentStep > 1 && (
            <Button
              title="Back"
              variant="outline-secondary"
              onPress={handleBack}
              style={{ flex: 1 }}
            />
          )}
          <Button
            title={currentStep === 4 ? 'Submit Resubmission' : 'Next Step'}
            onPress={currentStep === 4 ? handleFinalSubmit : handleNext}
            loading={submitting}
            style={{ flex: currentStep > 1 ? 1.5 : 1 }}
          />
        </View>
      </ScrollView>

      <ScrollShortcutButton
        scrollViewRef={scrollViewRef}
        contentOffsetY={contentOffsetY}
        contentHeight={contentHeight}
        layoutHeight={layoutHeight}
      />

      {/* UNIFIED MODAL: Resubmission Success Acknowledgement */}
      <ActionModal
        visible={successModalVisible}
        type="success"
        title="Resubmitted Successfully"
        message={successModalMessage}
        isSingleAction={true}
        confirmText="View Bookings"
        onClose={() => {
          setSuccessModalVisible(false);
          navigation.navigate('PatientTabs', { screen: 'Appointments' });
        }}
      />

      {/* Date Picker Modals */}
      <DatePickerModal
        visible={showBirthdatePicker}
        initialDate={birthdate}
        isDependent={!!appointment?.dependent_id}
        mode="birthdate"
        onClose={() => setShowBirthdatePicker(false)}
        onSelectDate={(newDate) => {
          setBirthdate(newDate);
          if (fieldErrors.birthdate) setFieldErrors((prev) => ({ ...prev, birthdate: '' }));
        }}
      />

      <DatePickerModal
        visible={showSchedulePicker}
        initialDate={appointmentDate}
        mode="schedule"
        onClose={() => setShowSchedulePicker(false)}
        onSelectDate={(newDate) => handleDateChange(newDate)}
      />

      <LightboxModal
        visible={lightboxVisible}
        onClose={() => setLightboxVisible(false)}
        title={lightboxTitle}
        imageUri={lightboxUri}
        downloadUrl={lightboxUri}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.md, paddingBottom: 60 },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  stepTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  stepSubtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  resetHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  resetHeaderBtnText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stepCard: { padding: Spacing.md, marginBottom: Spacing.md },
  cardHeading: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  middleNameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noneText: { fontSize: Typography.sizes.xs, fontWeight: '600' },
  smallLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bdayFieldWrapper: { marginBottom: Spacing.md },
  bdayTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  bdayTriggerText: { flex: 1, fontSize: Typography.sizes.sm, fontWeight: '700' },
  agePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.sm },
  agePillText: { fontSize: 10, fontWeight: '800' },
  errorInline: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  sexRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  sexBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  totalVal: { fontSize: Typography.sizes.lg, fontWeight: '900' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sumLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sumPrice: { fontSize: Typography.sizes.xl, fontWeight: '900' },
  sumDetail: {
    fontSize: Typography.sizes.xs - 1,
    marginTop: 4,
    fontWeight: '600',
  },
  payMethodsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  payMethodBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
  },
  payMethodTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  receiptUploadBox: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  fileName: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    flex: 1,
    marginHorizontal: 8,
  },
  attachmentBox: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  wizardFooter: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
});