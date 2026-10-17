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
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { authApi } from '../../services/api/auth';
import { apiClient, extractErrorMessage, USER_STORAGE_KEY } from '../../services/api/client';
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
import { User } from '../../types';

export const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const { user, refreshUserProfile, logout, setUser, sendOtp, sendSmsOtp, verifyOtp } = useAuth();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const { contentOffsetY, contentHeight, layoutHeight, handleScroll } = useScrollShortcut();

  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'legal'>('profile');

  // Profile Form States (Personal Info & Address only)
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [middleName, setMiddleName] = useState(
    user?.middle_name === 'N/A' ? '' : user?.middle_name || ''
  );
  const [noMiddleName, setNoMiddleName] = useState(user?.middle_name === 'N/A');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [suffix, setSuffix] = useState(user?.suffix || '');
  const [birthdate, setBirthdate] = useState(
    user?.birthdate ? user.birthdate.split('T')[0] : ''
  );
  const [sex, setSex] = useState<'Male' | 'Female'>((user?.sex as any) || 'Male');

  // Address
  const [province, setProvince] = useState(user?.province || '');
  const [city, setCity] = useState(user?.city || '');
  const [barangay, setBarangay] = useState(user?.barangay || '');
  const [street, setStreet] = useState(user?.street || '');

  // Readonly Display Credentials (Updated strictly via dedicated OTP modals)
  const [currentEmailDisplay, setCurrentEmailDisplay] = useState(user?.email || '');
  const [currentPhoneDisplay, setCurrentPhoneDisplay] = useState(formatDisplayPhone(user?.phone));

  const [savingProfile, setSavingProfile] = useState(false);
  const [refreshingForm, setRefreshingForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Email OTP Modal States
  const [emailVerifyModalVisible, setEmailVerifyModalVisible] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [modalEmailInput, setModalEmailInput] = useState('');
  const [emailOtpDigits, setEmailOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState<number>(0);
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);

  // Phone SMS OTP Modal States
  const [phoneVerifyModalVisible, setPhoneVerifyModalVisible] = useState(false);
  const [isChangingPhone, setIsChangingPhone] = useState(false);
  const [modalPhoneInput, setModalPhoneInput] = useState('');
  const [smsOtpDigits, setSmsOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [verifyingPhoneOtp, setVerifyingPhoneOtp] = useState(false);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [phoneCooldown, setPhoneCooldown] = useState<number>(0);
  const [phoneOtpError, setPhoneOtpError] = useState<string | null>(null);

  const emailInputRefs = useRef<Array<TextInput | null>>([]);
  const smsInputRefs = useRef<Array<TextInput | null>>([]);

  // Unified Modals State
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [successModalConfig, setSuccessModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

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
      setBirthdate(currentUser.birthdate ? currentUser.birthdate.split('T')[0] : '');
      setSex((currentUser.sex as any) || 'Male');
      setProvince(currentUser.province || '');
      setCity(currentUser.city || '');
      setBarangay(currentUser.barangay || '');
      setStreet(currentUser.street || '');
      setCurrentEmailDisplay(currentUser.email || '');
      setCurrentPhoneDisplay(formatDisplayPhone(currentUser.phone));
    }
  };

  useEffect(() => {
    populateUserData(user);
  }, [user]);

  // Cooldown timer loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (emailCooldown > 0 || phoneCooldown > 0) {
      interval = setInterval(() => {
        setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        setPhoneCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [emailCooldown, phoneCooldown]);

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

  // --- OTP INPUT HELPERS ---
  const handleDigitChange = (val: string, index: number, channel: 'email' | 'sms') => {
    const clean = val.replace(/[^0-9]/g, '');
    const isEmail = channel === 'email';
    const digits = isEmail ? [...emailOtpDigits] : [...smsOtpDigits];
    const refs = isEmail ? emailInputRefs : smsInputRefs;

    digits[index] = clean.slice(-1);
    if (isEmail) {
      setEmailOtpDigits(digits);
      if (emailOtpError) setEmailOtpError(null);
    } else {
      setSmsOtpDigits(digits);
      if (phoneOtpError) setPhoneOtpError(null);
    }

    if (clean && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number, channel: 'email' | 'sms') => {
    const isEmail = channel === 'email';
    const digits = isEmail ? emailOtpDigits : smsOtpDigits;
    const refs = isEmail ? emailInputRefs : smsInputRefs;

    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  // --- MODAL TRIGGERS ---
  const openChangeEmailModal = () => {
    setIsChangingEmail(true);
    setModalEmailInput('');
    setEmailOtpDigits(['', '', '', '', '', '']);
    setEmailOtpError(null);
    setEmailVerifyModalVisible(true);
  };

  const openVerifyCurrentEmailModal = () => {
    setIsChangingEmail(false);
    setModalEmailInput(user?.email || '');
    setEmailOtpDigits(['', '', '', '', '', '']);
    setEmailOtpError(null);
    setEmailVerifyModalVisible(true);
    triggerSendEmailOtp(user?.email || '');
  };

  const openChangePhoneModal = () => {
    setIsChangingPhone(true);
    setModalPhoneInput('');
    setSmsOtpDigits(['', '', '', '', '', '']);
    setPhoneOtpError(null);
    setPhoneVerifyModalVisible(true);
  };

  const openVerifyCurrentPhoneModal = () => {
    setIsChangingPhone(false);
    setModalPhoneInput(formatDisplayPhone(user?.phone));
    setSmsOtpDigits(['', '', '', '', '', '']);
    setPhoneOtpError(null);
    setPhoneVerifyModalVisible(true);
    triggerSendPhoneOtp(user?.phone || '');
  };

  // --- DISPATCH OTP CODES ---
  const triggerSendEmailOtp = async (targetEmailInput?: string) => {
    if (emailCooldown > 0 || sendingEmailOtp) return;
    const targetEmail = (targetEmailInput || modalEmailInput).trim().toLowerCase();
    const emailErr = validateEmail(targetEmail);
    if (emailErr) {
      setEmailOtpError(emailErr);
      return;
    }

    setSendingEmailOtp(true);
    setEmailOtpError(null);
    try {
      const res = await sendOtp(targetEmail);
      if (res.success) {
        setEmailCooldown(30);
      } else {
        setEmailOtpError(res.message || 'Could not send verification code.');
      }
    } catch (err: any) {
      setEmailOtpError(extractErrorMessage(err));
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const triggerSendPhoneOtp = async (targetPhoneInput?: string) => {
    if (phoneCooldown > 0 || sendingPhoneOtp) return;
    const rawVal = (targetPhoneInput || modalPhoneInput).trim();
    const standardPhone = rawVal.startsWith('09') ? rawVal : '09' + rawVal;
    const phoneErr = validatePhone(standardPhone);
    if (phoneErr) {
      setPhoneOtpError(phoneErr);
      return;
    }

    setSendingPhoneOtp(true);
    setPhoneOtpError(null);
    try {
      const res = await sendSmsOtp(standardPhone);
      if (res.success) {
        setPhoneCooldown(30);
      } else {
        setPhoneOtpError(res.message || 'Could not send SMS verification code.');
      }
    } catch (err: any) {
      setPhoneOtpError(extractErrorMessage(err));
    } finally {
      setSendingPhoneOtp(false);
    }
  };

  // --- SUBMIT OTP CODES (IN-PLACE CREDENTIAL UPDATE) ---
  const submitModalEmailOtp = async () => {
    const fullOtp = emailOtpDigits.join('');
    if (fullOtp.length !== 6) {
      setEmailOtpError('Please enter all 6 digits of the code.');
      return;
    }

    const targetEmail = modalEmailInput.trim().toLowerCase();
    setVerifyingEmailOtp(true);
    setEmailOtpError(null);

    try {
      const res = await apiClient.post<{ success: boolean; message?: string; email?: string }>(
        '/verify-otp',
        {
          otp: fullOtp.trim(),
          email: targetEmail,
          channel: 'email',
        }
      );

      if (res.data?.success) {
        // Update user state and persistent storage without logging out
        if (user) {
          const updatedUser: User = {
            ...user,
            email: targetEmail,
            email_verified_at: new Date().toISOString(),
          };
          setUser(updatedUser);
          await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        }

        setCurrentEmailDisplay(targetEmail);
        setEmailVerifyModalVisible(false);
        setSuccessModalConfig({
          visible: true,
          title: 'Email Verified',
          message: `Your email address has been updated to ${targetEmail} and verified successfully.`,
        });
      } else {
        setEmailOtpError(res.data?.message || 'Incorrect or expired verification code.');
      }
    } catch (err: any) {
      setEmailOtpError(extractErrorMessage(err));
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  const submitModalPhoneOtp = async () => {
    const fullOtp = smsOtpDigits.join('');
    if (fullOtp.length !== 6) {
      setPhoneOtpError('Please enter all 6 digits of the SMS code.');
      return;
    }

    const rawVal = modalPhoneInput.trim();
    const standardPhone = rawVal.startsWith('09') ? rawVal : '09' + rawVal;

    setVerifyingPhoneOtp(true);
    setPhoneOtpError(null);

    try {
      const res = await apiClient.post<{ success: boolean; message?: string; phone?: string }>(
        '/verify-otp',
        {
          otp: fullOtp.trim(),
          phone: standardPhone,
          channel: 'phone',
        }
      );

      if (res.data?.success) {
        if (user) {
          const updatedUser: User = {
            ...user,
            phone: standardPhone,
            phone_verified_at: new Date().toISOString(),
          };
          setUser(updatedUser);
          await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        }

        setCurrentPhoneDisplay(formatDisplayPhone(standardPhone));
        setPhoneVerifyModalVisible(false);
        setSuccessModalConfig({
          visible: true,
          title: 'Phone Verified',
          message: `Your mobile phone number has been updated to ${standardPhone} and verified successfully.`,
        });
      } else {
        setPhoneOtpError(res.data?.message || 'Incorrect or expired SMS verification code.');
      }
    } catch (err: any) {
      setPhoneOtpError(extractErrorMessage(err));
    } finally {
      setVerifyingPhoneOtp(false);
    }
  };

  // --- SAVE PERSONAL DETAILS & ADDRESS ONLY (ZERO LOGOUT / ZERO CREDENTIAL INTERCEPTION) ---
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

    const bdErr = validateBirthdate(birthdate, false);
    if (bdErr) errs.birthdate = bdErr;

    if (!street.trim()) errs.street = 'Street address is required.';
    if (!province.trim()) errs.province = 'Province is required.';
    if (!city.trim()) errs.city = 'City / Municipality is required.';
    if (!barangay.trim()) errs.barangay = 'Barangay is required.';

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      showError('Please complete all required fields correctly before saving changes.');
      return;
    }

    setSavingProfile(true);
    try {
      // Submits with current user's email and phone so the server detects zero credential changes
      await authApi.updateProfile({
        first_name: firstName.trim().toUpperCase(),
        middle_name: noMiddleName ? 'N/A' : middleName.trim().toUpperCase() || 'N/A',
        last_name: lastName.trim().toUpperCase(),
        suffix: suffix.trim().toUpperCase() || null,
        email: user?.email || '',
        phone: user?.phone || '',
        birthdate: birthdate.trim(),
        sex,
        street: street.trim().toUpperCase(),
        barangay: barangay.trim().toUpperCase(),
        city: city.trim().toUpperCase(),
        province: province.trim().toUpperCase(),
      });

      await refreshUserProfile();
      setSuccessModalConfig({
        visible: true,
        title: 'Profile Saved',
        message: 'Your personal information and residential address have been successfully updated.',
      });
    } catch (err: any) {
      showError(err?.message || 'Could not update profile information.');
    } finally {
      setSavingProfile(false);
    }
  };

  // --- PASSWORD UPDATE ---
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
      showError(
        err?.message ||
          extractErrorMessage(err) ||
          'Could not update password. Please check your current password.'
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  // --- ACCOUNT DEACTIVATION ---
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
  const isEmailVerified = Boolean(user?.email_verified_at);
  const isPhoneVerified = Boolean(user?.phone_verified_at);

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

        {/* =========================================================================
            SECTION 1: PERSONAL PROFILE (EMAIL & PHONE ARE SEPARATED & READ-ONLY)
           ========================================================================= */}
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
                    if (fieldErrors.middleName)
                      setFieldErrors((prev) => ({ ...prev, middleName: '' }));
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
                placeholder="Optional (e.g. JR, SR, III)"
                error={fieldErrors.suffix}
              />

              {/* Birthdate */}
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

              {/* Sex Selector */}
              <Text style={[styles.smallLabel, { color: theme.textMuted, marginBottom: 6 }]}>
                SEX *
              </Text>
              <View style={styles.sexRow}>
                {(['Male', 'Female'] as const).map((s) => (
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

              {/* =========================================================================
                  SEPARATED CONTACT INFORMATION (READ-ONLY DISPLAY WITH MODAL TRIGGERS)
                 ========================================================================= */}
              <View style={styles.contactDivider}>
                <Text style={[styles.smallLabel, { color: theme.brandAccent }]}>
                  CONTACT CREDENTIALS
                </Text>
                <Text style={[styles.contactHelperText, { color: theme.textMuted }]}>
                  Email and phone changes require independent verification codes.
                </Text>
              </View>

              {/* Readonly Email Field with In-Place Verify/Change Actions */}
              <View style={styles.fieldSection}>
                <View style={styles.badgeHeaderRow}>
                  <Text style={[styles.smallLabel, { color: theme.textMuted }]}>
                    EMAIL ADDRESS
                  </Text>
                  <View style={styles.badgeWrap}>
                    {isEmailVerified ? (
                      <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(25, 211, 140, 0.12)' }]}>
                        <Ionicons name="checkmark-circle" size={11} color={theme.success} />
                        <Text style={[styles.verifiedBadgeText, { color: theme.success }]}>VERIFIED</Text>
                      </View>
                    ) : (
                      <View style={[styles.unverifiedBadge, { backgroundColor: 'rgba(255, 193, 7, 0.12)' }]}>
                        <Ionicons name="alert-circle" size={11} color={theme.warning} />
                        <Text style={[styles.unverifiedBadgeText, { color: theme.warning }]}>UNVERIFIED</Text>
                      </View>
                    )}

                    {!isEmailVerified && (
                      <TouchableOpacity onPress={openVerifyCurrentEmailModal} style={styles.actionPillBtn}>
                        <Text style={[styles.actionPillBtnText, { color: theme.brandAccent }]}>Verify Now</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={openChangeEmailModal} style={styles.actionPillBtn}>
                      <Text style={[styles.actionPillBtnText, { color: theme.brandAccent }]}>Change</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Input
                  value={currentEmailDisplay}
                  editable={false}
                  containerStyle={{ marginBottom: Spacing.sm }}
                  style={{ opacity: 0.85 }}
                />
              </View>

              {/* Readonly Phone Field with In-Place Verify/Change Actions */}
              <View style={styles.fieldSection}>
                <View style={styles.badgeHeaderRow}>
                  <Text style={[styles.smallLabel, { color: theme.textMuted }]}>
                    MOBILE PHONE
                  </Text>
                  <View style={styles.badgeWrap}>
                    {isPhoneVerified ? (
                      <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(25, 211, 140, 0.12)' }]}>
                        <Ionicons name="checkmark-circle" size={11} color={theme.success} />
                        <Text style={[styles.verifiedBadgeText, { color: theme.success }]}>VERIFIED</Text>
                      </View>
                    ) : (
                      <View style={[styles.unverifiedBadge, { backgroundColor: 'rgba(255, 193, 7, 0.12)' }]}>
                        <Ionicons name="alert-circle" size={11} color={theme.warning} />
                        <Text style={[styles.unverifiedBadgeText, { color: theme.warning }]}>UNVERIFIED</Text>
                      </View>
                    )}

                    {!isPhoneVerified && (
                      <TouchableOpacity onPress={openVerifyCurrentPhoneModal} style={styles.actionPillBtn}>
                        <Text style={[styles.actionPillBtnText, { color: theme.brandAccent }]}>Verify Now</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={openChangePhoneModal} style={styles.actionPillBtn}>
                      <Text style={[styles.actionPillBtnText, { color: theme.brandAccent }]}>Change</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Input
                  prefixText="09"
                  value={currentPhoneDisplay}
                  editable={false}
                  containerStyle={{ marginBottom: Spacing.sm }}
                  style={{ opacity: 0.85 }}
                />
              </View>

              {/* Home Address (PSGC) */}
              <Text style={[styles.cardTitle, { color: theme.brandAccent, marginTop: Spacing.md }]}>
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

        {/* =========================================================================
            SECTION 2: PASSWORD SECURITY
           ========================================================================= */}
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

        {/* =========================================================================
            SECTION 3: COMPLIANCE & LEGAL LINKS
           ========================================================================= */}
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

      {/* =========================================================================
          MODAL: IN-PLACE DEDICATED CHANGE & VERIFY EMAIL MODAL
         ========================================================================= */}
      <Modal
        visible={emailVerifyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEmailVerifyModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.brandAccent }]}>
                {isChangingEmail ? 'Change & Verify Email' : 'Email Verification Code'}
              </Text>
              <TouchableOpacity onPress={() => setEmailVerifyModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {isChangingEmail ? (
              <View style={{ marginBottom: Spacing.sm }}>
                <Text style={[styles.smallLabel, { color: theme.textMuted, marginBottom: 4 }]}>
                  NEW EMAIL ADDRESS
                </Text>
                <View style={styles.inlineActionRow}>
                  <TextInput
                    value={modalEmailInput}
                    onChangeText={setModalEmailInput}
                    placeholder="new.email@example.com"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={[
                      styles.modalTextInput,
                      {
                        backgroundColor: theme.bgMain,
                        borderColor: theme.borderColor,
                        color: theme.textMain,
                      },
                    ]}
                  />
                  <TouchableOpacity
                    onPress={() => triggerSendEmailOtp()}
                    disabled={emailCooldown > 0 || sendingEmailOtp}
                    style={[styles.modalActionBtn, { backgroundColor: theme.brandAccent }]}>
                    {sendingEmailOtp ? (
                      <ActivityIndicator size="small" color="#1C232D" />
                    ) : (
                      <Text style={styles.modalActionBtnText}>
                        {emailCooldown > 0 ? `${emailCooldown}S` : 'SEND CODE'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={[styles.modalDesc, { color: theme.textMuted }]}>
                Enter the 6-digit verification code sent to{' '}
                <Text style={{ color: theme.brandAccent, fontWeight: '700' }}>
                  {modalEmailInput}
                </Text>
                .
              </Text>
            )}

            {emailOtpError ? (
              <NoticeBox
                type="danger"
                message={emailOtpError}
                style={{ marginVertical: Spacing.xs }}
              />
            ) : null}

            <View style={styles.otpRow}>
              {emailOtpDigits.map((digit, idx) => (
                <TextInput
                  key={`email-otp-${idx}`}
                  ref={(el) => {
                    emailInputRefs.current[idx] = el;
                  }}
                  value={digit}
                  onChangeText={(val) => handleDigitChange(val, idx, 'email')}
                  onKeyPress={(e) => handleKeyPress(e, idx, 'email')}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={[
                    styles.otpBox,
                    {
                      backgroundColor: theme.bgCard,
                      borderColor: digit
                        ? theme.brandAccent
                        : emailOtpError
                        ? theme.danger
                        : theme.borderColor,
                      color: theme.textMain,
                    },
                  ]}
                />
              ))}
            </View>

            <Button
              title="Verify & Update Email"
              variant="primary"
              loading={verifyingEmailOtp}
              onPress={submitModalEmailOtp}
              style={{ marginTop: Spacing.sm }}
            />

            {!isChangingEmail && (
              <View style={styles.resendRow}>
                <Text style={[styles.resendText, { color: theme.textMuted }]}>
                  Didn't receive the email code?{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => triggerSendEmailOtp(modalEmailInput)}
                  disabled={emailCooldown > 0 || sendingEmailOtp}>
                  <Text
                    style={[
                      styles.resendLink,
                      { color: emailCooldown > 0 ? theme.textMuted : theme.brandAccent },
                    ]}>
                    {emailCooldown > 0 ? `Resend in ${emailCooldown}s` : 'Send Code'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL: IN-PLACE DEDICATED CHANGE & VERIFY PHONE MODAL
         ========================================================================= */}
      <Modal
        visible={phoneVerifyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhoneVerifyModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.brandAccent }]}>
                {isChangingPhone ? 'Change & Verify Mobile' : 'Phone SMS Verification'}
              </Text>
              <TouchableOpacity onPress={() => setPhoneVerifyModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {isChangingPhone ? (
              <View style={{ marginBottom: Spacing.sm }}>
                <Text style={[styles.smallLabel, { color: theme.textMuted, marginBottom: 4 }]}>
                  NEW MOBILE NUMBER (09XXXXXXXXX)
                </Text>
                <View style={styles.inlineActionRow}>
                  <View style={[styles.prefixInlineBox, { backgroundColor: theme.surfaceSubtle }]}>
                    <Text style={[styles.prefixInlineText, { color: theme.textMain }]}>09</Text>
                  </View>
                  <TextInput
                    value={modalPhoneInput}
                    onChangeText={(t) => setModalPhoneInput(t.replace(/[^0-9]/g, '').slice(0, 9))}
                    placeholder="171234567"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="number-pad"
                    maxLength={9}
                    style={[
                      styles.modalTextInput,
                      {
                        backgroundColor: theme.bgMain,
                        borderColor: theme.borderColor,
                        color: theme.textMain,
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                      },
                    ]}
                  />
                  <TouchableOpacity
                    onPress={() => triggerSendPhoneOtp()}
                    disabled={phoneCooldown > 0 || sendingPhoneOtp}
                    style={[styles.modalActionBtn, { backgroundColor: theme.brandAccent }]}>
                    {sendingPhoneOtp ? (
                      <ActivityIndicator size="small" color="#1C232D" />
                    ) : (
                      <Text style={styles.modalActionBtnText}>
                        {phoneCooldown > 0 ? `${phoneCooldown}S` : 'SEND SMS'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={[styles.modalDesc, { color: theme.textMuted }]}>
                Enter the 6-digit SMS verification code sent to{' '}
                <Text style={{ color: theme.brandAccent, fontWeight: '700' }}>
                  {formatToStandardPhone(modalPhoneInput)}
                </Text>
                .
              </Text>
            )}

            {phoneOtpError ? (
              <NoticeBox
                type="danger"
                message={phoneOtpError}
                style={{ marginVertical: Spacing.xs }}
              />
            ) : null}

            <View style={styles.otpRow}>
              {smsOtpDigits.map((digit, idx) => (
                <TextInput
                  key={`phone-otp-${idx}`}
                  ref={(el) => {
                    smsInputRefs.current[idx] = el;
                  }}
                  value={digit}
                  onChangeText={(val) => handleDigitChange(val, idx, 'sms')}
                  onKeyPress={(e) => handleKeyPress(e, idx, 'sms')}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={[
                    styles.otpBox,
                    {
                      backgroundColor: theme.bgCard,
                      borderColor: digit
                        ? theme.brandAccent
                        : phoneOtpError
                        ? theme.danger
                        : theme.borderColor,
                      color: theme.textMain,
                    },
                  ]}
                />
              ))}
            </View>

            <Button
              title="Verify & Update Phone"
              variant="primary"
              loading={verifyingPhoneOtp}
              onPress={submitModalPhoneOtp}
              style={{ marginTop: Spacing.sm }}
            />

            {!isChangingPhone && (
              <View style={styles.resendRow}>
                <Text style={[styles.resendText, { color: theme.textMuted }]}>
                  Didn't receive the SMS code?{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => triggerSendPhoneOtp(modalPhoneInput)}
                  disabled={phoneCooldown > 0 || sendingPhoneOtp}>
                  <Text
                    style={[
                      styles.resendLink,
                      { color: phoneCooldown > 0 ? theme.textMuted : theme.brandAccent },
                    ]}>
                    {phoneCooldown > 0 ? `Resend in ${phoneCooldown}s` : 'Send SMS'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
  scrollContent: { paddingHorizontal: Spacing.md, paddingBottom: 60 },
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
  sexRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  sexBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  contactDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  contactHelperText: {
    fontSize: 10,
    marginTop: 2,
  },
  fieldSection: {
    marginBottom: Spacing.xs,
  },
  badgeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  unverifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionPillBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  actionPillBtnText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
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
  inlineActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalTextInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: Typography.sizes.xs,
  },
  prefixInlineBox: {
    height: 42,
    paddingHorizontal: 12,
    borderTopLeftRadius: BorderRadius.sm,
    borderBottomLeftRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  prefixInlineText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
  },
  modalActionBtn: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionBtnText: {
    color: '#1C232D',
    fontSize: 10,
    fontWeight: '800',
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
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  resendText: { fontSize: Typography.sizes.xs },
  resendLink: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  modalActions: { alignItems: 'center', marginTop: Spacing.sm },
});