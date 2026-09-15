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
import { apiClient } from '../../services/api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { NoticeBox } from '../../components/common/NoticeBox';
import { validateEmail } from '../../utils/validators';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyAccount'>;

export const VerifyAccountScreen: React.FC<Props> = ({ route }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, verifyOtp, sendOtp, changeUnverifiedEmail, logout } = useAuth();
  const scrollViewRef = useRef<ScrollView | null>(null);

  const targetEmail = route.params?.email || user?.email || '';
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [resendCooldown, setResendCooldown] = useState<number>(30);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Email correction state
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newEmailError, setNewEmailError] = useState<string | null>(null);
  const [changingEmail, setChangingEmail] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);

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

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendCooldown > 0) {
      interval = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleDigitChange = (val: string, index: number) => {
    const clean = val.replace(/[^0-9]/g, '');
    const updated = [...otpDigits];
    updated[index] = clean.slice(-1);
    setOtpDigits(updated);
    if (errorMsg) setErrorMsg(null);

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      showError('Please enter all 6 digits of the verification code.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    const res = await verifyOtp(fullOtp, targetEmail);
    setLoading(false);

    if (!res.success) {
      showError(res.message || 'Invalid or expired verification code. Tap "Resend Code" for a fresh OTP.');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg(null);
    const res = await sendOtp(targetEmail);

    if (res.success) {
      setResendCooldown(30);
      showSuccess('A fresh 6-digit verification code was sent to your email.');
    } else {
      showError(res.message || 'Failed to dispatch verification code.');
    }
  };

  // Option to send traditional verification email link
  const handleSendEmailLink = async () => {
    setSendingLink(true);
    try {
      await apiClient.post('/email/verification-notification');
      showSuccess(`A verification link has been sent to ${targetEmail}. Please check your inbox or spam.`);
    } catch {
      showError('Unable to send verification link. Please use the OTP code above.');
    } finally {
      setSendingLink(false);
    }
  };

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
      setResendCooldown(30);
      showSuccess('Your registered email was updated and a new verification code was dispatched.');
    } else {
      showError(res.message || 'Could not update email address.');
    }
  };

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
          <View style={[styles.iconCircle, { backgroundColor: theme.surfaceSubtle }]}>
            <Ionicons name="mail-unread-outline" size={32} color={theme.brandAccent} />
          </View>

          <Text style={[styles.title, { color: theme.textMain }]}>Verify Your Account</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Enter the 6-digit One-Time Password (OTP) dispatched to{' '}
            <Text style={{ color: theme.brandAccent, fontWeight: '700' }}>
              {targetEmail}
            </Text>
            .
          </Text>

          {/* Success Notice */}
          {successMsg ? (
            <NoticeBox
              type="success"
              message={successMsg}
              onClose={() => setSuccessMsg(null)}
              style={{ marginBottom: Spacing.md }}
            />
          ) : null}

          {/* Dynamic Error Notice */}
          {errorMsg ? (
            <NoticeBox
              type="danger"
              message={errorMsg}
              onClose={() => setErrorMsg(null)}
              style={{ marginBottom: Spacing.md }}
            />
          ) : null}

          {/* 6-Digit OTP Boxes */}
          <View style={styles.otpRow}>
            {otpDigits.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                value={digit}
                onChangeText={(val) => handleDigitChange(val, idx)}
                onKeyPress={(e) => handleKeyPress(e, idx)}
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
            onPress={handleVerify}
            loading={loading}
            size="lg"
            style={{ marginTop: Spacing.md }}
          />

          {/* Resend OTP Row */}
          <View style={styles.resendRow}>
            <Text style={[styles.resendText, { color: theme.textMuted }]}>
              Didn't receive the code?{' '}
            </Text>
            <TouchableOpacity onPress={handleResendOtp} disabled={resendCooldown > 0}>
              <Text
                style={[
                  styles.resendLink,
                  {
                    color: resendCooldown > 0 ? theme.textMuted : theme.brandAccent,
                  },
                ]}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Verify with Email Link Alternative */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.borderColor }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.borderColor }]} />
          </View>

          <Button
            title="Verify with Email Link Instead"
            variant="outline"
            size="sm"
            icon={<Ionicons name="link-outline" size={16} color={theme.brandAccent} />}
            onPress={handleSendEmailLink}
            loading={sendingLink}
            style={{ marginBottom: Spacing.md }}
          />

          {/* Change Email Trigger */}
          <TouchableOpacity
            onPress={() => setShowChangeEmail((prev) => !prev)}
            style={styles.changeEmailTrigger}>
            <Ionicons
              name="create-outline"
              size={16}
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
    marginBottom: Spacing.lg,
    lineHeight: 18,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    marginHorizontal: Spacing.sm,
  },
  changeEmailTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  changeEmailText: { fontSize: Typography.sizes.xs, fontWeight: '700' },
  changeEmailBox: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  logoutText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});