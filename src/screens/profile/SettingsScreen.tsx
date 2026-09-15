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
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { authApi } from '../../services/api/auth';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { NoticeBox } from '../../components/common/NoticeBox';
import { ActionModal } from '../../components/common/ActionModal';
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
  calculateAge,
} from '../../utils/validators';
import { formatDisplayPhone, formatToStandardPhone } from '../../utils/formatters';
import {
  openPrivacyPolicyOnWeb,
  openTermsOfServiceOnWeb,
  openDataPrivacyActOnWeb,
  openVerifyResultOnWeb,
} from '../../utils/externalLinks';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

export const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const { user, refreshUserProfile, logout, verifyOtp, sendOtp } = useAuth();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const { contentOffsetY, contentHeight, layoutHeight, handleScroll } = useScrollShortcut();

  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'legal'>('profile');

  // Profile Form States
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [middleName, setMiddleName] = useState(
    user?.middle_name === 'N/A' ? '' : user?.middle_name || ''
  );
  const [noMiddleName, setNoMiddleName] = useState(user?.middle_name === 'N/A');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [suffix, setSuffix] = useState(user?.suffix || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneDisplay, setPhoneDisplay] = useState(formatDisplayPhone(user?.phone));
  const [birthdate, setBirthdate] = useState(
    user?.birthdate ? user.birthdate.split('T')[0] : ''
  );

  // Address
  const [province, setProvince] = useState(user?.province || '');
  const [city, setCity] = useState(user?.city || '');
  const [barangay, setBarangay] = useState(user?.barangay || '');
  const [street, setStreet] = useState(user?.street || '');

  const [savingProfile, setSavingProfile] = useState(false);
  const [refreshingForm, setRefreshingForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Unified Modals State
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [successModalConfig, setSuccessModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  // Email Change Re-verification Modal States
  const [emailVerifyModalVisible, setEmailVerifyModalVisible] = useState(false);
  const [emailOtpDigits, setEmailOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Deletion Modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorBanner(msg);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  const populateUserData = (currentUser: typeof user) => {
    if (currentUser) {
      setFirstName(currentUser.first_name || '');
      setMiddleName(currentUser.middle_name === 'N/A' ? '' : currentUser.middle_name || '');
      setNoMiddleName(currentUser.middle_name === 'N/A');
      setLastName(currentUser.last_name || '');
      setSuffix(currentUser.suffix || '');
      setEmail(currentUser.email || '');
      setPhoneDisplay(formatDisplayPhone(currentUser.phone));
      setBirthdate(currentUser.birthdate ? currentUser.birthdate.split('T')[0] : '');
      setProvince(currentUser.province || '');
      setCity(currentUser.city || '');
      setBarangay(currentUser.barangay || '');
      setStreet(currentUser.street || '');
    }
  };

  useEffect(() => {
    populateUserData(user);
  }, [user]);

  // Reset to saved profile details
  const handleResetProfileForm = async () => {
    setRefreshingForm(true);
    setFieldErrors({});
    setErrorBanner(null);

    try {
      await refreshUserProfile();
      populateUserData(user);
      setSuccessModalConfig({
        visible: true,
        title: 'Reset Complete',
        message: 'All unsaved changes were discarded. The form has been reset to your saved profile.',
      });
    } catch {
      showError('Failed to refresh latest profile from server.');
    } finally {
      setRefreshingForm(false);
    }
  };

  const executeProfileSave = async (targetEmail: string) => {
    setSavingProfile(true);
    try {
      await authApi.updateProfile({
        first_name: firstName.trim().toUpperCase(),
        middle_name: noMiddleName ? 'N/A' : middleName.trim().toUpperCase() || 'N/A',
        last_name: lastName.trim().toUpperCase(),
        suffix: suffix.trim().toUpperCase() || null,
        email: targetEmail.trim().toLowerCase(),
        phone: formatToStandardPhone(phoneDisplay),
        birthdate: birthdate.trim(),
        sex: user?.sex || 'Male',
        street: street.trim().toUpperCase(),
        barangay: barangay.trim().toUpperCase(),
        city: city.trim().toUpperCase(),
        province: province.trim().toUpperCase(),
      });

      await refreshUserProfile();
      setSuccessModalConfig({
        visible: true,
        title: 'Profile Saved',
        message: 'Your clinical account details have been successfully updated in our database.',
      });
    } catch (err: any) {
      showError(err?.message || 'Could not update profile information.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
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

    const emErr = validateEmail(email);
    if (emErr) errs.email = emErr;

    const phErr = validatePhone(formatToStandardPhone(phoneDisplay));
    if (phErr) errs.phone = phErr;

    const bdErr = validateBirthdate(birthdate, false);
    if (bdErr) errs.birthdate = bdErr;

    if (!street.trim()) errs.street = 'Street address is required.';
    if (!province.trim()) errs.province = 'Province is required.';
    if (!city.trim()) errs.city = 'City / Municipality is required.';
    if (!barangay.trim()) errs.barangay = 'Barangay is required.';

    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) {
      showError('Please complete all required fields correctly.');
      return;
    }

    if (user && email.trim().toLowerCase() !== user.email.toLowerCase()) {
      try {
        setSavingProfile(true);
        await sendOtp(email.trim().toLowerCase());
        setSavingProfile(false);
        setEmailOtpDigits(['', '', '', '', '', '']);
        setOtpError(null);
        setEmailVerifyModalVisible(true);
      } catch {
        setSavingProfile(false);
        showError('Could not send verification code to your new email.');
      }
      return;
    }

    await executeProfileSave(user?.email || email);
  };

  const handleVerifyNewEmailOtp = async () => {
    const fullOtp = emailOtpDigits.join('');
    if (fullOtp.length !== 6) {
      setOtpError('Please enter all 6 digits.');
      return;
    }
    setVerifyingOtp(true);
    setOtpError(null);
    const res = await verifyOtp(fullOtp, email.trim().toLowerCase());
    setVerifyingOtp(false);

    if (res.success) {
      setEmailVerifyModalVisible(false);
      await executeProfileSave(email.trim().toLowerCase());
    } else {
      setOtpError(res.message || 'Incorrect verification code. Please try again.');
    }
  };

  const handleUpdatePassword = async () => {
    setErrorBanner(null);
    const errs: Record<string, string> = {};

    if (!currentPassword.trim()) {
      errs.currentPassword = 'Current password is required.';
    }
    const passErr = validatePassword(newPassword);
    if (passErr) errs.newPassword = passErr;

    const confErr = validatePasswordConfirmation(newPassword, confirmPassword);
    if (confErr) errs.confirmPassword = confErr;

    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) {
      showError('Please correct password fields before proceeding.');
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
      setSuccessModalConfig({
        visible: true,
        title: 'Password Updated',
        message: 'Your portal login password has been securely updated.',
      });
    } catch (err: any) {
      showError(err?.message || 'Could not update password. Please check your current password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      showError('Please enter your password to confirm account deactivation.');
      return;
    }
    setDeleting(true);
    try {
      await authApi.deleteAccount(deletePassword);
      setDeleteModalVisible(false);
      await logout();
    } catch (err: any) {
      showError(err?.message || 'Incorrect password.');
    } finally {
      setDeleting(false);
    }
  };

  const liveAge = birthdate ? calculateAge(birthdate) : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      {/* Top Navbar with Logout Trigger */}
      <Header
        rightAction={
          <TouchableOpacity onPress={() => setLogoutModalVisible(true)} hitSlop={8}>
            <Ionicons name="log-out-outline" size={22} color={theme.danger} />
          </TouchableOpacity>
        }
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

        <View style={styles.pageTitleBlock}>
          <Text style={[styles.pageMainTitle, { color: theme.brandAccent }]}>SETTINGS</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>
            Account credentials, address details, and security center.
          </Text>
        </View>

        {/* Section Pills */}
        <View style={styles.sectionPillsRow}>
          <TouchableOpacity
            onPress={() => {
              setActiveSection('profile');
              setErrorBanner(null);
              setFieldErrors({});
            }}
            style={[
              styles.sectionPill,
              {
                backgroundColor: activeSection === 'profile' ? theme.brandAccent : theme.bgCard,
                borderColor: activeSection === 'profile' ? theme.brandAccent : theme.borderColor,
              },
            ]}>
            <Text
              style={{
                color: activeSection === 'profile' ? '#1C232D' : theme.textMuted,
                fontSize: 11,
                fontWeight: '800',
              }}>
              PERSONAL
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setActiveSection('security');
              setErrorBanner(null);
              setFieldErrors({});
            }}
            style={[
              styles.sectionPill,
              {
                backgroundColor: activeSection === 'security' ? theme.brandAccent : theme.bgCard,
                borderColor: activeSection === 'security' ? theme.brandAccent : theme.borderColor,
              },
            ]}>
            <Text
              style={{
                color: activeSection === 'security' ? '#1C232D' : theme.textMuted,
                fontSize: 11,
                fontWeight: '800',
              }}>
              PASSWORD
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setActiveSection('legal');
              setErrorBanner(null);
              setFieldErrors({});
            }}
            style={[
              styles.sectionPill,
              {
                backgroundColor: activeSection === 'legal' ? theme.brandAccent : theme.bgCard,
                borderColor: activeSection === 'legal' ? theme.brandAccent : theme.borderColor,
              },
            ]}>
            <Text
              style={{
                color: activeSection === 'legal' ? '#1C232D' : theme.textMuted,
                fontSize: 11,
                fontWeight: '800',
              }}>
              LEGAL
            </Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 1: PERSONAL PROFILE */}
        {activeSection === 'profile' && (
          <View>
            <Card style={styles.card}>
              <View style={styles.cardHeaderWithAction}>
                <Text style={[styles.cardTitle, { color: theme.brandAccent, marginBottom: 0 }]}>
                  Personal Information
                </Text>
                <TouchableOpacity
                  onPress={handleResetProfileForm}
                  disabled={refreshingForm}
                  style={[
                    styles.resetHeaderBtn,
                    {
                      borderColor: theme.brandAccent,
                      backgroundColor: theme.surfaceSubtle,
                    },
                  ]}
                  hitSlop={8}>
                  {refreshingForm ? (
                    <ActivityIndicator size="small" color={theme.brandAccent} />
                  ) : (
                    <>
                      <Ionicons name="refresh-outline" size={12} color={theme.brandAccent} />
                      <Text style={[styles.resetHeaderBtnText, { color: theme.brandAccent }]}>
                        RESET INFO
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

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
                <Text style={[styles.smallLabel, { color: theme.textMuted }]}>
                  MIDDLE NAME
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
                placeholder="Optional"
                error={fieldErrors.suffix}
              />

              <Input
                label="Email Address"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                helperText="Modifying email requires OTP verification before saving."
                error={fieldErrors.email}
                isRequired
              />

              <Input
                label="Phone Number"
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

              <Text
                style={[
                  styles.cardTitle,
                  { color: theme.brandAccent, marginTop: Spacing.md },
                ]}>
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

              <Button
                title="Save Details"
                onPress={handleSaveProfile}
                loading={savingProfile}
                size="md"
                style={{ marginTop: Spacing.md }}
              />
            </Card>

            {/* Deactivation Card */}
            <Card variant="danger" style={styles.dangerCard}>
              <Text style={[styles.dangerTitle, { color: theme.danger }]}>
                Delete Account
              </Text>
              <Text style={[styles.dangerDesc, { color: theme.textMuted }]}>
                Deactivating your account places your medical records in a 10-year regulatory
                archive before permanent destruction.
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
            <Text style={[styles.cardTitle, { color: theme.brandAccent }]}>
              Update System Password
            </Text>

            <Input
              label="Current Password"
              value={currentPassword}
              onChangeText={(t) => {
                setCurrentPassword(t);
                if (fieldErrors.currentPassword) {
                  setFieldErrors((prev) => ({ ...prev, currentPassword: '' }));
                }
              }}
              isPassword
              error={fieldErrors.currentPassword}
              isRequired
            />

            <Input
              label="New Password"
              value={newPassword}
              onChangeText={(t) => {
                setNewPassword(t);
                if (fieldErrors.newPassword) {
                  setFieldErrors((prev) => ({ ...prev, newPassword: '' }));
                }
              }}
              isPassword
              helperText="Min. 8 chars with uppercase, lowercase, numbers, and symbols."
              error={fieldErrors.newPassword}
              isRequired
            />

            <Input
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }
              }}
              isPassword
              error={fieldErrors.confirmPassword}
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
              <Text style={[styles.cardTitle, { color: theme.brandAccent }]}>
                Compliance & Legal Center
              </Text>
              <Text style={[styles.legalDesc, { color: theme.textMuted }]}>
                Medscreen operates in full compliance with the Philippine Data Privacy Act (RA 10173).
              </Text>

              <TouchableOpacity style={styles.linkRow} onPress={openPrivacyPolicyOnWeb}>
                <Ionicons name="shield-outline" size={18} color={theme.brandAccent} />
                <Text style={[styles.linkRowText, { color: theme.textMain }]}>
                  Clinical Privacy Policy
                </Text>
                <Ionicons name="open-outline" size={16} color={theme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkRow} onPress={openTermsOfServiceOnWeb}>
                <Ionicons name="document-text-outline" size={18} color={theme.brandAccent} />
                <Text style={[styles.linkRowText, { color: theme.textMain }]}>
                  Terms of Service
                </Text>
                <Ionicons name="open-outline" size={16} color={theme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkRow} onPress={openDataPrivacyActOnWeb}>
                <Ionicons name="lock-closed-outline" size={18} color={theme.brandAccent} />
                <Text style={[styles.linkRowText, { color: theme.textMain }]}>
                  Data Privacy Act (RA 10173)
                </Text>
                <Ionicons name="open-outline" size={16} color={theme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkRow} onPress={openVerifyResultOnWeb}>
                <Ionicons name="checkmark-done-circle-outline" size={18} color={theme.brandAccent} />
                <Text style={[styles.linkRowText, { color: theme.textMain }]}>
                  Verify Laboratory Certificate
                </Text>
                <Ionicons name="open-outline" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </Card>
          </View>
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
        isDependent={false}
        mode="birthdate"
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(newDate) => {
          setBirthdate(newDate);
          if (fieldErrors.birthdate) setFieldErrors((prev) => ({ ...prev, birthdate: '' }));
        }}
      />

      {/* UNIFIED MODAL: Logout Confirmation */}
      <ActionModal
        visible={logoutModalVisible}
        type="warning"
        icon="log-out-outline"
        title="Sign Out"
        message="Are you sure you want to log out of your Medscreen clinical portal session?"
        confirmText="Log Out"
        cancelText="Stay"
        confirmVariant="danger"
        onClose={() => setLogoutModalVisible(false)}
        onConfirm={async () => {
          setLogoutModalVisible(false);
          await logout();
        }}
      />

      {/* UNIFIED MODAL: General Success Prompts */}
      <ActionModal
        visible={successModalConfig.visible}
        type="success"
        icon="checkmark-circle-outline"
        title={successModalConfig.title}
        message={successModalConfig.message}
        isSingleAction={true}
        confirmText="OK"
        onClose={() => setSuccessModalConfig((prev) => ({ ...prev, visible: false }))}
      />

      {/* Email Change Re-verification Modal */}
      <Modal
        visible={emailVerifyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEmailVerifyModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.brandAccent }]}>
                Verify New Email
              </Text>
              <TouchableOpacity
                onPress={() => setEmailVerifyModalVisible(false)}
                hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalDesc, { color: theme.textMuted }]}>
              Enter the 6-digit verification code sent to{' '}
              <Text style={{ color: theme.brandAccent, fontWeight: '700' }}>{email}</Text> to
              confirm this change before saving your profile.
            </Text>

            {otpError ? (
              <NoticeBox
                type="danger"
                message={otpError}
                style={{ marginVertical: Spacing.sm }}
              />
            ) : null}

            <View style={styles.otpRow}>
              {emailOtpDigits.map((digit, idx) => (
                <TextInput
                  key={idx}
                  value={digit}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, '').slice(-1);
                    const updated = [...emailOtpDigits];
                    updated[idx] = clean;
                    setEmailOtpDigits(updated);
                  }}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={[
                    styles.otpBox,
                    {
                      backgroundColor: theme.bgCard,
                      borderColor: digit ? theme.brandAccent : theme.borderColor,
                      color: theme.textMain,
                    },
                  ]}
                />
              ))}
            </View>

            <Button
              title="Confirm & Save Profile"
              variant="primary"
              loading={verifyingOtp}
              onPress={handleVerifyNewEmailOtp}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        </View>
      </Modal>

      {/* Account Deactivation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard} variant="danger">
            <Text style={[styles.modalTitle, { color: theme.danger }]}>
              Confirm Account Deactivation
            </Text>
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
  pageTitleBlock: { marginVertical: Spacing.sm },
  pageMainTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pageSubtitle: { fontSize: Typography.sizes.xs, marginTop: 2 },
  sectionPillsRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md },
  sectionPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  card: { padding: Spacing.md, marginBottom: Spacing.md },
  cardHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  dangerCard: { padding: Spacing.md, marginBottom: Spacing.md },
  dangerTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dangerDesc: {
    fontSize: Typography.sizes.xs - 1,
    marginVertical: Spacing.xs,
    lineHeight: 16,
  },
  legalDesc: { fontSize: Typography.sizes.xs, lineHeight: 18, marginBottom: Spacing.md },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: Spacing.sm,
  },
  linkRowText: { flex: 1, fontSize: Typography.sizes.xs, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  modalCard: { padding: Spacing.lg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modalTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  modalDesc: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
    marginBottom: Spacing.md,
    lineHeight: 16,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.sm,
  },
  otpBox: {
    width: 42,
    height: 50,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
  },
  modalActions: { alignItems: 'center', marginTop: Spacing.sm },
});