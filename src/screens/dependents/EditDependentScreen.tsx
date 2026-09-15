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
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { dependentsApi } from '../../services/api/dependents';
import { Dependent, Sex } from '../../types';
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
import { CONFIG } from '../../constants/config';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'EditDependent'>;

export const EditDependentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { dependentId } = route.params;
  const theme = useTheme();
  const { user, logout } = useAuth();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const { contentOffsetY, contentHeight, layoutHeight, handleScroll } = useScrollShortcut();

  const [dependent, setDependent] = useState<Dependent | null>(null);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [noMiddleName, setNoMiddleName] = useState(false);
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sex, setSex] = useState<Sex>('Male');

  // Address
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [barangay, setBarangay] = useState('');
  const [street, setStreet] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOver18, setIsOver18] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorBanner(msg);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  useEffect(() => {
    const loadDependent = async () => {
      try {
        const res = await dependentsApi.getDependents();
        const found = res.active.find((d) => d.id === dependentId);
        if (found) {
          setDependent(found);
          setFirstName(found.first_name);
          setMiddleName(
            found.middle_name === 'N/A' ? '' : found.middle_name || ''
          );
          setNoMiddleName(found.middle_name === 'N/A');
          setLastName(found.last_name);
          setSuffix(found.suffix || '');
          setBirthdate(found.birthdate ? found.birthdate.split('T')[0] : '');
          setSex(found.sex);
          setStreet(found.street || '');
          setBarangay(found.barangay || '');
          setCity(found.city || '');
          setProvince(found.province || '');

          const age = calculateAge(found.birthdate);
          setIsOver18(age >= 18);
        }
      } catch (error) {
        console.error('Failed to load dependent:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDependent();
  }, [dependentId]);

  const handleUpdate = async () => {
    if (isOver18) {
      showError('This dependent is 18 years old or older and must be promoted instead.');
      return;
    }
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
      showError('Please correct the highlighted omissions below before saving.');
      return;
    }

    setSaving(true);
    try {
      await dependentsApi.updateDependent(dependentId, {
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

      Alert.alert('Updated', 'Dependent profile details have been saved.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      showError(err?.message || 'Could not update dependent details.');
    } finally {
      setSaving(false);
    }
  };

  const promoUrl = `${CONFIG.WEB_BASE_URL}/register?promote=${dependentId}`;

  const handleLogoutAndRegister = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'PatientTabs' }],
    });
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: theme.bgMain }]}>
        <ActivityIndicator size="large" color={theme.brandAccent} />
      </View>
    );
  }

  const liveAge = birthdate ? calculateAge(birthdate) : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <Header
        title="Edit Profile"
        subtitle={dependent?.name}
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

        {isOver18 && (
          <NoticeBox
            type="warning"
            title="Minor Status Expired (18+ Years Old)"
            message="Under clinical regulations, dependent profiles are for minors under 18 years of age only. Profile editing is locked. Please promote this account so they can register their own independent account."
            style={{ marginBottom: Spacing.md }}
          />
        )}

        <Card style={[styles.formCard, isOver18 && { opacity: 0.6 }]}>
          <Text style={[styles.cardTitle, { color: theme.brandAccent }]}>
            Personal Details
          </Text>

          <Input
            label="First Name"
            value={firstName}
            onChangeText={(t) => {
              setFirstName(t);
              if (fieldErrors.firstName) setFieldErrors((prev) => ({ ...prev, firstName: '' }));
            }}
            editable={!isOver18}
            error={fieldErrors.firstName}
            isRequired
          />

          <View style={styles.middleNameHeader}>
            <Text style={[styles.smallLabel, { color: theme.textMuted }]}>MIDDLE NAME</Text>
            <View style={styles.switchRow}>
              <Text style={[styles.noneText, { color: theme.textMuted }]}>None</Text>
              <Switch
                value={noMiddleName}
                disabled={isOver18}
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
              editable={!isOver18}
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
            editable={!isOver18}
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
            editable={!isOver18}
            placeholder="Optional"
            error={fieldErrors.suffix}
          />

          <View style={styles.bdayFieldWrapper}>
            <Text style={[styles.smallLabel, { color: theme.textMuted, marginBottom: 4 }]}>
              BIRTHDATE *
            </Text>
            <TouchableOpacity
              activeOpacity={isOver18 ? 1 : 0.8}
              onPress={() => !isOver18 && setShowDatePicker(true)}
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

          <Text style={[styles.smallLabel, { color: theme.textMuted, marginBottom: 6 }]}>
            SEX *
          </Text>
          <View style={styles.sexRow}>
            {(['Male', 'Female'] as Sex[]).map((s) => (
              <TouchableOpacity
                key={s}
                disabled={isOver18}
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

        {/* Address Card */}
        <Card style={[styles.formCard, isOver18 && { opacity: 0.6 }]}>
          <Text style={[styles.cardTitle, { color: theme.brandAccent }]}>
            Home Address (PSGC)
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
              if (isOver18) return;
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

        {/* Over 18 Promotion Action Card */}
        {isOver18 && (
          <Card style={styles.promoteCard}>
            <Text style={[styles.cardTitle, { color: theme.brandAccent }]}>
              Account Promotion
            </Text>
            <Text style={[styles.promoteDesc, { color: theme.textMuted }]}>
              All diagnostic records, previous test results, and clinical folders will safely
              transfer to their independent user account once registered.
            </Text>
            <Button
              title="Copy Shareable Registration Link"
              variant="outline"
              size="sm"
              icon={<Ionicons name="copy-outline" size={14} color={theme.brandAccent} />}
              onPress={() => Alert.alert('Copied', promoUrl)}
              style={{ marginBottom: Spacing.sm }}
            />
            <Button
              title="Logout & Register Them Now"
              variant="primary"
              size="md"
              icon={<Ionicons name="arrow-forward-circle" size={16} color="#1C232D" />}
              onPress={handleLogoutAndRegister}
            />
          </Card>
        )}

        {!isOver18 && (
          <Button
            title="Save Changes"
            onPress={handleUpdate}
            loading={saving}
            size="lg"
            style={{ marginTop: Spacing.md }}
          />
        )}
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
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.md, paddingBottom: 60 },
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
  promoteCard: { padding: Spacing.md, marginTop: Spacing.sm },
  promoteDesc: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
});