import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Switch,
  Alert,
  BackHandler,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useAuth, RegisterPayload } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { Sex } from '../../types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { NoticeBox } from '../../components/common/NoticeBox';
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
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateRequired,
  calculateAge,
} from '../../utils/validators';
import { formatToStandardPhone, formatDisplayPhone } from '../../utils/formatters';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { register, pendingPromotionData, clearPendingPromotion } = useAuth();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const { contentOffsetY, contentHeight, layoutHeight, handleScroll } = useScrollShortcut();

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // Extract prefilled values if routed from dependent account promotion
  const promotionInitial = route.params?.initialData || pendingPromotionData?.initialData;
  const promoteId = route.params?.promoteId || pendingPromotionData?.promoteId;

  // Step 1: Identity
  const [firstName, setFirstName] = useState(promotionInitial?.firstName || '');
  const [middleName, setMiddleName] = useState(
    promotionInitial?.middleName === 'N/A' ? '' : promotionInitial?.middleName || ''
  );
  const [noMiddleName, setNoMiddleName] = useState(promotionInitial?.middleName === 'N/A');
  const [lastName, setLastName] = useState(promotionInitial?.lastName || '');
  const [suffix, setSuffix] = useState(promotionInitial?.suffix || '');
  const [birthdate, setBirthdate] = useState(promotionInitial?.birthdate || '');
  const [sex, setSex] = useState<Sex>(promotionInitial?.sex || 'Male');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Step 2: Address (PSGC)
  const [province, setProvince] = useState(promotionInitial?.province || '');
  const [city, setCity] = useState(promotionInitial?.city || '');
  const [barangay, setBarangay] = useState(promotionInitial?.barangay || '');
  const [street, setStreet] = useState(promotionInitial?.street || '');

  // Step 3: Contact
  const [email, setEmail] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');

  // Step 4: Security
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Field validation and Step errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorBanner(msg);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  /**
   * Safe Back Action: Handles both multi-step navigation and stack back
   * without crashing when Register is the root of the navigation stack.
   */
  const handleTopBackPress = () => {
    if (step > 1) {
      handleBack();
    } else {
      clearPendingPromotion();
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Login');
      }
    }
  };

  // Android Hardware Back Button Handler
  useEffect(() => {
    const onHardwareBack = () => {
      if (step > 1) {
        handleBack();
        return true;
      }
      if (!navigation.canGoBack()) {
        clearPendingPromotion();
        navigation.navigate('Login');
        return true;
      }
      return false;
    };

    const backHandlerSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBack
    );
    return () => backHandlerSubscription.remove();
  }, [step]);

  const validateCurrentStep = (): boolean => {
    const errs: Record<string, string> = {};
    setErrorBanner(null);

    if (step === 1) {
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

      const bdayErr = validateBirthdate(birthdate, false);
      if (bdayErr) errs.birthdate = bdayErr;
    } else if (step === 2) {
      if (!province.trim()) errs.province = 'Province selection is required.';
      if (!city.trim()) errs.city = 'City / Municipality is required.';
      if (!barangay.trim()) errs.barangay = 'Barangay is required.';
      const stErr = validateRequired(street, 'Street address');
      if (stErr) errs.street = stErr;
    } else if (step === 3) {
      const emailErr = validateEmail(email);
      if (emailErr) errs.email = emailErr;

      const fullPhone = formatToStandardPhone(phoneDisplay);
      const phoneErr = validatePhone(fullPhone);
      if (phoneErr) errs.phone = phoneErr;
    } else if (step === 4) {
      const passErr = validatePassword(password);
      if (passErr) errs.password = passErr;

      const confErr = validatePasswordConfirmation(password, confirmPassword);
      if (confErr) errs.confirmPassword = confErr;
    }

    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) {
      showError('Please review the highlighted omissions below before continuing.');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setErrorBanner(null);
      setFieldErrors({});
      setStep((prev) => Math.min(prev + 1, 4));
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleBack = () => {
    setErrorBanner(null);
    setFieldErrors({});
    setStep((prev) => Math.max(prev - 1, 1));
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleFinalSubmit = async () => {
    if (!validateCurrentStep()) return;
    setLoading(true);

    const payload: RegisterPayload = {
      first_name: firstName.trim().toUpperCase(),
      middle_name: noMiddleName ? 'N/A' : middleName.trim().toUpperCase() || 'N/A',
      last_name: lastName.trim().toUpperCase(),
      suffix: suffix.trim().toUpperCase() || null,
      birthdate: birthdate.trim(),
      sex,
      province: province.trim().toUpperCase(),
      city: city.trim().toUpperCase(),
      barangay: barangay.trim().toUpperCase(),
      street: street.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      phone: formatToStandardPhone(phoneDisplay),
      password,
      password_confirmation: confirmPassword,
      promoted_dependent_id: promoteId ? Number(promoteId) : null,
      shadow_appointment_id: route.params?.shadowAppointmentId
        ? Number(route.params.shadowAppointmentId)
        : null,
    };

    const res = await register(payload);
    setLoading(false);

    if (res.success) {
      clearPendingPromotion();
      Alert.alert(
        'Account Registered',
        'Your profile has been registered. Please verify your email with the 6-digit code sent to you.',
        [
          {
            text: 'Proceed to Verification',
            onPress: () => navigation.navigate('VerifyAccount', { email: payload.email }),
          },
        ]
      );
    } else {
      showError(res.message || 'Could not complete registration. Please try again.');
    }
  };

  const labels = ['1. Identity', '2. Location', '3. Contact', '4. Security'];
  const liveAge = birthdate ? calculateAge(birthdate) : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + Spacing.sm, 24),
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled">
        
        {/* Top Back / Login Navigation Button */}
        <TouchableOpacity onPress={handleTopBackPress} style={styles.topBackBtn}>
          <Ionicons name="arrow-back" size={20} color={theme.brandAccent} />
          <Text style={[styles.topBackText, { color: theme.brandAccent }]}>
            {step > 1 ? 'PREVIOUS STEP' : 'BACK TO LOGIN'}
          </Text>
        </TouchableOpacity>

        {/* Dynamic Promotion Notice */}
        {promoteId ? (
          <NoticeBox
            type="info"
            title="Account Promotion Active"
            message="Your existing medical records and clinical history will automatically transfer to this new profile once registered."
            style={{ marginBottom: Spacing.md }}
          />
        ) : null}

        {errorBanner ? (
          <NoticeBox
            type="danger"
            message={errorBanner}
            onClose={() => setErrorBanner(null)}
            style={{ marginBottom: Spacing.md }}
          />
        ) : null}

        <Card style={styles.card}>
          <Text style={[styles.title, { color: theme.textMain }]}>Create Account</Text>
          <Text style={[styles.stepIndicator, { color: theme.brandAccent }]}>
            Step {step} of 4: {labels[step - 1]}
          </Text>

          <View style={[styles.progressTrack, { backgroundColor: theme.borderColor }]}>
            <View
              style={[
                styles.progressBar,
                { width: `${step * 25}%`, backgroundColor: theme.brandAccent },
              ]}
            />
          </View>

          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <View>
              <Input
                label="First Name"
                value={firstName}
                onChangeText={(t) => {
                  setFirstName(t);
                  if (fieldErrors.firstName) setFieldErrors((prev) => ({ ...prev, firstName: '' }));
                }}
                placeholder="Given Name"
                error={fieldErrors.firstName}
                isRequired
              />

              <View style={styles.middleNameHeader}>
                <Text style={[styles.smallLabel, { color: theme.textMuted }]}>
                  MIDDLE NAME (OPTIONAL)
                </Text>
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
                  placeholder="Middle Name"
                  error={fieldErrors.middleName}
                />
              )}

              <Input
                label="Last Name"
                value={lastName}
                onChangeText={(t) => {
                  setLastName(t);
                  if (fieldErrors.lastName) setFieldErrors((prev) => ({ ...prev, lastName: '' }));
                }}
                placeholder="Surname"
                error={fieldErrors.lastName}
                isRequired
              />

              <Input
                label="Suffix (e.g. JR, SR, III)"
                value={suffix}
                onChangeText={(t) => {
                  setSuffix(t);
                  if (fieldErrors.suffix) setFieldErrors((prev) => ({ ...prev, suffix: '' }));
                }}
                placeholder="Leave blank if none"
                error={fieldErrors.suffix}
              />

              <View style={styles.bdayFieldWrapper}>
                <Text style={[styles.smallLabel, { color: theme.textMuted, marginBottom: 4 }]}>
                  BIRTHDATE *
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowDatePicker(true)}
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
                  {liveAge !== null && (
                    <View style={[styles.agePill, { backgroundColor: theme.surfaceSubtle }]}>
                      <Text style={[styles.agePillText, { color: theme.brandAccent }]}>
                        {liveAge} YRS OLD (ADULT)
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                {fieldErrors.birthdate ? (
                  <Text style={[styles.errorInline, { color: theme.danger }]}>
                    {fieldErrors.birthdate}
                  </Text>
                ) : (
                  <Text style={[styles.helperInline, { color: theme.textMuted }]}>
                    Must be 18 years old or older to register.
                  </Text>
                )}
              </View>

              <Text style={[styles.smallLabel, { color: theme.textMuted, marginBottom: 6 }]}>
                SEX *
              </Text>
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
                    <Text
                      style={[
                        styles.sexBtnText,
                        { color: sex === s ? theme.brandAccent : theme.textMain },
                      ]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 2: ADDRESS */}
          {step === 2 && (
            <View>
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
            </View>
          )}

          {/* STEP 3: CONTACT */}
          {step === 3 && (
            <View>
              <Input
                label="Email Address"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="name@domain.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={fieldErrors.email}
                isRequired
              />

              <Input
                label="Mobile Phone"
                prefixText="09"
                value={phoneDisplay}
                onChangeText={(txt) => {
                  setPhoneDisplay(txt.replace(/[^0-9]/g, '').slice(0, 9));
                  if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                }}
                placeholder="171234567"
                keyboardType="number-pad"
                helperText="Enter 9 digits after 09."
                error={fieldErrors.phone}
                isRequired
              />
            </View>
          )}

          {/* STEP 4: SECURITY */}
          {step === 4 && (
            <View>
              <Input
                label="Password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="Min. 8 characters"
                isPassword
                error={fieldErrors.password}
                isRequired
              />

              <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                placeholder="Re-enter password"
                isPassword
                error={fieldErrors.confirmPassword}
                isRequired
              />
            </View>
          )}

          {/* Step Actions */}
          <View style={styles.buttonRow}>
            {step > 1 && (
              <Button
                title="Back"
                variant="outline-secondary"
                onPress={handleBack}
                style={{ flex: 1 }}
              />
            )}
            <Button
              title={step === 4 ? 'Create Account' : 'Next Step'}
              onPress={step === 4 ? handleFinalSubmit : handleNext}
              loading={loading}
              style={{ flex: step > 1 ? 1.5 : 1 }}
            />
          </View>
        </Card>
      </ScrollView>

      <ScrollShortcutButton
        scrollViewRef={scrollViewRef}
        contentOffsetY={contentOffsetY}
        contentHeight={contentHeight}
        layoutHeight={layoutHeight}
      />

      <DatePickerModal
        visible={showDatePicker}
        initialDate={birthdate}
        isDependent={false}
        mode="birthdate"
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(newDate) => {
          setBirthdate(newDate);
          if (fieldErrors.birthdate) {
            setFieldErrors((prev) => ({ ...prev, birthdate: '' }));
          }
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md },
  topBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: 6,
  },
  topBackText: { fontSize: Typography.sizes.xs, fontWeight: '800' },
  card: { padding: Spacing.xl },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  stepIndicator: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  progressTrack: {
    height: 6,
    borderRadius: BorderRadius.pill,
    marginVertical: Spacing.md,
    overflow: 'hidden',
  },
  progressBar: { height: '100%' },
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
  helperInline: { fontSize: 11, marginTop: 4 },
  sexRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  sexBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  sexBtnText: { fontSize: Typography.sizes.sm, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
});