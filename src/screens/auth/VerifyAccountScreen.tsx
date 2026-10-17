import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { apiClient, extractErrorMessage } from '../../services/api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { NoticeBox } from '../../components/common/NoticeBox';
import { validateEmail, validatePhone } from '../../utils/validators';
import { formatToStandardPhone } from '../../utils/formatters';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';
import { User } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyAccount'>;
type VerificationTab = 'link' | 'email_otp' | 'sms_otp';

export const VerifyAccountScreen: React.FC<Props> = ({ route }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    user,
    sendOtp,
    sendSmsOtp,
    changeUnverifiedEmail,
    changeUnverifiedPhone,
    logout,
    setUser,
    refreshUserProfile,
  } = useAuth();
  const scrollViewRef = useRef<ScrollView | null>(null);

  const targetEmail = route.params?.email || user?.email || '';
  const userPhone = user?.phone || '';

  const [activeTab, setActiveTab] = useState<VerificationTab>('link');

  // OTP inputs for Email and SMS channels
  const [emailOtpDigits, setEmailOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [smsOtpDigits, setSmsOtpDigits] = useState<string[]>(['', '', '', '', '', '']);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [resendingEmailOtp, setResendingEmailOtp] = useState(false);
  const [resendingSmsOtp, setResendingSmsOtp] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [changingPhone, setChangingPhone] = useState(false);

  // Independent 30s cooldowns per channel
  const [linkCooldown, setLinkCooldown] = useState<number>(0);
  const [emailCooldown, setEmailCooldown] = useState<number>(30);
  const [smsCooldown, setSmsCooldown] = useState<number>(0);

  // Notification banners
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Change Email accordion
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newEmailError, setNewEmailError] = useState<string | null>(null);

  // Change Phone accordion
  const [showChangePhone, setShowChangePhone] = useState(false);
  const [newPhoneDisplay, setNewPhoneDisplay] = useState('');
  const [newPhoneError, setNewPhoneError] = useState<string | null>(null);

  // Input refs for automatic focus progression
  const emailInputRefs = useRef<Array<TextInput | null>>([]);
  const smsInputRefs = useRef<Array<TextInput | null>>([]);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  // Cooldown countdown tick
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (linkCooldown > 0 || emailCooldown > 0 || smsCooldown > 0) {
      interval = setInterval(() => {
        setLinkCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        setSmsCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [linkCooldown, emailCooldown, smsCooldown]);

  const handleDigitChange = (val: string, index: number, channel: 'email' | 'sms') => {
    const clean = val.replace(/[^0-9]/g, '');
    const isEmail = channel === 'email';
    const digits = isEmail ? [...emailOtpDigits] : [...smsOtpDigits];
    const refs = isEmail ? emailInputRefs : smsInputRefs;

    digits[index] = clean.slice(-1);
    if (isEmail) {
      setEmailOtpDigits(digits);
    } else {
      setSmsOtpDigits(digits);
    }

    if (errorMsg) setErrorMsg(null);

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

  // 1. Send Email Verification Link
  const handleSendEmailLink = async () => {
    if (linkCooldown > 0 || sendingLink) return;
    setErrorMsg(null);
    setSendingLink(true);
    try {
      await apiClient.post('/email/verification-notification');
      showSuccess(`A fresh verification link has been successfully dispatched to ${targetEmail}.`);
      setLinkCooldown(30);
    } catch (err: any) {
      showError(
        extractErrorMessage(err) || 'Unable to send verification link. Please use an OTP code.'
      );
    } finally {
      setSendingLink(false);
    }
  };

  // 2. Resend Email OTP Code
  const handleResendEmailOtp = async () => {
    if (emailCooldown > 0 || resendingEmailOtp) return;
    setErrorMsg(null);
    setResendingEmailOtp(true);
    try {
      const res = await sendOtp(targetEmail);
      if (res.success) {
        showSuccess('A secure 6-digit One-Time Password has been dispatched to your email address.');
        setEmailCooldown(30);
      } else {
        showError(res.message || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      showError(extractErrorMessage(err));
    } finally {
      setResendingEmailOtp(false);
    }
  };

  // 3. Resend SMS OTP Code
  const handleResendSmsOtp = async () => {
    if (smsCooldown > 0 || resendingSmsOtp) return;
    if (!userPhone) {
      showError('No mobile phone number registered on file for your account.');
      return;
    }
    setErrorMsg(null);
    setResendingSmsOtp(true);
    try {
      const res = await apiClient.post('/sms/verification-otp', {
        phone: userPhone,
        channel: 'sms',
      });
      showSuccess(
        res.data?.message ||
          'A secure 6-digit SMS verification code has been dispatched to your mobile phone.'
      );
      setSmsCooldown(30);
    } catch (err: any) {
      showError(extractErrorMessage(err) || 'Failed to dispatch SMS verification code.');
    } finally {
      setResendingSmsOtp(false);
    }
  };

  // 4. Verify OTP Code (Email or SMS)
  const handleVerifyOtp = async (channel: 'email' | 'sms') => {
    const digits = channel === 'email' ? emailOtpDigits : smsOtpDigits;
    const fullOtp = digits.join('');

    if (fullOtp.length !== 6) {
      showError('Please enter all 6 digits of the verification code.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await apiClient.post('/verify-otp', {
        otp: fullOtp.trim(),
        channel,
      });

      if (res.data?.success) {
        showSuccess(res.data.message || 'Account successfully verified!');
        if (user) {
          const verifiedUser: User = {
            ...user,
            email_verified_at:
              channel === 'email' ? new Date().toISOString() : user.email_verified_at,
            phone_verified_at:
              channel === 'sms' ? new Date().toISOString() : user.phone_verified_at,
          };
          setUser(verifiedUser);
        }
        await refreshUserProfile();
      } else {
        showError(res.data?.message || 'The entered verification code is incorrect or expired.');
      }
    } catch (err: any) {
      showError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // 5. Update Email
  const handleUpdateEmail = async () => {
    setNewEmailError(null);
    const emailErr = validateEmail(newEmail);
    if (emailErr) {
      setNewEmailError(emailErr);
      showError(emailErr);
      return;
    }

    setChangingEmail(true);
    const res = await changeUnverifiedEmail(newEmail);
    setChangingEmail(false);

    if (res.success) {
      setShowChangeEmail(false);
      setNewEmail('');
      setEmailCooldown(30);
      showSuccess(
        'Your registered email was updated and a new verification code was dispatched.'
      );
    } else {
      showError(res.message || 'Could not update email address.');
    }
  };

  // 6. Update Mobile Phone Number
  const handleUpdatePhone = async () => {
    setNewPhoneError(null);
    const standardPhone = formatToStandardPhone(newPhoneDisplay);
    const phoneErr = validatePhone(standardPhone);
    if (phoneErr) {
      setNewPhoneError(phoneErr);
      showError(phoneErr);
      return;
    }

    setChangingPhone(true);
    const res = await changeUnverifiedPhone(standardPhone);
    setChangingPhone(false);

    if (res.success) {
      setShowChangePhone(false);
      setNewPhoneDisplay('');
      setSmsCooldown(30);
      setSmsOtpDigits(['', '', '', '', '', '']);
      showSuccess(
        'Your registered phone number was updated and a new SMS verification code was dispatched.'
      );
    } else {
      showError(res.message || 'Could not update phone number.');
    }
  };

  // 7. Logout / Cancel & Exit
  const handleCancelAndExit = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to cancel and exit? You will be logged out of your session.',
      [
        { text: 'Keep Verifying', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  // Dynamic header copy based on active tab
  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'link':
        return {
          icon: 'link-outline' as const,
          title: 'Email Activation Link',
          subtitle: 'Click the secure sign-off link sent to your email inbox.',
        };
      case 'email_otp':
        return {
          icon: 'mail-unread-outline' as const,
          title: 'Email Verification Code',
          subtitle: 'Enter the 6-digit dynamic code dispatched to your email.',
        };
      case 'sms_otp':
        return {
          icon: 'chatbubble-ellipses-outline' as const,
          title: 'Mobile SMS OTP',
          subtitle: 'Enter the 6-digit text message code sent to your phone.',
        };
    }
  };

  const headerMeta = getHeaderMeta();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + Spacing.lg, 40),
            paddingBottom: insets.bottom + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          {/* Header Icon & Title */}
          <View style={[styles.iconCircle, { backgroundColor: theme.surfaceSubtle }]}>
            <Ionicons name={headerMeta.icon} size={30} color={theme.brandAccent} />
          </View>
          <Text style={[styles.title, { color: theme.textMain }]}>{headerMeta.title}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{headerMeta.subtitle}</Text>

          {/* Dynamic In-Page Notifications */}
          {successMsg ? (
            <NoticeBox
              type="success"
              title="Notification Dispatched"
              message={successMsg}
              onClose={() => setSuccessMsg(null)}
              style={{ marginBottom: Spacing.md }}
            />
          ) : null}

          {errorMsg ? (
            <NoticeBox
              type="danger"
              message={errorMsg}
              onClose={() => setErrorMsg(null)}
              style={{ marginBottom: Spacing.md }}
            />
          ) : null}

          {/* Three Verification Tabs */}
          <View style={styles.tabPillsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveTab('link');
                setErrorMsg(null);
              }}
              style={[
                styles.tabPill,
                {
                  backgroundColor: activeTab === 'link' ? theme.brandAccent : theme.bgCard,
                  borderColor: activeTab === 'link' ? theme.brandAccent : theme.borderColor,
                },
              ]}>
              <Ionicons
                name="link-outline"
                size={13}
                color={activeTab === 'link' ? '#1C232D' : theme.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.tabPillText,
                  { color: activeTab === 'link' ? '#1C232D' : theme.textMuted },
                ]}>
                Link
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveTab('email_otp');
                setErrorMsg(null);
              }}
              style={[
                styles.tabPill,
                {
                  backgroundColor: activeTab === 'email_otp' ? theme.brandAccent : theme.bgCard,
                  borderColor: activeTab === 'email_otp' ? theme.brandAccent : theme.borderColor,
                },
              ]}>
              <Ionicons
                name="mail-outline"
                size={13}
                color={activeTab === 'email_otp' ? '#1C232D' : theme.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.tabPillText,
                  { color: activeTab === 'email_otp' ? '#1C232D' : theme.textMuted },
                ]}>
                Email Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveTab('sms_otp');
                setErrorMsg(null);
              }}
              style={[
                styles.tabPill,
                {
                  backgroundColor: activeTab === 'sms_otp' ? theme.brandAccent : theme.bgCard,
                  borderColor: activeTab === 'sms_otp' ? theme.brandAccent : theme.borderColor,
                },
              ]}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={13}
                color={activeTab === 'sms_otp' ? '#1C232D' : theme.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.tabPillText,
                  { color: activeTab === 'sms_otp' ? '#1C232D' : theme.textMuted },
                ]}>
                SMS Code
              </Text>
            </TouchableOpacity>
          </View>

          {/* =========================================================================
              TAB 1: EMAIL VERIFICATION LINK
             ========================================================================= */}
          {activeTab === 'link' && (
            <View>
              <View
                style={[
                  styles.infoCard,
                  { borderColor: theme.borderColor, backgroundColor: theme.surfaceSubtle },
                ]}>
                <View style={[styles.channelIconWrap, { backgroundColor: theme.bgCard }]}>
                  <Ionicons name="mail-open-outline" size={20} color={theme.brandAccent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: theme.textMuted }]}>
                    REGISTERED EMAIL
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.textMain }]} numberOfLines={1}>
                    {targetEmail}
                  </Text>
                </View>
              </View>
              <Text style={[styles.methodDesc, { color: theme.textMuted }]}>
                We will dispatch a secure, cryptographic one-click activation URL to your email inbox. Simply tap the link to unlock your patient portal.
              </Text>
              <Button
                title={
                  linkCooldown > 0 ? `Resend Link in ${linkCooldown}s` : 'Send Activation Email Link'
                }
                onPress={handleSendEmailLink}
                loading={sendingLink}
                disabled={linkCooldown > 0}
                size="lg"
                style={{ marginTop: Spacing.sm }}
              />
            </View>
          )}

          {/* =========================================================================
              TAB 2: EMAIL VERIFICATION CODE (6-DIGIT OTP)
             ========================================================================= */}
          {activeTab === 'email_otp' && (
            <View>
              <View style={styles.channelHeader}>
                <Text style={[styles.channelLabel, { color: theme.textMuted }]}>
                  Enter 6-Digit Email Code
                </Text>
                <Text
                  style={[styles.channelTarget, { color: theme.brandAccent }]}
                  numberOfLines={1}>
                  {targetEmail}
                </Text>
              </View>
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
                          : errorMsg
                          ? theme.danger
                          : theme.borderColor,
                        color: theme.textMain,
                      },
                    ]}
                  />
                ))}
              </View>
              <Button
                title="Submit Verification Code"
                onPress={() => handleVerifyOtp('email')}
                loading={loading}
                size="lg"
                style={{ marginTop: Spacing.xs }}
              />
              <View style={styles.resendRow}>
                <Text style={[styles.resendText, { color: theme.textMuted }]}>
                  Didn't receive the email code?{' '}
                </Text>
                <TouchableOpacity onPress={handleResendEmailOtp} disabled={emailCooldown > 0}>
                  <Text
                    style={[
                      styles.resendLink,
                      {
                        color: emailCooldown > 0 ? theme.textMuted : theme.brandAccent,
                      },
                    ]}>
                    {emailCooldown > 0 ? `Resend in ${emailCooldown}s` : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Change Email Trigger & Form (Visible for Email Channels) */}
          {(activeTab === 'link' || activeTab === 'email_otp') && (
            <>
              <TouchableOpacity
                onPress={() => setShowChangeEmail((prev) => !prev)}
                style={styles.changeEmailTrigger}>
                <Ionicons
                  name="create-outline"
                  size={15}
                  color={theme.brandAccent}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.changeEmailText, { color: theme.brandAccent }]}>
                  {showChangeEmail ? 'Cancel Email Edit' : 'Entered wrong email? Change it'}
                </Text>
              </TouchableOpacity>
              {showChangeEmail && (
                <View style={[styles.changeEmailBox, { borderColor: theme.borderColor }]}>
                  <Input
                    label="Correct Email Address"
                    value={newEmail}
                    onChangeText={(t) => {
                      setNewEmail(t);
                      if (newEmailError) setNewEmailError(null);
                    }}
                    error={newEmailError}
                    placeholder="new.email@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Button
                    title="Update Email & Send Code"
                    variant="outline"
                    size="sm"
                    onPress={handleUpdateEmail}
                    loading={changingEmail}
                  />
                </View>
              )}
            </>
          )}

          {/* =========================================================================
              TAB 3: MOBILE PHONE SMS OTP (6-DIGIT OTP)
             ========================================================================= */}
          {activeTab === 'sms_otp' && (
            <View>
              <View style={styles.channelHeader}>
                <Text style={[styles.channelLabel, { color: theme.textMuted }]}>
                  Enter 6-Digit SMS Code
                </Text>
                <Text
                  style={[styles.channelTarget, { color: theme.brandAccent }]}
                  numberOfLines={1}>
                  {userPhone || 'No phone registered'}
                </Text>
              </View>
              <View style={styles.otpRow}>
                {smsOtpDigits.map((digit, idx) => (
                  <TextInput
                    key={`sms-otp-${idx}`}
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
                          : errorMsg
                          ? theme.danger
                          : theme.borderColor,
                        color: theme.textMain,
                      },
                    ]}
                  />
                ))}
              </View>
              <Button
                title="Verify SMS Code"
                onPress={() => handleVerifyOtp('sms')}
                loading={loading}
                size="lg"
                style={{ marginTop: Spacing.xs }}
              />
              <View style={styles.resendRow}>
                <Text style={[styles.resendText, { color: theme.textMuted }]}>
                  Didn't receive the SMS code?{' '}
                </Text>
                <TouchableOpacity onPress={handleResendSmsOtp} disabled={smsCooldown > 0}>
                  <Text
                    style={[
                      styles.resendLink,
                      {
                        color: smsCooldown > 0 ? theme.textMuted : theme.brandAccent,
                      },
                    ]}>
                    {smsCooldown > 0 ? `Resend in ${smsCooldown}s` : 'Resend SMS Code'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Change Mobile Phone Number in SMS OTP Area */}
              <TouchableOpacity
                onPress={() => setShowChangePhone((prev) => !prev)}
                style={styles.changePhoneTrigger}>
                <Ionicons
                  name="create-outline"
                  size={15}
                  color={theme.brandAccent}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.changePhoneText, { color: theme.brandAccent }]}>
                  {showChangePhone ? 'Cancel Phone Edit' : 'Entered wrong phone number? Change it'}
                </Text>
              </TouchableOpacity>
              {showChangePhone && (
                <View style={[styles.changePhoneBox, { borderColor: theme.borderColor }]}>
                  <Input
                    label="Correct Mobile Phone"
                    prefixText="09"
                    value={newPhoneDisplay}
                    onChangeText={(txt) => {
                      const digits = txt.replace(/[^0-9]/g, '').slice(0, 9);
                      setNewPhoneDisplay(digits);
                      if (newPhoneError) setNewPhoneError(null);
                    }}
                    placeholder="171234567"
                    keyboardType="number-pad"
                    helperText="Enter 9 digits after 09."
                    error={newPhoneError}
                  />
                  <Button
                    title="Update Phone & Send SMS Code"
                    variant="outline"
                    size="sm"
                    onPress={handleUpdatePhone}
                    loading={changingPhone}
                  />
                </View>
              )}
            </View>
          )}

          {/* Cancel & Exit Action */}
          <TouchableOpacity onPress={handleCancelAndExit} style={styles.logoutBtn}>
            <Ionicons
              name="log-out-outline"
              size={16}
              color={theme.danger}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.logoutText, { color: theme.danger }]}>Cancel & Exit</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, justifyContent: 'center' },
  card: { padding: Spacing.xl },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  tabPillsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  tabPillText: {
    fontSize: Typography.sizes.xs - 2,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  channelIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    marginTop: 2,
  },
  methodDesc: {
    fontSize: Typography.sizes.xs,
    lineHeight: 17,
    marginBottom: Spacing.md,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  channelLabel: {
    fontSize: Typography.sizes.xs - 1,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  channelTarget: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    maxWidth: '50%',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.md,
  },
  otpBox: {
    width: 44,
    height: 54,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  resendText: { fontSize: Typography.sizes.xs },
  resendLink: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  changeEmailTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  changeEmailText: { fontSize: Typography.sizes.xs, fontWeight: '700' },
  changeEmailBox: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
  },
  changePhoneTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  changePhoneText: { fontSize: Typography.sizes.xs, fontWeight: '700' },
  changePhoneBox: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  logoutText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});