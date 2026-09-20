import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { appointmentsApi } from '../../services/api/appointments';
import { servicesApi } from '../../services/api/services';
import { dependentsApi } from '../../services/api/dependents';
import {
  Dependent,
  Service,
  PaymentProvider,
  SlotOccupancyResponse,
  Sex,
  PaymentMethod,
  Appointment,
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
  formatDate,
  formatDisplayPhone,
  formatToStandardPhone,
  formatPatientName,
} from '../../utils/formatters';
import { openWebUrl } from '../../utils/externalLinks';
import { resolveFileUrl } from '../../utils/fileHelpers';
import { CONFIG, EXTERNAL_ROUTES } from '../../constants/config';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateAppointment'>;

interface AttachedFile {
  uri: string;
  name: string;
  mimeType: string;
}

export const CreateAppointmentScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const { contentOffsetY, contentHeight, layoutHeight, handleScroll } = useScrollShortcut();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Step 1: Target Selection
  const [targetType, setTargetType] = useState<'self' | 'dependent' | 'bulk'>('self');
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [selectedDependentId, setSelectedDependentId] = useState<number | null>(
    route.params?.dependentId || null
  );

  // External bulk redirect modal
  const [bulkRedirectModalVisible, setBulkRedirectModalVisible] = useState<boolean>(false);

  // Step 2: Demographics
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [middleName, setMiddleName] = useState(
    user?.middle_name === 'N/A' ? '' : user?.middle_name || ''
  );
  const [noMiddleName, setNoMiddleName] = useState(user?.middle_name === 'N/A');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [suffix, setSuffix] = useState(user?.suffix || '');
  const [sex, setSex] = useState<Sex>(user?.sex || 'Male');
  const [birthdate, setBirthdate] = useState(
    user?.birthdate ? user.birthdate.split('T')[0] : ''
  );
  const [phoneDisplay, setPhoneDisplay] = useState(formatDisplayPhone(user?.phone));

  // Address (PSGC)
  const [province, setProvince] = useState(user?.province || '');
  const [city, setCity] = useState(user?.city || '');
  const [barangay, setBarangay] = useState(user?.barangay || '');
  const [street, setStreet] = useState(user?.street || '');

  // Automated Date Picker Modals
  const [showBirthdatePicker, setShowBirthdatePicker] = useState<boolean>(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState<boolean>(false);

  // Referral Attachment
  const [referralFile, setReferralFile] = useState<AttachedFile | null>(null);

  // Step 3: Tests
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [testSearch, setTestSearch] = useState('');

  // Step 4: Schedule
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedSlotDisplay, setSelectedSlotDisplay] = useState<string>('');
  const [occupancyData, setOccupancyData] = useState<SlotOccupancyResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotFetchError, setSlotFetchError] = useState<string | null>(null);

  // Step 5: Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [receiptFile, setReceiptFile] = useState<AttachedFile | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);

  // Lightbox
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  // Designed Success Modal State
  const [successModalVisible, setSuccessModalVisible] = useState<boolean>(false);
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);

  // Field validation and Step errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [stepErrorBanner, setStepErrorBanner] = useState<string | null>(null);

  const showError = (msg: string) => {
    setStepErrorBanner(msg);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  useEffect(() => {
    dependentsApi.getDependents().then((res) => setDependents(res.active || []));
    servicesApi.getServices().then(setAllServices);
    servicesApi.getPaymentProviders().then((res) => {
      setPaymentProviders(res);
      if (res.length > 0) setSelectedProvider(res[0]);
    });
  }, []);

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

  const handleResetStep2Details = () => {
    setFieldErrors({});
    setStepErrorBanner(null);

    if (targetType === 'self' && user) {
      setFirstName(user.first_name || '');
      setMiddleName(user.middle_name === 'N/A' ? '' : user.middle_name || '');
      setNoMiddleName(user.middle_name === 'N/A');
      setLastName(user.last_name || '');
      setSuffix(user.suffix || '');
      const defaultSex = user.sex || 'Male';
      setSex(defaultSex);
      cleanIncompatibleServices(defaultSex);
      setBirthdate(user.birthdate ? user.birthdate.split('T')[0] : '');
      setPhoneDisplay(formatDisplayPhone(user.phone));
      setProvince(user.province || '');
      setCity(user.city || '');
      setBarangay(user.barangay || '');
      setStreet(user.street || '');
      Alert.alert('Reset Complete', 'Demographics reset to your account profile defaults.');
    } else if (targetType === 'dependent' && selectedDependentId) {
      const dep = dependents.find((d) => d.id === selectedDependentId);
      if (dep) {
        applyDependentDetails(dep);
        const depName = formatPatientName(dep.first_name, dep.middle_name, dep.last_name, dep.suffix);
        Alert.alert('Reset Complete', `Demographics reset to ${depName}'s default record.`);
      }
    }
  };

  const handleTargetChange = (type: 'self' | 'dependent') => {
    setTargetType(type);
    setFieldErrors({});
    setStepErrorBanner(null);

    if (type === 'self' && user) {
      setFirstName(user.first_name || '');
      setMiddleName(user.middle_name === 'N/A' ? '' : user.middle_name || '');
      setNoMiddleName(user.middle_name === 'N/A');
      setLastName(user.last_name || '');
      setSuffix(user.suffix || '');
      const defaultSex = user.sex || 'Male';
      setSex(defaultSex);
      cleanIncompatibleServices(defaultSex);
      setBirthdate(user.birthdate ? user.birthdate.split('T')[0] : '');
      setPhoneDisplay(formatDisplayPhone(user.phone));
      setProvince(user.province || '');
      setCity(user.city || '');
      setBarangay(user.barangay || '');
      setStreet(user.street || '');
    } else if (type === 'dependent' && dependents.length > 0) {
      const firstDep = dependents[0];
      setSelectedDependentId(firstDep.id);
      applyDependentDetails(firstDep);
    }
  };

  const applyDependentDetails = (dep: Dependent) => {
    setFirstName(dep.first_name || '');
    setMiddleName(dep.middle_name === 'N/A' ? '' : dep.middle_name || '');
    setNoMiddleName(dep.middle_name === 'N/A');
    setLastName(dep.last_name || '');
    setSuffix(dep.suffix || '');
    const depSex = dep.sex || 'Male';
    setSex(depSex);
    cleanIncompatibleServices(depSex);
    setBirthdate(dep.birthdate ? dep.birthdate.split('T')[0] : '');
    setPhoneDisplay(formatDisplayPhone(dep.phone || user?.phone));
    setProvince(dep.province || user?.province || '');
    setCity(dep.city || user?.city || '');
    setBarangay(dep.barangay || user?.barangay || '');
    setStreet(dep.street || user?.street || '');
  };

  const handleSelectDependent = (id: number) => {
    setSelectedDependentId(id);
    const found = dependents.find((d) => d.id === id);
    if (found) applyDependentDetails(found);
  };

  const handleDateChange = async (dateStr: string) => {
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
      const depId = targetType === 'dependent' ? selectedDependentId : undefined;
      const res = await appointmentsApi.checkSlots(dateStr, undefined, depId);
      setOccupancyData(res);
    } catch {
      setSlotFetchError('Unable to connect to clinic schedule. Please tap retry below.');
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
    setStepErrorBanner(null);
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
      Alert.alert('File Picker Error', 'Could not access documents.');
    }
  };

  const validateStep = (): boolean => {
    const errs: Record<string, string> = {};
    setStepErrorBanner(null);

    if (currentStep === 1) {
      if (targetType === 'dependent' && !selectedDependentId) {
        showError('Please select a family dependent before proceeding.');
        return false;
      }
    } else if (currentStep === 2) {
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

      const bdayErr = validateBirthdate(birthdate, targetType === 'dependent');
      if (bdayErr) errs.birthdate = bdayErr;

      const fullPhone = formatToStandardPhone(phoneDisplay);
      const phoneErr = validatePhone(fullPhone);
      if (phoneErr) errs.phone = phoneErr;

      const streetErr = validateRequired(street, 'Street address');
      if (streetErr) errs.street = streetErr;

      if (!province.trim()) errs.province = 'Province is required.';
      if (!city.trim()) errs.city = 'City / Municipality is required.';
      if (!barangay.trim()) errs.barangay = 'Barangay is required.';

      setFieldErrors(errs);
      if (Object.keys(errs).length > 0) {
        showError('Please review the highlighted omissions below before continuing.');
        return false;
      }
    } else if (currentStep === 3) {
      if (selectedServiceIds.length === 0) {
        showError('Please select at least one diagnostic laboratory test.');
        return false;
      }
    } else if (currentStep === 4) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (!appointmentDate || appointmentDate < todayStr) {
        showError('Please choose a valid visit date (today or future).');
        return false;
      }
      if (!selectedSlot) {
        showError('Please select an available appointment time block.');
        return false;
      }
    } else if (currentStep === 5) {
      if (paymentMethod === 'Cashless' && !receiptFile) {
        showError('Please upload your payment transaction receipt.');
        return false;
      }
      if (!agreedToTerms) {
        showError('Please agree to the Clinical Privacy Policy and Cancellation Terms before submitting.');
        return false;
      }
    }

    setFieldErrors({});
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleBack = () => {
    setFieldErrors({});
    setStepErrorBanner(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('target_type', targetType);
      if (targetType === 'dependent' && selectedDependentId) {
        formData.append('dependent_id', String(selectedDependentId));
      }

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

      // Append user account email so it saves directly to the patient_email database column
      const resolvedEmail = user?.email ? user.email.trim().toLowerCase() : '';
      formData.append('patient_email', resolvedEmail);

      formData.append('patient_province', province.trim().toUpperCase());
      formData.append('patient_city', city.trim().toUpperCase());
      formData.append('patient_barangay', barangay.trim().toUpperCase());
      formData.append('patient_street', street.trim().toUpperCase());
      formData.append('appointment_date', appointmentDate);
      formData.append('time_slot', selectedSlot || '');
      formData.append('payment_method', paymentMethod);

      selectedServiceIds.forEach((id) => {
        formData.append('service_ids[]', String(id));
      });

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

      const res = await appointmentsApi.createAppointment(formData);
      if (res.success || res.appointment) {
        setCreatedAppointment(res.appointment || null);
        setSuccessModalVisible(true);
      }
    } catch (err: any) {
      showError(err?.message || 'Could not complete appointment registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessDismiss = () => {
    setSuccessModalVisible(false);
    navigation.navigate('PatientTabs', { screen: 'Appointments' });
  };

  const calculatedPatientAge = birthdate ? calculateAge(birthdate) : null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <Header
        title="Appointment Wizard"
        subtitle={`Step ${currentStep} of 5`}
        showBack
        onBack={() => (currentStep > 1 ? handleBack() : navigation.goBack())}
      />

      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <WizardProgressBar currentStep={currentStep} totalSteps={5} />

        {stepErrorBanner ? (
          <NoticeBox
            type="danger"
            message={stepErrorBanner}
            onClose={() => setStepErrorBanner(null)}
            style={{ marginBottom: Spacing.md }}
          />
        ) : null}

        {/* STEP 1: PATIENT SELECTION */}
        {currentStep === 1 && (
          <View>
            <Text style={[styles.stepTitle, { color: theme.textMain }]}>
              Who is this booking for?
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
              Select whether this reservation is for yourself, a child dependent, or an enterprise batch.
            </Text>

            <Card
              variant={targetType === 'self' ? 'accent' : 'default'}
              onPress={() => handleTargetChange('self')}
              style={styles.targetCard}>
              <View style={styles.targetRow}>
                <Ionicons
                  name="person-circle"
                  size={32}
                  color={targetType === 'self' ? theme.brandAccent : theme.textMuted}
                />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={[styles.targetTitle, { color: theme.textMain }]}>
                    FOR MYSELF
                  </Text>
                  <Text style={[styles.targetDesc, { color: theme.textMuted }]}>
                    Use my registered profile identity and clinical file.
                  </Text>
                </View>
                <Ionicons
                  name={targetType === 'self' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={targetType === 'self' ? theme.brandAccent : theme.borderColor}
                />
              </View>
            </Card>

            <Card
              variant={targetType === 'dependent' ? 'accent' : 'default'}
              onPress={() => handleTargetChange('dependent')}
              style={styles.targetCard}>
              <View style={styles.targetRow}>
                <Ionicons
                  name="people"
                  size={32}
                  color={targetType === 'dependent' ? theme.brandAccent : theme.textMuted}
                />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={[styles.targetTitle, { color: theme.textMain }]}>
                    FOR A DEPENDENT
                  </Text>
                  <Text style={[styles.targetDesc, { color: theme.textMuted }]}>
                    Book for registered children or family minors under 18.
                  </Text>
                </View>
                <Ionicons
                  name={targetType === 'dependent' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={targetType === 'dependent' ? theme.brandAccent : theme.borderColor}
                />
              </View>

              {targetType === 'dependent' && (
                <View style={[styles.depSelectorBox, { borderTopColor: theme.borderColor }]}>
                  {dependents.length === 0 ? (
                    <Text style={[styles.noDepText, { color: theme.textMuted }]}>
                      No minor dependents found on file.
                    </Text>
                  ) : (
                    dependents.map((d) => {
                      const displayName =
                        d.name ||
                        formatPatientName(d.first_name, d.middle_name, d.last_name, d.suffix);
                      const displaySex = d.sex || 'Male';
                      return (
                        <TouchableOpacity
                          key={d.id}
                          onPress={() => handleSelectDependent(d.id)}
                          style={[
                            styles.depItemBtn,
                            {
                              backgroundColor:
                                selectedDependentId === d.id
                                  ? theme.surfaceSubtle
                                  : theme.bgCard,
                              borderColor:
                                selectedDependentId === d.id
                                  ? theme.brandAccent
                                  : theme.borderColor,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.depItemName,
                              {
                                color:
                                  selectedDependentId === d.id
                                    ? theme.brandAccent
                                    : theme.textMain,
                              },
                            ]}>
                            {displayName.toUpperCase()} ({displaySex} • {calculateAge(d.birthdate)} YRS OLD)
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}
            </Card>

            <Card
              variant="dashed"
              onPress={() => setBulkRedirectModalVisible(true)}
              style={[styles.targetCard, { opacity: 0.85 }]}>
              <View style={styles.targetRow}>
                <Ionicons name="business" size={32} color={theme.warning} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.targetTitle, { color: theme.textMain }]}>
                      BULK
                    </Text>
                    <Ionicons name="lock-closed" size={12} color={theme.warning} />
                  </View>
                  <Text style={[styles.targetDesc, { color: theme.textMuted }]}>
                    Batch bookings require spreadsheet uploads on our website.
                  </Text>
                </View>
                <View
                  style={[
                    styles.webOnlyBadge,
                    { backgroundColor: 'rgba(255, 193, 7, 0.15)' },
                  ]}>
                  <Text style={[styles.webOnlyText, { color: theme.warning }]}>WEB ONLY</Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* STEP 2: PATIENT DETAILS */}
        {currentStep === 2 && (
          <View>
            <View style={styles.stepTitleRow}>
              <View>
                <Text style={[styles.stepTitle, { color: theme.textMain }]}>
                  Patient Information
                </Text>
                <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
                  Review demographics, home address, and optional referral notes.
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleResetStep2Details}
                style={[styles.resetHeaderBtn, { borderColor: theme.brandAccent, backgroundColor: theme.surfaceSubtle }]}
                hitSlop={8}>
                <Ionicons name="refresh-outline" size={12} color={theme.brandAccent} />
                <Text style={[styles.resetHeaderBtnText, { color: theme.brandAccent }]}>
                  RESET INFO
                </Text>
              </TouchableOpacity>
            </View>

            <Card style={styles.stepCard}>
              <Text style={[styles.subCardHeader, { color: theme.brandAccent }]}>
                Personal Identity
              </Text>
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
                placeholder="e.g. JR, SR, III (Leave blank if none)"
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
                  <Ionicons
                    name="calendar"
                    size={18}
                    color={theme.brandAccent}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={[
                      styles.bdayTriggerText,
                      { color: birthdate ? theme.textMain : theme.textMuted },
                    ]}>
                    {birthdate ? birthdate : 'Tap to Select Birthdate'}
                  </Text>
                  {calculatedPatientAge !== null && (
                    <View style={[styles.agePill, { backgroundColor: theme.surfaceSubtle }]}>
                      <Text style={[styles.agePillText, { color: theme.brandAccent }]}>
                        {calculatedPatientAge} YRS OLD
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

              {/* Phone */}
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
              <Text style={[styles.subCardHeader, { color: theme.brandAccent, marginTop: Spacing.md }]}>
                Residential Address
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

              {/* Referral */}
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

        {/* STEP 3: SERVICES */}
        {currentStep === 3 && (
          <View>
            <Text style={[styles.stepTitle, { color: theme.textMain }]}>
              Select Laboratory Tests
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
              Choose the diagnostic tests requested by your physician for a{' '}
              <Text style={{ color: theme.brandAccent, fontWeight: '800' }}>
                {(sex || 'Male').toUpperCase()}
              </Text>{' '}
              patient.
            </Text>

            <Input
              placeholder="Search tests by name..."
              value={testSearch}
              onChangeText={setTestSearch}
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
          </View>
        )}

        {/* STEP 4: SCHEDULE */}
        {currentStep === 4 && (
          <View>
            <Text style={[styles.stepTitle, { color: theme.textMain }]}>Select Schedule</Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
              Choose a visit date and select an open time block.
            </Text>

            <Card style={styles.stepCard}>
              <View style={styles.bdayFieldWrapper}>
                <Text style={[styles.smallLabel, { color: theme.textMuted, marginBottom: 4 }]}>
                  APPOINTMENT DATE *
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowSchedulePicker(true)}
                  style={[
                    styles.bdayTrigger,
                    { backgroundColor: theme.bgCard, borderColor: theme.borderColor },
                  ]}>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={theme.brandAccent}
                    style={{ marginRight: 8 }}
                  />
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
                  <NoticeBox
                    type="danger"
                    title="Occupancy Unavailable"
                    message={slotFetchError}
                  />
                  <Button
                    title="Retry Check"
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

        {/* STEP 5: PAYMENT */}
        {currentStep === 5 && (
          <View>
            <Text style={[styles.stepTitle, { color: theme.textMain }]}>
              Payment & Final Review
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
              Review booking total and confirm payment settlement.
            </Text>

            <Card style={[styles.stepCard, { borderColor: theme.brandAccent }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.sumLabel, { color: theme.textMuted }]}>
                  Total Bill Amount
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

            {paymentMethod === 'Cashless' && selectedProvider && (
              <Card style={[styles.stepCard, { marginTop: Spacing.md }]}>
                <Text style={[styles.smallLabel, { color: theme.brandAccent }]}>
                  SCAN TO PAY ({selectedProvider.name})
                </Text>
                <TouchableOpacity
                  style={styles.qrContainer}
                  onPress={() => {
                    setLightboxTitle(`${selectedProvider.name} QR Code`);
                    setLightboxUri(resolveFileUrl(selectedProvider.qr_code));
                    setLightboxVisible(true);
                  }}>
                  <Image
                    source={{ uri: resolveFileUrl(selectedProvider.qr_code) }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <Text style={[styles.qrZoomHint, { color: theme.textMuted }]}>
                    Tap to zoom full screen
                  </Text>
                </TouchableOpacity>

                <View style={[styles.receiptUploadBox, { borderTopColor: theme.borderColor }]}>
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
                      title="Upload Payment Receipt"
                      variant="primary"
                      size="sm"
                      icon={<Ionicons name="cloud-upload-outline" size={16} color="#1C232D" />}
                      onPress={() => pickFile('receipt')}
                      style={{ marginTop: 6 }}
                    />
                  )}
                </View>
              </Card>
            )}

            {/* Terms, Privacy Policy, and Cancellation Fee Disclosure */}
            <Card style={[styles.stepCard, { marginTop: Spacing.md }]}>
              <View style={styles.termsRow}>
                <Switch
                  value={agreedToTerms}
                  onValueChange={setAgreedToTerms}
                  thumbColor={agreedToTerms ? theme.brandAccent : '#CCC'}
                />
                <Text style={[styles.termsText, { color: theme.textMain }]}>
                  I confirm that all information provided is accurate and I agree to the{' '}
                  <Text
                    onPress={() => openWebUrl(EXTERNAL_ROUTES.LEGAL_PRIVACY)}
                    style={{ color: theme.brandAccent, fontWeight: '800' }}>
                    Clinical Privacy Policy
                  </Text>
                  .
                </Text>
              </View>

              {/* Cancellation & Refund Policy Box */}
              <View
                style={[
                  styles.cancellationBox,
                  {
                    borderColor: 'rgba(108, 117, 125, 0.15)',
                    backgroundColor: theme.surfaceSubtle,
                  },
                ]}>
                <View style={styles.cancellationHeader}>
                  <Ionicons name="information-circle" size={14} color={theme.warning} />
                  <Text style={[styles.cancellationTitle, { color: theme.warning }]}>
                    CANCELLATION & REFUND POLICY:
                  </Text>
                </View>
                <Text style={[styles.cancellationText, { color: theme.textMuted }]}>
                  Cancellations made{' '}
                  <Text style={{ fontWeight: '800', color: theme.textMain }}>
                    more than 24 hours
                  </Text>{' '}
                  prior to your scheduled visit qualify for a{' '}
                  <Text style={{ fontWeight: '800', color: theme.textMain }}>
                    100% full refund
                  </Text>
                  . Cancellations requested{' '}
                  <Text style={{ fontWeight: '800', color: theme.textMain }}>
                    within 24 hours
                  </Text>{' '}
                  of your scheduled time are subject to a{' '}
                  <Text style={{ fontWeight: '800', color: theme.textMain }}>
                    50% administrative cancellation fee
                  </Text>{' '}
                  (50% refund).
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Footer Actions */}
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
            title={currentStep === 5 ? 'Confirm & Register' : 'Next Step'}
            onPress={currentStep === 5 ? handleSubmit : handleNext}
            loading={submitting}
            style={{ flex: currentStep > 1 ? 1.5 : 1 }}
          />
        </View>
      </ScrollView>

      {/* UNIFIED MODAL: Designed Appointment Request Success Prompt */}
      <ActionModal
        visible={successModalVisible}
        type="success"
        icon="checkmark-circle-outline"
        title="Booking Requested!"
        isSingleAction={true}
        confirmText="View My Bookings"
        onClose={handleSuccessDismiss}
        onConfirm={handleSuccessDismiss}
        message={
          <View style={styles.successModalBody}>
            <Text style={[styles.successDesc, { color: theme.textMuted }]}>
              Your clinical appointment has been registered and successfully sent for laboratory review.
            </Text>

            <View
              style={[
                styles.successSummaryCard,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderColor },
              ]}>
              <View style={styles.successRow}>
                <Text style={[styles.successRowLabel, { color: theme.textMuted }]}>Patient:</Text>
                <Text style={[styles.successRowVal, { color: theme.textMain }]} numberOfLines={1}>
                  {formatPatientName(firstName, middleName, lastName, suffix)}
                </Text>
              </View>

              <View style={styles.successRow}>
                <Text style={[styles.successRowLabel, { color: theme.textMuted }]}>Schedule:</Text>
                <Text style={[styles.successRowVal, { color: theme.textMain }]}>
                  {formatDate(appointmentDate)} • {selectedSlotDisplay}
                </Text>
              </View>

              <View style={styles.successRow}>
                <Text style={[styles.successRowLabel, { color: theme.textMuted }]}>Total Bill:</Text>
                <Text style={[styles.successRowVal, { color: theme.brandAccent }]}>
                  {formatCurrency(totalBill)} ({paymentMethod})
                </Text>
              </View>
            </View>
          </View>
        }
      />

      {/* UNIFIED MODAL: External Bulk Website Redirection */}
      <ActionModal
        visible={bulkRedirectModalVisible}
        type="info"
        icon="globe-outline"
        title="Open Web Portal"
        message="Bulk spreadsheet imports, employee list verification, and enterprise bookings are managed on our official website. Proceed to open in your browser?"
        confirmText="Open Website"
        cancelText="Stay in App"
        confirmVariant="primary"
        onClose={() => setBulkRedirectModalVisible(false)}
        onConfirm={() => {
          setBulkRedirectModalVisible(false);
          openWebUrl(EXTERNAL_ROUTES.BULK_APPOINTMENT);
        }}
      />

      <ScrollShortcutButton
        scrollViewRef={scrollViewRef}
        contentOffsetY={contentOffsetY}
        contentHeight={contentHeight}
        layoutHeight={layoutHeight}
      />

      {/* Date Pickers */}
      <DatePickerModal
        visible={showBirthdatePicker}
        initialDate={birthdate}
        isDependent={targetType === 'dependent'}
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
  targetCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  targetRow: { flexDirection: 'row', alignItems: 'center' },
  targetTitle: { fontSize: Typography.sizes.sm, fontWeight: '800' },
  targetDesc: { fontSize: Typography.sizes.xs - 1, marginTop: 2 },
  webOnlyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  webOnlyText: { fontSize: 10, fontWeight: '800' },
  depSelectorBox: {
    borderTopWidth: 1,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    gap: 6,
  },
  noDepText: { fontSize: Typography.sizes.xs, lineHeight: 18 },
  depItemBtn: { padding: 10, borderRadius: BorderRadius.md, borderWidth: 1 },
  depItemName: { fontSize: Typography.sizes.xs, fontWeight: '700' },
  stepCard: { padding: Spacing.md, marginBottom: Spacing.md },
  subCardHeader: {
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
  attachmentBox: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
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
  payMethodsRow: { flexDirection: 'row', gap: Spacing.sm },
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
  qrContainer: { alignItems: 'center', marginVertical: Spacing.md },
  qrImage: {
    width: 160,
    height: 160,
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.md,
  },
  qrZoomHint: { fontSize: 11, marginTop: 6, fontWeight: '600' },
  receiptUploadBox: { borderTopWidth: 1, paddingTop: Spacing.sm },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  termsText: { fontSize: Typography.sizes.xs, flex: 1, lineHeight: 18 },
  cancellationBox: {
    marginTop: Spacing.md,
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  cancellationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cancellationTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cancellationText: {
    fontSize: Typography.sizes.xs - 1,
    lineHeight: 16,
  },
  wizardFooter: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },

  // Success Modal Design Styles
  successModalBody: {
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  refBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.pill,
    marginBottom: Spacing.sm,
  },
  refBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  successDesc: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  successSummaryCard: {
    width: '100%',
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 6,
    marginBottom: Spacing.md,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successRowLabel: {
    fontSize: Typography.sizes.xs - 1,
    fontWeight: '600',
  },
  successRowVal: {
    fontSize: Typography.sizes.xs - 1,
    fontWeight: '800',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  successNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  successNoteText: {
    fontSize: 10,
    flex: 1,
    lineHeight: 14,
  },
});