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
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { appointmentsApi } from '../../services/api/appointments';
import { servicesApi } from '../../services/api/services';
import { dependentsApi } from '../../services/api/dependents';
import { psgcApi } from '../../services/api/psgc';
import {
  Dependent,
  Service,
  PaymentProvider,
  SlotOccupancyResponse,
  PSGCItem,
  Sex,
  PaymentMethod,
} from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { WizardProgressBar } from '../../components/appointments/WizardProgressBar';
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
import { alertBulkWebExclusive, openPrivacyPolicyOnWeb } from '../../utils/externalLinks';
import { CONFIG } from '../../constants/config';
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

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Step 1: Target Selection
  const [targetType, setTargetType] = useState<'self' | 'dependent' | 'bulk'>('self');
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [selectedDependentId, setSelectedDependentId] = useState<number | null>(
    route.params?.dependentId || null
  );

  // Step 2: Patient Demographics & Info
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [middleName, setMiddleName] = useState(user?.middle_name === 'N/A' ? '' : user?.middle_name || '');
  const [noMiddleName, setNoMiddleName] = useState(user?.middle_name === 'N/A');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [suffix, setSuffix] = useState(user?.suffix || '');
  const [sex, setSex] = useState<Sex>(user?.sex || 'Male');
  const [birthdate, setBirthdate] = useState(user?.birthdate ? user.birthdate.split('T')[0] : '');
  const [phoneDisplay, setPhoneDisplay] = useState(formatDisplayPhone(user?.phone));

  // Address
  const [provinces, setProvinces] = useState<PSGCItem[]>([]);
  const [cities, setCities] = useState<PSGCItem[]>([]);
  const [barangays, setBarangays] = useState<PSGCItem[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<PSGCItem | null>(null);
  const [selectedCity, setSelectedCity] = useState<PSGCItem | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<string>(user?.barangay || '');
  const [street, setStreet] = useState(user?.street || '');

  // Referral Attachment
  const [referralFile, setReferralFile] = useState<AttachedFile | null>(null);

  // Step 3: Tests Selection
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [testSearch, setTestSearch] = useState('');

  // Step 4: Schedule & Time Slot
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedSlotDisplay, setSelectedSlotDisplay] = useState<string>('');
  const [occupancyData, setOccupancyData] = useState<SlotOccupancyResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Step 5: Payment & Finalize
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [receiptFile, setReceiptFile] = useState<AttachedFile | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);

  // Lightbox Preview
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Initial Data Loading
  useEffect(() => {
    dependentsApi.getDependents().then((res) => setDependents(res.active));
    servicesApi.getServices().then(setAllServices);
    servicesApi.getPaymentProviders().then((res) => {
      setPaymentProviders(res);
      if (res.length > 0) setSelectedProvider(res[0]);
    });
    psgcApi.getProvinces().then(setProvinces);
  }, []);

  // Sync details when switching between Self and Dependents
  const handleTargetChange = (type: 'self' | 'dependent') => {
    setTargetType(type);
    setFieldErrors({});

    if (type === 'self' && user) {
      setFirstName(user.first_name || '');
      setMiddleName(user.middle_name === 'N/A' ? '' : user.middle_name || '');
      setNoMiddleName(user.middle_name === 'N/A');
      setLastName(user.last_name || '');
      setSuffix(user.suffix || '');
      setSex(user.sex || 'Male');
      setBirthdate(user.birthdate ? user.birthdate.split('T')[0] : '');
      setPhoneDisplay(formatDisplayPhone(user.phone));
      setStreet(user.street || '');
      setSelectedBarangay(user.barangay || '');
    } else if (type === 'dependent' && dependents.length > 0) {
      const firstDep = dependents[0];
      setSelectedDependentId(firstDep.id);
      applyDependentDetails(firstDep);
    }
  };

  const applyDependentDetails = (dep: Dependent) => {
    setFirstName(dep.first_name);
    setMiddleName(dep.middle_name === 'N/A' ? '' : dep.middle_name || '');
    setNoMiddleName(dep.middle_name === 'N/A');
    setLastName(dep.last_name);
    setSuffix(dep.suffix || '');
    setSex(dep.sex);
    setBirthdate(dep.birthdate ? dep.birthdate.split('T')[0] : '');
    setPhoneDisplay(formatDisplayPhone(dep.phone || user?.phone));
    setStreet(dep.street || user?.street || '');
    setSelectedBarangay(dep.barangay || user?.barangay || '');
  };

  const handleSelectDependent = (id: number) => {
    setSelectedDependentId(id);
    const found = dependents.find((d) => d.id === id);
    if (found) applyDependentDetails(found);
  };

  // Address Cascading
  const handleProvinceSelect = async (p: PSGCItem) => {
    setSelectedProvince(p);
    setSelectedCity(null);
    setSelectedBarangay('');
    setBarangays([]);
    const cList = await psgcApi.getCities(p.code);
    setCities(cList);
  };

  const handleCitySelect = async (c: PSGCItem) => {
    setSelectedCity(c);
    setSelectedBarangay('');
    const bList = await psgcApi.getBarangays(c.code);
    setBarangays(bList);
  };

  // Schedule Slot Fetching
  const handleDateChange = async (dateStr: string) => {
    setAppointmentDate(dateStr);
    setSelectedSlot(null);
    setSelectedSlotDisplay('');
    if (!dateStr) return;

    setLoadingSlots(true);
    try {
      const res = await appointmentsApi.checkSlots(dateStr);
      setOccupancyData(res);
    } catch {
      Alert.alert('Error', 'Unable to check time slot availability.');
    } finally {
      setLoadingSlots(false);
    }
  };

  // File Attachments Pickers
  const pickReferralFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const file = res.assets[0];
        setReferralFile({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType || 'image/jpeg',
        });
      }
    } catch {
      Alert.alert('File Picker Error', 'Could not access documents.');
    }
  };

  const pickReceiptFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const file = res.assets[0];
        setReceiptFile({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType || 'image/jpeg',
        });
      }
    } catch {
      Alert.alert('File Picker Error', 'Could not select receipt image.');
    }
  };

  // Test Selection Toggles
  const handleToggleTest = (svc: Service) => {
    setSelectedServiceIds((prev) =>
      prev.includes(svc.id) ? prev.filter((id) => id !== svc.id) : [...prev, svc.id]
    );
  };

  // Price Calculation
  const totalBill = useMemo(() => {
    return allServices
      .filter((s) => selectedServiceIds.includes(s.id))
      .reduce((sum, s) => sum + Number(s.price), 0);
  }, [allServices, selectedServiceIds]);

  // Validation Rules
  const validateStep = (): boolean => {
    const errs: Record<string, string> = {};

    if (currentStep === 1) {
      if (targetType === 'dependent' && !selectedDependentId) {
        Alert.alert('Selection Required', 'Please select a family dependent before proceeding.');
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
    } else if (currentStep === 3) {
      if (selectedServiceIds.length === 0) {
        Alert.alert('Selection Required', 'Please select at least one laboratory test.');
        return false;
      }
    } else if (currentStep === 4) {
      if (!appointmentDate) {
        Alert.alert('Selection Required', 'Please choose an appointment visit date.');
        return false;
      }
      if (!selectedSlot) {
        Alert.alert('Selection Required', 'Please select an available time block.');
        return false;
      }
    } else if (currentStep === 5) {
      if (paymentMethod === 'Cashless' && !receiptFile) {
        Alert.alert('Receipt Required', 'Please upload your e-wallet payment transaction receipt.');
        return false;
      }
      if (!agreedToTerms) {
        Alert.alert('Agreement Required', 'Please agree to the Clinical Privacy Policy before submitting.');
        return false;
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setFieldErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 1));
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
      formData.append('patient_middle_name', noMiddleName ? 'N/A' : middleName.trim().toUpperCase() || 'N/A');
      formData.append('patient_last_name', lastName.trim().toUpperCase());
      if (suffix.trim()) formData.append('patient_suffix', suffix.trim().toUpperCase());
      formData.append('patient_sex', sex);
      formData.append('patient_birthdate', birthdate.trim());
      formData.append('patient_phone', formatToStandardPhone(phoneDisplay));
      formData.append('patient_province', selectedProvince?.name || user?.province || '');
      formData.append('patient_city', selectedCity?.name || user?.city || '');
      formData.append('patient_barangay', selectedBarangay);
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
      if (res.success) {
        Alert.alert(
          'Appointment Requested!',
          `Your appointment #${res.appointment.id} has been registered and sent for laboratory review.`,
          [{ text: 'OK', onPress: () => navigation.navigate('Appointments') }]
        );
      }
    } catch (err: any) {
      Alert.alert('Booking Failed', err?.message || 'Could not complete appointment registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTests = allServices.filter((s) => {
    const q = testSearch.trim().toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <Header
        title="Appointment Wizard"
        subtitle={`Step ${currentStep} of 5`}
        showBack
        onBack={() => (currentStep > 1 ? handleBack() : navigation.goBack())}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <WizardProgressBar currentStep={currentStep} totalSteps={5} />

        {/* STEP 1: PATIENT SELECTION */}
        {currentStep === 1 && (
          <View>
            <Text style={[styles.stepTitle, { color: theme.textMain }]}>Who is this booking for?</Text>
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
                  <Text style={[styles.targetTitle, { color: theme.textMain }]}>FOR MYSELF</Text>
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
                  <Text style={[styles.targetTitle, { color: theme.textMain }]}>FOR A DEPENDENT</Text>
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
                      No minor dependents found on file.{' '}
                      <Text
                        onPress={() => navigation.navigate('CreateDependent')}
                        style={{ color: theme.brandAccent, fontWeight: '800' }}>
                        Register one now
                      </Text>
                      .
                    </Text>
                  ) : (
                    dependents.map((d) => (
                      <TouchableOpacity
                        key={d.id}
                        onPress={() => handleSelectDependent(d.id)}
                        style={[
                          styles.depItemBtn,
                          {
                            backgroundColor: selectedDependentId === d.id ? theme.surfaceSubtle : theme.bgCard,
                            borderColor: selectedDependentId === d.id ? theme.brandAccent : theme.borderColor,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.depItemName,
                            { color: selectedDependentId === d.id ? theme.brandAccent : theme.textMain },
                          ]}>
                          {d.name.toUpperCase()} ({d.sex} • {d.birthdate ? d.birthdate.split('T')[0] : ''})
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </Card>

            {/* Locked Corporate / Bulk Option */}
            <Card
              variant="dashed"
              onPress={alertBulkWebExclusive}
              style={[styles.targetCard, { opacity: 0.85 }]}>
              <View style={styles.targetRow}>
                <Ionicons name="business" size={32} color={theme.warning} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.targetTitle, { color: theme.textMain }]}>CORPORATE / BULK</Text>
                    <Ionicons name="lock-closed" size={12} color={theme.warning} />
                  </View>
                  <Text style={[styles.targetDesc, { color: theme.textMuted }]}>
                    Batch bookings require spreadsheet uploads on our website.
                  </Text>
                </View>
                <View style={[styles.webOnlyBadge, { backgroundColor: 'rgba(255, 193, 7, 0.15)' }]}>
                  <Text style={[styles.webOnlyText, { color: theme.warning }]}>WEB ONLY</Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* STEP 2: PATIENT DETAILS */}
        {currentStep === 2 && (
          <View>
            <Text style={[styles.stepTitle, { color: theme.textMain }]}>Patient Information</Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
              Review or adjust patient demographics and residential contact details.
            </Text>

            <Card style={styles.stepCard}>
              <Input
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Given Name"
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
                      if (val) setMiddleName('');
                    }}
                    thumbColor={noMiddleName ? theme.brandAccent : '#CCC'}
                  />
                </View>
              </View>
              {!noMiddleName && (
                <Input
                  value={middleName}
                  onChangeText={setMiddleName}
                  placeholder="Middle Name"
                  error={fieldErrors.middleName}
                />
              )}

              <Input
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Surname"
                error={fieldErrors.lastName}
                isRequired
              />

              <Input
                label="Suffix (e.g. JR, SR, III)"
                value={suffix}
                onChangeText={setSuffix}
                placeholder="Optional"
                error={fieldErrors.suffix}
              />

              <Input
                label="Birthdate (YYYY-MM-DD)"
                value={birthdate}
                onChangeText={setBirthdate}
                placeholder="YYYY-MM-DD"
                helperText={
                  targetType === 'dependent'
                    ? 'Dependents must be minors under 18.'
                    : 'Personal bookings must be at least 18 years old.'
                }
                error={fieldErrors.birthdate}
                isRequired
              />

              <Text style={[styles.smallLabel, { color: theme.textMuted, marginBottom: 6 }]}>SEX *</Text>
              <View style={styles.sexRow}>
                {(['Male', 'Female'] as Sex[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setSex(s)}
                    style={[
                      styles.sexBtn,
                      {
                        borderColor: sex === s ? theme.brandAccent : theme.borderColor,
                        backgroundColor: sex === s ? theme.surfaceSubtle : theme.bgCard,
                      },
                    ]}>
                    <Text style={{ color: sex === s ? theme.brandAccent : theme.textMain, fontWeight: '700' }}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Contact Phone"
                prefixText="09"
                value={phoneDisplay}
                onChangeText={(t) => setPhoneDisplay(t.replace(/[^0-9]/g, '').slice(0, 9))}
                placeholder="171234567"
                keyboardType="number-pad"
                error={fieldErrors.phone}
                isRequired
              />

              <Input
                label="Street / House No."
                value={street}
                onChangeText={setStreet}
                placeholder="House / Lot / Street Name"
                error={fieldErrors.street}
                isRequired
              />

              {/* Referral Attachment */}
              <View style={[styles.attachmentBox, { borderColor: theme.borderColor }]}>
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
                    onPress={pickReferralFile}
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
            <Text style={[styles.stepTitle, { color: theme.textMain }]}>Select Laboratory Tests</Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
              Pick all required examinations for this appointment.
            </Text>

            <Input
              placeholder="Search tests by name..."
              value={testSearch}
              onChangeText={setTestSearch}
            />

            {filteredTests.map((svc) => (
              <ServiceItem
                key={svc.id}
                service={svc}
                selected={selectedServiceIds.includes(svc.id)}
                onToggle={handleToggleTest}
              />
            ))}
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
              <Input
                label="Appointment Date (YYYY-MM-DD)"
                value={appointmentDate}
                onChangeText={handleDateChange}
                placeholder="YYYY-MM-DD"
                helperText="Operating Hours: Mon-Sat 8:00 AM - 5:00 PM (Lunch 12-1PM). Sunday Closed."
                isRequired
              />

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

        {/* STEP 5: PAYMENT & FINALIZE */}
        {currentStep === 5 && (
          <View>
            <Text style={[styles.stepTitle, { color: theme.textMain }]}>Payment & Finalize</Text>
            <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>
              Review your summary and confirm your payment settlement.
            </Text>

            {/* Bill Summary */}
            <Card style={[styles.stepCard, { borderColor: theme.brandAccent }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.sumLabel, { color: theme.textMuted }]}>Total Bill Amount</Text>
                <Text style={[styles.sumPrice, { color: theme.brandAccent }]}>
                  {formatCurrency(totalBill)}
                </Text>
              </View>
              <Text style={[styles.sumDetail, { color: theme.textMain }]}>
                {selectedServiceIds.length} Tests Selected • {appointmentDate} at {selectedSlotDisplay}
              </Text>
            </Card>

            {/* Payment Options */}
            <Text style={[styles.smallLabel, { color: theme.textMuted, marginTop: Spacing.md, marginBottom: 8 }]}>
              PAYMENT SETTLEMENT METHOD *
            </Text>
            <View style={styles.payMethodsRow}>
              <TouchableOpacity
                onPress={() => setPaymentMethod('Cash')}
                style={[
                  styles.payMethodBtn,
                  {
                    borderColor: paymentMethod === 'Cash' ? theme.brandAccent : theme.borderColor,
                    backgroundColor: paymentMethod === 'Cash' ? theme.surfaceSubtle : theme.bgCard,
                  },
                ]}>
                <Ionicons name="cash-outline" size={24} color={paymentMethod === 'Cash' ? theme.brandAccent : theme.textMuted} />
                <Text style={[styles.payMethodTitle, { color: theme.textMain }]}>Cash on Site</Text>
                <Text style={[styles.payMethodSub, { color: theme.textMuted }]}>Pay at front desk upon arrival</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMethod('Cashless')}
                style={[
                  styles.payMethodBtn,
                  {
                    borderColor: paymentMethod === 'Cashless' ? theme.brandAccent : theme.borderColor,
                    backgroundColor: paymentMethod === 'Cashless' ? theme.surfaceSubtle : theme.bgCard,
                  },
                ]}>
                <Ionicons name="qr-code-outline" size={24} color={paymentMethod === 'Cashless' ? theme.brandAccent : theme.textMuted} />
                <Text style={[styles.payMethodTitle, { color: theme.textMain }]}>Online / E-Wallet</Text>
                <Text style={[styles.payMethodSub, { color: theme.textMuted }]}>Scan & attach transaction slip</Text>
              </TouchableOpacity>
            </View>

            {/* Cashless QR Display & Receipt Upload */}
            {paymentMethod === 'Cashless' && selectedProvider && (
              <Card style={[styles.stepCard, { marginTop: Spacing.md }]}>
                <Text style={[styles.smallLabel, { color: theme.brandAccent }]}>
                  SCAN TO PAY ({selectedProvider.name})
                </Text>

                <TouchableOpacity
                  style={styles.qrContainer}
                  onPress={() => {
                    setLightboxTitle(`${selectedProvider.name} QR Code`);
                    setLightboxUri(`${CONFIG.WEB_BASE_URL}/storage/${selectedProvider.qr_code}`);
                    setLightboxVisible(true);
                  }}>
                  <Image
                    source={{ uri: `${CONFIG.WEB_BASE_URL}/storage/${selectedProvider.qr_code}` }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <Text style={[styles.qrZoomHint, { color: theme.textMuted }]}>
                    <Ionicons name="scan-outline" size={12} /> Tap to zoom full screen
                  </Text>
                </TouchableOpacity>

                <View style={[styles.receiptUploadBox, { borderTopColor: theme.borderColor }]}>
                  <Text style={[styles.smallLabel, { color: theme.textMuted }]}>
                    UPLOAD TRANSACTION RECEIPT *
                  </Text>
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
                      onPress={pickReceiptFile}
                      style={{ marginTop: 6 }}
                    />
                  )}
                </View>
              </Card>
            )}

            {/* Terms & Refund Policy */}
            <Card style={[styles.stepCard, { marginTop: Spacing.md }]}>
              <View style={styles.termsRow}>
                <Switch
                  value={agreedToTerms}
                  onValueChange={setAgreedToTerms}
                  thumbColor={agreedToTerms ? theme.brandAccent : '#CCC'}
                />
                <Text style={[styles.termsText, { color: theme.textMain }]}>
                  I confirm all information is correct and agree to the{' '}
                  <Text onPress={openPrivacyPolicyOnWeb} style={{ color: theme.brandAccent, fontWeight: '800' }}>
                    Clinical Privacy Policy
                  </Text>
                  .
                </Text>
              </View>

              <View style={[styles.refundNotice, { backgroundColor: theme.surfaceSubtle }]}>
                <Ionicons name="information-circle" size={16} color={theme.warning} />
                <Text style={[styles.refundText, { color: theme.textMuted }]}>
                  Cancellations requested within 24 hours of scheduled visit incur a 50% administrative cancellation fee.
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Wizard Bottom Actions */}
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

      {/* Lightbox Modal */}
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
  scrollContent: { padding: Spacing.md, paddingBottom: 60 },
  stepTitle: { fontSize: Typography.sizes.md, fontWeight: '900', textTransform: 'uppercase' },
  stepSubtitle: { fontSize: Typography.sizes.xs, marginTop: 2, marginBottom: Spacing.md },
  targetCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  targetRow: { flexDirection: 'row', alignItems: 'center' },
  targetTitle: { fontSize: Typography.sizes.sm, fontWeight: '800' },
  targetDesc: { fontSize: Typography.sizes.xs - 1, marginTop: 2 },
  webOnlyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm },
  webOnlyText: { fontSize: 10, fontWeight: '800' },
  depSelectorBox: { borderTopWidth: 1, marginTop: Spacing.sm, paddingTop: Spacing.sm, gap: 6 },
  noDepText: { fontSize: Typography.sizes.xs, lineHeight: 18 },
  depItemBtn: { padding: 10, borderRadius: BorderRadius.md, borderWidth: 1 },
  depItemName: { fontSize: Typography.sizes.xs, fontWeight: '700' },
  stepCard: { padding: Spacing.md, marginBottom: Spacing.md },
  middleNameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noneText: { fontSize: Typography.sizes.xs, fontWeight: '600' },
  smallLabel: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  sexRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  sexBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1.5, alignItems: 'center' },
  attachmentBox: { borderTopWidth: 1, paddingTop: Spacing.sm, marginTop: Spacing.sm },
  fileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  fileName: { fontSize: Typography.sizes.xs, fontWeight: '700', flex: 1, marginHorizontal: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
  sumPrice: { fontSize: Typography.sizes.xl, fontWeight: '900' },
  sumDetail: { fontSize: Typography.sizes.xs - 1, marginTop: 4, fontWeight: '600' },
  payMethodsRow: { flexDirection: 'row', gap: Spacing.sm },
  payMethodBtn: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, alignItems: 'center', gap: 4 },
  payMethodTitle: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase', textAlign: 'center' },
  payMethodSub: { fontSize: 10, textAlign: 'center' },
  qrContainer: { alignItems: 'center', marginVertical: Spacing.md },
  qrImage: { width: 160, height: 160, backgroundColor: '#FFF', borderRadius: BorderRadius.md },
  qrZoomHint: { fontSize: 11, marginTop: 6, fontWeight: '600' },
  receiptUploadBox: { borderTopWidth: 1, paddingTop: Spacing.sm },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  termsText: { fontSize: Typography.sizes.xs - 1, flex: 1, lineHeight: 16 },
  refundNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: Spacing.xs, borderRadius: BorderRadius.sm, marginTop: Spacing.sm },
  refundText: { fontSize: Typography.sizes.xs - 2, flex: 1, lineHeight: 14 },
  wizardFooter: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
});