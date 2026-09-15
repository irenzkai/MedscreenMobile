import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useAuth, RegisterPayload } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { psgcApi } from '../../services/api/psgc';
import { PSGCItem, Sex } from '../../types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import {
  validateName,
  validateSuffix,
  validateBirthdate,
  validatePhone,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateRequired,
} from '../../utils/validators';
import { formatToStandardPhone } from '../../utils/formatters';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Identity
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [noMiddleName, setNoMiddleName] = useState(false);
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sex, setSex] = useState<Sex>('Male');

  // Step 2: Address
  const [provinces, setProvinces] = useState<PSGCItem[]>([]);
  const [cities, setCities] = useState<PSGCItem[]>([]);
  const [barangays, setBarangays] = useState<PSGCItem[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<PSGCItem | null>(null);
  const [selectedCity, setSelectedCity] = useState<PSGCItem | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<string>('');
  const [street, setStreet] = useState('');

  // Step 3: Contact
  const [email, setEmail] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');

  // Step 4: Security
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch initial provinces on mount
  useEffect(() => {
    psgcApi.getProvinces().then(setProvinces);
  }, []);

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

  const validateCurrentStep = (): boolean => {
    const errs: Record<string, string> = {};

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
      if (!selectedProvince) errs.province = 'Province selection is required.';
      if (!selectedCity) errs.city = 'City/Municipality is required.';
      if (!selectedBarangay) errs.barangay = 'Barangay is required.';
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
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setFieldErrors({});
    setStep((prev) => Math.max(prev - 1, 1));
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
      province: selectedProvince?.name || '',
      city: selectedCity?.name || '',
      barangay: selectedBarangay,
      street: street.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      phone: formatToStandardPhone(phoneDisplay),
      password,
      password_confirmation: confirmPassword,
      promoted_dependent_id: route.params?.promoteId ? Number(route.params.promoteId) : null,
      shadow_appointment_id: route.params?.shadowAppointmentId ? Number(route.params.shadowAppointmentId) : null,
    };

    const res = await register(payload);
    setLoading(false);

    if (res.success) {
      Alert.alert(
        'Account Registered',
        'Your profile has been registered. Please verify your email with the 6-digit code sent to you.',
        [{ text: 'Proceed to Verification', onPress: () => navigation.navigate('VerifyAccount', { email: payload.email }) }]
      );
    } else {
      Alert.alert('Registration Failed', res.message || 'Could not complete registration.');
    }
  };

  const labels = ['1. Identity', '2. Location', '3. Contact', '4. Security'];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + Spacing.sm, 24), paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled">
        {/* Back Link */}
        <TouchableOpacity
          onPress={() => (step > 1 ? handleBack() : navigation.goBack())}
          style={styles.topBackBtn}>
          <Ionicons name="arrow-back" size={20} color={theme.brandAccent} />
          <Text style={[styles.topBackText, { color: theme.brandAccent }]}>
            {step > 1 ? 'PREVIOUS STEP' : 'BACK TO LOGIN'}
          </Text>
        </TouchableOpacity>

        <Card style={styles.card}>
          {/* Multi-Step Header & Progress */}
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
                onChangeText={setFirstName}
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
                placeholder="Leave blank if none"
                error={fieldErrors.suffix}
              />

              <Input
                label="Birthdate (YYYY-MM-DD)"
                value={birthdate}
                onChangeText={setBirthdate}
                placeholder="YYYY-MM-DD"
                helperText="You must be at least 18 years old to register."
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
              <Text style={[styles.smallLabel, { color: theme.textMuted }]}>PROVINCE *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {provinces.slice(0, 15).map((p) => (
                  <TouchableOpacity
                    key={p.code}
                    onPress={() => handleProvinceSelect(p)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          selectedProvince?.code === p.code ? theme.brandAccent : theme.bgCard,
                        borderColor:
                          selectedProvince?.code === p.code ? theme.brandAccent : theme.borderColor,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        { color: selectedProvince?.code === p.code ? '#1C232D' : theme.textMain },
                      ]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {fieldErrors.province && (
                <Text style={[styles.errorInline, { color: theme.danger }]}>{fieldErrors.province}</Text>
              )}

              {selectedProvince && (
                <>
                  <Text style={[styles.smallLabel, { color: theme.textMuted, marginTop: Spacing.sm }]}>
                    CITY / MUNICIPALITY *
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {cities.map((c) => (
                      <TouchableOpacity
                        key={c.code}
                        onPress={() => handleCitySelect(c)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor:
                              selectedCity?.code === c.code ? theme.brandAccent : theme.bgCard,
                            borderColor:
                              selectedCity?.code === c.code ? theme.brandAccent : theme.borderColor,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.chipText,
                            { color: selectedCity?.code === c.code ? '#1C232D' : theme.textMain },
                          ]}>
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {fieldErrors.city && (
                    <Text style={[styles.errorInline, { color: theme.danger }]}>{fieldErrors.city}</Text>
                  )}
                </>
              )}

              {selectedCity && (
                <>
                  <Text style={[styles.smallLabel, { color: theme.textMuted, marginTop: Spacing.sm }]}>
                    BARANGAY *
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {barangays.map((b) => (
                      <TouchableOpacity
                        key={b.code}
                        onPress={() => setSelectedBarangay(b.name)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor:
                              selectedBarangay === b.name ? theme.brandAccent : theme.bgCard,
                            borderColor:
                              selectedBarangay === b.name ? theme.brandAccent : theme.borderColor,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.chipText,
                            { color: selectedBarangay === b.name ? '#1C232D' : theme.textMain },
                          ]}>
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {fieldErrors.barangay && (
                    <Text style={[styles.errorInline, { color: theme.danger }]}>{fieldErrors.barangay}</Text>
                  )}
                </>
              )}

              <Input
                label="Street / House No."
                value={street}
                onChangeText={setStreet}
                placeholder="House #, Street name"
                error={fieldErrors.street}
                containerStyle={{ marginTop: Spacing.sm }}
                isRequired
              />
            </View>
          )}

          {/* STEP 3: CONTACT */}
          {step === 3 && (
            <View>
              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
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
                onChangeText={(txt) => setPhoneDisplay(txt.replace(/[^0-9]/g, '').slice(0, 9))}
                placeholder="171234567"
                keyboardType="number-pad"
                helperText="Enter 9 digits after 09 (Total 11 digits)."
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
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                isPassword
                error={fieldErrors.password}
                isRequired
              />

              <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                isPassword
                error={fieldErrors.confirmPassword}
                isRequired
              />

              <View style={[styles.guidelineBox, { backgroundColor: theme.surfaceSubtle }]}>
                <Text style={[styles.guidelineTitle, { color: theme.brandAccent }]}>
                  Password Requirements:
                </Text>
                <Text style={[styles.guidelineItem, { color: theme.textMuted }]}>• Minimum 8 characters</Text>
                <Text style={[styles.guidelineItem, { color: theme.textMuted }]}>• Uppercase & lowercase letters</Text>
                <Text style={[styles.guidelineItem, { color: theme.textMuted }]}>• At least one number</Text>
                <Text style={[styles.guidelineItem, { color: theme.textMuted }]}>• At least one special symbol (!@#$%^&*)</Text>
              </View>
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md },
  topBackBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: 6 },
  topBackText: { fontSize: Typography.sizes.xs, fontWeight: '800' },
  card: { padding: Spacing.xl },
  title: { fontSize: Typography.sizes.xl, fontWeight: '800', textTransform: 'uppercase' },
  stepIndicator: { fontSize: Typography.sizes.xs, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
  progressTrack: { height: 6, borderRadius: BorderRadius.pill, marginVertical: Spacing.md, overflow: 'hidden' },
  progressBar: { height: '100%' },
  middleNameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noneText: { fontSize: Typography.sizes.xs, fontWeight: '600' },
  smallLabel: { fontSize: Typography.sizes.xs, fontWeight: '700', textTransform: 'uppercase' },
  sexRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  sexBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1.5, alignItems: 'center' },
  sexBtnText: { fontSize: Typography.sizes.sm, fontWeight: '700' },
  chipScroll: { marginVertical: Spacing.xs, flexDirection: 'row' },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: BorderRadius.pill, borderWidth: 1, marginRight: 6 },
  chipText: { fontSize: Typography.sizes.xs, fontWeight: '700' },
  errorInline: { fontSize: Typography.sizes.xs - 1, fontWeight: '600', marginBottom: 6 },
  guidelineBox: { padding: Spacing.sm, borderRadius: BorderRadius.md, marginVertical: Spacing.xs },
  guidelineTitle: { fontSize: Typography.sizes.xs, fontWeight: '800', marginBottom: 4 },
  guidelineItem: { fontSize: Typography.sizes.xs - 1, lineHeight: 16 },
  buttonRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
});