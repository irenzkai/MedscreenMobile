import React, { useState, useRef } from 'react';
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
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { dependentsApi } from '../../services/api/dependents';
import { Sex } from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
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
  validateRequired,
  calculateAge,
} from '../../utils/validators';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateDependent'>;

export const CreateDependentScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const { contentOffsetY, contentHeight, layoutHeight, handleScroll } = useScrollShortcut();

  // Child Identity States
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [noMiddleName, setNoMiddleName] = useState(false);
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [suffix, setSuffix] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sex, setSex] = useState<Sex>('Male');

  // Address States (PSGC)
  const [province, setProvince] = useState(user?.province || '');
  const [city, setCity] = useState(user?.city || '');
  const [barangay, setBarangay] = useState(user?.barangay || '');
  const [street, setStreet] = useState(user?.street || '');

  // UI / Modal States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorBanner(msg);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  const handleCopyParentAddress = () => {
    if (!user) return;
    setStreet(user.street || '');
    setBarangay(user.barangay || '');
    setCity(user.city || '');
    setProvince(user.province || '');
    setFieldErrors((prev) => ({
      ...prev,
      street: '',
      barangay: '',
      city: '',
      province: '',
    }));
    Alert.alert('Address Copied', "Parent's home address fields have been inherited.");
  };

  const handleSave = async () => {
    setErrorBanner(null);
    const errs: Record<string, string> = {};

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

    const bdayErr = validateBirthdate(birthdate, true);
    if (bdayErr) errs.birthdate = bdayErr;

    const streetErr = validateRequired(street, 'Street address');
    if (streetErr) errs.street = streetErr;

    if (!province.trim()) errs.province = 'Province is required.';
    if (!city.trim()) errs.city = 'City / Municipality is required.';
    if (!barangay.trim()) errs.barangay = 'Barangay is required.';

    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) {
      showError('Please review the highlighted omissions below before saving.');
      return;
    }

    setLoading(true);
    try {
      await dependentsApi.createDependent({
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
      });

      Alert.alert('Success', 'Child dependent profile registered successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      showError(err?.message || 'Could not register dependent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const liveAge = birthdate ? calculateAge(birthdate) : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <Header
        title="Add Child Profile"
        subtitle="Minor Dependent (Under 18)"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        
        {errorBanner ? (
          <NoticeBox
            type="danger"
            message={errorBanner}
            onClose={() => setErrorBanner(null)}
            style={{ marginBottom: Spacing.md }}
          />
        ) : null}

        <Card style={styles.policyCard}>
          <Ionicons name="information-circle-outline" size={20} color={theme.brandAccent} />
          <Text style={[styles.policyText, { color: theme.textMuted }]}>
            In compliance with Philippine health guidelines, family dependent profiles are
            strictly reserved for minor children under 18 years of age.
          </Text>
        </Card>

        {/* 1. Personal Identity */}
        <Card style={styles.formCard}>
          <Text style={[styles.cardTitle, { color: theme.brandAccent }]}>
            1. Personal Identity
          </Text>

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
            placeholder="Optional"
            error={fieldErrors.suffix}
          />

          {/* Automated Birthdate Selector */}
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
                    {liveAge} YRS OLD (MINOR)
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

          {/* Sex Selector */}
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
                  style={{
                    color: sex === s ? theme.brandAccent : theme.textMain,
                    fontWeight: '700',
                  }}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* 2. Residential Address */}
        <Card style={styles.formCard}>
          <View style={styles.addressHeaderRow}>
            <Text style={[styles.cardTitle, { color: theme.brandAccent, marginBottom: 0 }]}>
              2. Home Address
            </Text>
            <Button
              title="Copy Parent Address"
              size="sm"
              variant="outline"
              icon={<Ionicons name="copy-outline" size={12} color={theme.brandAccent} />}
              onPress={handleCopyParentAddress}
            />
          </View>

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
        </Card>

        <Button
          title="Save to Family List"
          onPress={handleSave}
          loading={loading}
          size="lg"
          style={{ marginTop: Spacing.md }}
        />
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
        isDependent={true}
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
  scrollContent: { padding: Spacing.md, paddingBottom: 60 },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  policyText: { fontSize: Typography.sizes.xs - 1, flex: 1, lineHeight: 16 },
  formCard: { padding: Spacing.md, marginBottom: Spacing.md },
  cardTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
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
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
});