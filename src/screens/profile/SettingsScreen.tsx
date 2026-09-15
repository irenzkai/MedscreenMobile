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
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { authApi } from '../../services/api/auth';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import {
  validateName,
  validateSuffix,
  validateBirthdate,
  validatePhone,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from '../../utils/validators';
import { formatDisplayPhone, formatToStandardPhone } from '../../utils/formatters';
import {
  openPrivacyPolicyOnWeb,
  openTermsOfServiceOnWeb,
  openDataPrivacyActOnWeb,
  openVerifyResultOnWeb,
} from '../../utils/externalLinks';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ManageDependents'>;

export const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const { user, refreshUserProfile, logout } = useAuth();

  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'legal'>('profile');

  // Profile Form States
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [middleName, setMiddleName] = useState(user?.middle_name === 'N/A' ? '' : user?.middle_name || '');
  const [noMiddleName, setNoMiddleName] = useState(user?.middle_name === 'N/A');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [suffix, setSuffix] = useState(user?.suffix || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneDisplay, setPhoneDisplay] = useState(formatDisplayPhone(user?.phone));
  const [birthdate, setBirthdate] = useState(user?.birthdate ? user.birthdate.split('T')[0] : '');
  const [street, setStreet] = useState(user?.street || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Deletion Modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setMiddleName(user.middle_name === 'N/A' ? '' : user.middle_name || '');
      setNoMiddleName(user.middle_name === 'N/A');
      setLastName(user.last_name || '');
      setSuffix(user.suffix || '');
      setEmail(user.email || '');
      setPhoneDisplay(formatDisplayPhone(user.phone));
      setBirthdate(user.birthdate ? user.birthdate.split('T')[0] : '');
      setStreet(user.street || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    const fnErr = validateName(firstName, 'First Name');
    const lnErr = validateName(lastName, 'Last Name');
    const emErr = validateEmail(email);
    const phErr = validatePhone(formatToStandardPhone(phoneDisplay));
    const bdErr = validateBirthdate(birthdate, false);

    if (fnErr || lnErr || emErr || phErr || bdErr || !street.trim()) {
      Alert.alert('Validation Error', 'Please check all required profile fields.');
      return;
    }

    setSavingProfile(true);
    try {
      await authApi.updateProfile({
        first_name: firstName.trim().toUpperCase(),
        middle_name: noMiddleName ? 'N/A' : middleName.trim().toUpperCase() || 'N/A',
        last_name: lastName.trim().toUpperCase(),
        suffix: suffix.trim().toUpperCase() || null,
        email: email.trim().toLowerCase(),
        phone: formatToStandardPhone(phoneDisplay),
        birthdate: birthdate.trim(),
        sex: user?.sex || 'Male',
        street: street.trim().toUpperCase(),
        barangay: user?.barangay || '',
        city: user?.city || '',
        province: user?.province || '',
      });

      await refreshUserProfile();
      Alert.alert('Profile Updated', 'Your profile details have been successfully saved.');
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update profile information.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    const passErr = validatePassword(newPassword);
    const confErr = validatePasswordConfirmation(newPassword, confirmPassword);

    if (!currentPassword.trim() || passErr || confErr) {
      Alert.alert('Validation Error', passErr || confErr || 'Current password is required.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await authApi.updatePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Security Alert', 'Your password has been changed successfully.');
    } catch (err: any) {
      Alert.alert('Failed', err?.message || 'Could not update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Password Required', 'Please enter your password to confirm account deactivation.');
      return;
    }

    setDeleting(true);
    try {
      await authApi.deleteAccount(deletePassword);
      setDeleteModalVisible(false);
      await logout();
    } catch (err: any) {
      Alert.alert('Deactivation Failed', err?.message || 'Incorrect password.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <Header
        title="Settings"
        subtitle="Account & Security Center"
        rightAction={
          <TouchableOpacity onPress={logout} hitSlop={8}>
            <Ionicons name="log-out-outline" size={22} color={theme.danger} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Navigation Section Pills */}
        <View style={styles.sectionPillsRow}>
          <TouchableOpacity
            onPress={() => setActiveSection('profile')}
            style={[
              styles.sectionPill,
              {
                backgroundColor: activeSection === 'profile' ? theme.brandAccent : theme.bgCard,
                borderColor: activeSection === 'profile' ? theme.brandAccent : theme.borderColor,
              },
            ]}>
            <Text style={{ color: activeSection === 'profile' ? '#1C232D' : theme.textMuted, fontSize: 11, fontWeight: '800' }}>
              PERSONAL
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection('security')}
            style={[
              styles.sectionPill,
              {
                backgroundColor: activeSection === 'security' ? theme.brandAccent : theme.bgCard,
                borderColor: activeSection === 'security' ? theme.brandAccent : theme.borderColor,
              },
            ]}>
            <Text style={{ color: activeSection === 'security' ? '#1C232D' : theme.textMuted, fontSize: 11, fontWeight: '800' }}>
              PASSWORD
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection('legal')}
            style={[
              styles.sectionPill,
              {
                backgroundColor: activeSection === 'legal' ? theme.brandAccent : theme.bgCard,
                borderColor: activeSection === 'legal' ? theme.brandAccent : theme.borderColor,
              },
            ]}>
            <Text style={{ color: activeSection === 'legal' ? '#1C232D' : theme.textMuted, fontSize: 11, fontWeight: '800' }}>
              LEGAL
            </Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 1: PERSONAL PROFILE */}
        {activeSection === 'profile' && (
          <View>
            <Card style={styles.card}>
              <Text style={[styles.cardTitle, { color: theme.brandAccent }]}>Personal Information</Text>

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
              <Input label="Suffix" value={suffix} onChangeText={setSuffix} placeholder="Optional" />

              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                helperText="Modifying email resets its verified status."
                isRequired
              />

              <Input
                label="Phone Number"
                prefixText="09"
                value={phoneDisplay}
                onChangeText={(t) => setPhoneDisplay(t.replace(/[^0-9]/g, '').slice(0, 9))}
                keyboardType="number-pad"
                isRequired
              />

              <Input label="Birthdate" value={birthdate} onChangeText={setBirthdate} isRequired />
              <Input label="Street / House No." value={street} onChangeText={setStreet} isRequired />

              <Button
                title="Save Details"
                onPress={handleSaveProfile}
                loading={savingProfile}
                size="md"
                style={{ marginTop: Spacing.sm }}
              />
            </Card>

            {/* Deactivation Card */}
            <Card variant="danger" style={styles.dangerCard}>
              <Text style={[styles.dangerTitle, { color: theme.danger }]}>Delete Account</Text>
              <Text style={[styles.dangerDesc, { color: theme.textMuted }]}>
                Deactivating your account places your medical records in a 10-year regulatory archive before permanent destruction.
              </Text>
              <Button
                title="Deactivate Account"
                variant="danger"
                size="sm"
                onPress={() => setDeleteModalVisible(true)}
              />
            </Card>
          </View>
        )}

        {/* SECTION 2: PASSWORD SECURITY */}
        {activeSection === 'security' && (
          <Card style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.brandAccent }]}>Update System Password</Text>

            <Input
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              isPassword
              isRequired
            />

            <Input
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              isPassword
              helperText="Min. 8 chars with uppercase, lowercase, numbers, and symbols."
              isRequired
            />

            <Input
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              isRequired
            />

            <Button
              title="Update Password"
              onPress={handleUpdatePassword}
              loading={updatingPassword}
              size="md"
              style={{ marginTop: Spacing.sm }}
            />
          </Card>
        )}

        {/* SECTION 3: COMPLIANCE & LEGAL LINKS */}
        {activeSection === 'legal' && (
          <View>
            <Card style={styles.card}>
              <Text style={[styles.cardTitle, { color: theme.brandAccent }]}>Compliance & Legal Center</Text>
              <Text style={[styles.legalDesc, { color: theme.textMuted }]}>
                Medscreen operates in full compliance with the Philippine Data Privacy Act (RA 10173). Legal agreements are managed through our web portal.
              </Text>

              <TouchableOpacity style={styles.linkRow} onPress={openPrivacyPolicyOnWeb}>
                <Ionicons name="shield-outline" size={18} color={theme.brandAccent} />
                <Text style={[styles.linkRowText, { color: theme.textMain }]}>Clinical Privacy Policy</Text>
                <Ionicons name="open-outline" size={16} color={theme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkRow} onPress={openTermsOfServiceOnWeb}>
                <Ionicons name="document-text-outline" size={18} color={theme.brandAccent} />
                <Text style={[styles.linkRowText, { color: theme.textMain }]}>Terms of Service</Text>
                <Ionicons name="open-outline" size={16} color={theme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkRow} onPress={openDataPrivacyActOnWeb}>
                <Ionicons name="lock-closed-outline" size={18} color={theme.brandAccent} />
                <Text style={[styles.linkRowText, { color: theme.textMain }]}>Data Privacy Act (RA 10173)</Text>
                <Ionicons name="open-outline" size={16} color={theme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkRow} onPress={openVerifyResultOnWeb}>
                <Ionicons name="checkmark-done-circle-outline" size={18} color={theme.brandAccent} />
                <Text style={[styles.linkRowText, { color: theme.textMain }]}>Verify Public Certificate</Text>
                <Ionicons name="open-outline" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Account Deletion Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard} variant="danger">
            <Text style={[styles.modalTitle, { color: theme.danger }]}>Confirm Account Deactivation</Text>
            <Text style={[styles.modalDesc, { color: theme.textMuted }]}>
              Please enter your password to confirm voluntary deactivation.
            </Text>

            <Input
              label="Confirm Password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              isPassword
              isRequired
            />

            <View style={styles.modalActions}>
              <Button
                title="Deactivate Now"
                variant="danger"
                onPress={handleDeleteAccount}
                loading={deleting}
                style={{ width: '100%', marginBottom: Spacing.sm }}
              />
              <Button
                title="Cancel"
                variant="outline-secondary"
                size="sm"
                onPress={() => setDeleteModalVisible(false)}
                style={{ width: '100%' }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 60 },
  sectionPillsRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md },
  sectionPill: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1.5, alignItems: 'center' },
  card: { padding: Spacing.md, marginBottom: Spacing.md },
  cardTitle: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  middleNameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noneText: { fontSize: Typography.sizes.xs, fontWeight: '600' },
  smallLabel: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
  dangerCard: { padding: Spacing.md, marginBottom: Spacing.md },
  dangerTitle: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
  dangerDesc: { fontSize: Typography.sizes.xs - 1, marginVertical: Spacing.xs, lineHeight: 16 },
  legalDesc: { fontSize: Typography.sizes.xs, lineHeight: 18, marginBottom: Spacing.md },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', gap: Spacing.sm },
  linkRowText: { flex: 1, fontSize: Typography.sizes.xs, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: Spacing.md },
  modalCard: { padding: Spacing.lg },
  modalTitle: { fontSize: Typography.sizes.sm, fontWeight: '800', textTransform: 'uppercase' },
  modalDesc: { fontSize: Typography.sizes.xs, marginTop: 4, marginBottom: Spacing.md, lineHeight: 16 },
  modalActions: { alignItems: 'center', marginTop: Spacing.sm },
});