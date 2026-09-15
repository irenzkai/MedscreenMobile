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
import { Dependent, Sex } from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import {
  validateName,
  validateSuffix,
  validateBirthdate,
  calculateAge,
} from '../../utils/validators';
import { CONFIG } from '../../constants/config';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'EditDependent'>;

export const EditDependentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { dependentId } = route.params;
  const theme = useTheme();
  const { user, logout } = useAuth();

  const [dependent, setDependent] = useState<Dependent | null>(null);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [noMiddleName, setNoMiddleName] = useState(false);
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sex, setSex] = useState<Sex>('Male');
  const [street, setStreet] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOver18, setIsOver18] = useState(false);

  useEffect(() => {
    const loadDependent = async () => {
      try {
        const res = await dependentsApi.getDependents();
        const found = res.active.find((d) => d.id === dependentId);
        if (found) {
          setDependent(found);
          setFirstName(found.first_name);
          setMiddleName(found.middle_name === 'N/A' ? '' : found.middle_name || '');
          setNoMiddleName(found.middle_name === 'N/A');
          setLastName(found.last_name);
          setSuffix(found.suffix || '');
          setBirthdate(found.birthdate ? found.birthdate.split('T')[0] : '');
          setSex(found.sex);
          setStreet(found.street || '');

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
      Alert.alert('Editing Locked', 'This dependent is 18 years old or older and must be promoted instead.');
      return;
    }

    const fnErr = validateName(firstName, 'First Name');
    const lnErr = validateName(lastName, 'Last Name');
    const bdayErr = validateBirthdate(birthdate, true);

    if (fnErr || lnErr || bdayErr || !street.trim()) {
      Alert.alert('Validation Error', 'Please correct the highlighted fields before saving.');
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
        province: dependent?.province || user?.province || '',
        city: dependent?.city || user?.city || '',
        barangay: dependent?.barangay || user?.barangay || '',
        street: street.trim().toUpperCase(),
      });

      Alert.alert('Updated', 'Dependent profile details have been saved.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update dependent details.');
    } finally {
      setSaving(false);
    }
  };

  const promoUrl = `${CONFIG.WEB_BASE_URL}/register?promote=${dependentId}`;

  const handleCopyLink = () => {
    Alert.alert('Registration Link Copied', promoUrl);
  };

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

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Over 18 Expiration Warning Banner */}
        {isOver18 && (
          <Card variant="warning" style={styles.bannerCard}>
            <Ionicons name="warning" size={24} color={theme.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: theme.warning }]}>
                Minor Status Expired (18+ Years Old)
              </Text>
              <Text style={[styles.bannerDesc, { color: theme.textMain }]}>
                Under clinical regulations, dependent profiles are for minors under 18 years of age only. Profile editing is locked. Please promote this account so they can register their own independent account.
              </Text>
            </View>
          </Card>
        )}

        {/* Identity & Demographics */}
        <Card style={[styles.formCard, isOver18 && { opacity: 0.6 }]}>
          <Text style={[styles.cardTitle, { color: theme.brandAccent }]}>Personal Details</Text>

          <Input
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            editable={!isOver18}
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
              editable={!isOver18}
            />
          )}

          <Input
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            editable={!isOver18}
            isRequired
          />

          <Input
            label="Suffix (e.g. JR, SR, III)"
            value={suffix}
            onChangeText={setSuffix}
            editable={!isOver18}
          />

          <Input
            label="Birthdate (YYYY-MM-DD)"
            value={birthdate}
            onChangeText={setBirthdate}
            editable={!isOver18}
            isRequired
          />

          <Input
            label="Street / House No."
            value={street}
            onChangeText={setStreet}
            editable={!isOver18}
            isRequired
          />
        </Card>

        {/* Promotion Options Box */}
        {isOver18 && (
          <Card style={styles.promoteCard}>
            <Text style={[styles.cardTitle, { color: theme.brandAccent }]}>Account Promotion</Text>
            <Text style={[styles.promoteDesc, { color: theme.textMuted }]}>
              All diagnostic records, previous test results, and clinical folders will safely transfer to their independent user account once registered.
            </Text>

            <Button
              title="Copy Shareable Registration Link"
              variant="outline"
              size="sm"
              icon={<Ionicons name="copy-outline" size={14} color={theme.brandAccent} />}
              onPress={handleCopyLink}
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

        {/* Action Button */}
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.md, paddingBottom: 60 },
  bannerCard: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  bannerTitle: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
  bannerDesc: { fontSize: Typography.sizes.xs - 1, marginTop: 4, lineHeight: 16 },
  formCard: { padding: Spacing.md, marginBottom: Spacing.md },
  cardTitle: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  middleNameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noneText: { fontSize: Typography.sizes.xs, fontWeight: '600' },
  smallLabel: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
  promoteCard: { padding: Spacing.md, marginTop: Spacing.sm },
  promoteDesc: { fontSize: Typography.sizes.xs, lineHeight: 18, marginBottom: Spacing.md },
});