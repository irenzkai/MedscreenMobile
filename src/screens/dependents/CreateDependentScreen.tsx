import React, { useState, useEffect } from 'react';
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
import { psgcApi } from '../../services/api/psgc';
import { PSGCItem, Sex } from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import {
  validateName,
  validateSuffix,
  validateBirthdate,
  validateRequired,
} from '../../utils/validators';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateDependent'>;

export const CreateDependentScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [noMiddleName, setNoMiddleName] = useState(false);
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [suffix, setSuffix] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sex, setSex] = useState<Sex>('Male');

  // Address
  const [provinces, setProvinces] = useState<PSGCItem[]>([]);
  const [cities, setCities] = useState<PSGCItem[]>([]);
  const [barangays, setBarangays] = useState<PSGCItem[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<PSGCItem | null>(null);
  const [selectedCity, setSelectedCity] = useState<PSGCItem | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<string>('');
  const [street, setStreet] = useState('');

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    psgcApi.getProvinces().then(setProvinces);
  }, []);

  const handleCopyParentAddress = () => {
    if (!user) return;
    setStreet(user.street || '');
    setSelectedBarangay(user.barangay || '');
    Alert.alert("Address Copied", "Parent's home address fields have been inherited.");
  };

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

  const handleSave = async () => {
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

    const bdayErr = validateBirthdate(birthdate, true); // Minor constraint (under 18)
    if (bdayErr) errs.birthdate = bdayErr;

    if (!street.trim()) errs.street = 'Street address is required.';

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      Alert.alert('Omissions Found', 'Please review the highlighted fields before saving.');
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
        province: selectedProvince?.name || user?.province || '',
        city: selectedCity?.name || user?.city || '',
        barangay: selectedBarangay || user?.barangay || '',
        street: street.trim().toUpperCase(),
      });

      Alert.alert('Success', 'Child dependent profile registered successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Registration Failed', err?.message || 'Could not register dependent.');
    } finally {
      setLoading(false);
    }
  };

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

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Personal Identity */}
        <Card style={styles.formCard}>
          <Text style={[styles.cardTitle, { color: theme.brandAccent }]}>1. Personal Identity</Text>

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
            helperText="Dependents must be minors under 18 years of age."
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
        </Card>

        {/* Residential Address */}
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

          <Input
            label="Street / House No."
            value={street}
            onChangeText={setStreet}
            placeholder="House / Lot / Street Name"
            error={fieldErrors.street}
            isRequired
          />

          {/* Quick Select Region Pills if not copying */}
          <Text style={[styles.smallLabel, { color: theme.textMuted, marginTop: Spacing.xs }]}>PROVINCE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {provinces.slice(0, 10).map((p) => (
              <TouchableOpacity
                key={p.code}
                onPress={() => handleProvinceSelect(p)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selectedProvince?.code === p.code ? theme.brandAccent : theme.bgCard,
                    borderColor: selectedProvince?.code === p.code ? theme.brandAccent : theme.borderColor,
                  },
                ]}>
                <Text style={{ color: selectedProvince?.code === p.code ? '#1C232D' : theme.textMain, fontSize: 11, fontWeight: '700' }}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        {/* Submit */}
        <Button
          title="Save to Family List"
          onPress={handleSave}
          loading={loading}
          size="lg"
          style={{ marginTop: Spacing.md }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 60 },
  formCard: { padding: Spacing.md, marginBottom: Spacing.md },
  cardTitle: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  middleNameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noneText: { fontSize: Typography.sizes.xs, fontWeight: '600' },
  smallLabel: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  sexRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  sexBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1.5, alignItems: 'center' },
  addressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  chipScroll: { marginVertical: Spacing.xs, flexDirection: 'row' },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: BorderRadius.pill, borderWidth: 1, marginRight: 6 },
});