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
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { validateEmail } from '../../utils/validators';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyAccount'>;

export const VerifyAccountScreen: React.FC<Props> = ({ route }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, verifyOtp, sendOtp, changeUnverifiedEmail, logout } = useAuth();

  const targetEmail = route.params?.email || user?.email || '';

  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState<number>(30);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Email correction section state
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
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
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    const res = await verifyOtp(fullOtp, targetEmail);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.message || 'Invalid or expired verification code.');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg(null);
    const res = await sendOtp(targetEmail);
    if (res.success) {
      setResendCooldown(30);
      Alert.alert('Code Sent', 'A fresh 6-digit verification code was sent to your email.');
    } else {
      setErrorMsg(res.message || 'Failed to dispatch verification code.');
    }
  };

  const handleUpdateEmail = async () => {
    const emailErr = validateEmail(newEmail);
    if (emailErr) {
      Alert.alert('Invalid Email', emailErr);
      return;
    }

    setChangingEmail(true);
    const res = await changeUnverifiedEmail(newEmail);
    setChangingEmail(false);

    if (res.success) {
      setShowChangeEmail(false);
      setNewEmail('');
      setResendCooldown(30);
      Alert.alert('Email Updated', 'Your registered email was updated and a new verification code was sent.');
    } else {
      Alert.alert('Update Failed', res.message || 'Could not update email address.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + Spacing.lg, 40), paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: theme.surfaceSubtle }]}>
            <Ionicons name="mail-unread-outline" size={32} color={theme.brandAccent} />
          </View>

          <Text style={[styles.title, { color: theme.textMain }]}>Verify Your Account</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Enter the 6-digit One-Time Password (OTP) dispatched to{' '}
            <Text style={{ color: theme.brandAccent, fontWeight: '700' }}>{targetEmail}</Text>.
          </Text>

          {errorMsg && (
            <View style={[styles.statusBox, { backgroundColor: 'rgba(220, 53, 69, 0.08)', borderColor: theme.danger }]}>
              <Ionicons name="alert-circle" size={18} color={theme.danger} />
              <Text style={[styles.statusText, { color: theme.danger }]}>{errorMsg}</Text>
            </View>
          )}

          {/* 6-Digit OTP Boxes */}
          <View style={styles.otpRow}>
            {otpDigits.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                value={digit}
                onChangeText={(val) => handleDigitChange(val, idx)}
                onKeyPress={(e) => handleKeyPress(e, idx)}
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
            title="Submit Verification Code"
            onPress={handleVerify}
            loading={loading}
            size="lg"
            style={{ marginTop: Spacing.md }}
          />

          {/* Resend Action */}
          <View style={styles.resendRow}>
            <Text style={[styles.resendText, { color: theme.textMuted }]}>Didn't receive the code? </Text>
            <TouchableOpacity onPress={handleResendOtp} disabled={resendCooldown > 0}>
              <Text
                style={[
                  styles.resendLink,
                  { color: resendCooldown > 0 ? theme.textMuted : theme.brandAccent },
                ]}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Change Email Trigger */}
          <TouchableOpacity
            onPress={() => setShowChangeEmail((prev) => !prev)}
            style={styles.changeEmailTrigger}>
            <Ionicons name="create-outline" size={16} color={theme.brandAccent} style={{ marginRight: 4 }} />
            <Text style={[styles.changeEmailText, { color: theme.brandAccent }]}>
              {showChangeEmail ? 'Cancel Email Edit' : 'Entered wrong email? Change it'}
            </Text>
          </TouchableOpacity>

          {showChangeEmail && (
            <View style={[styles.changeEmailBox, { borderColor: theme.borderColor }]}>
              <Input
                label="Correct Email Address"
                value={newEmail}
                onChangeText={setNewEmail}
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

          {/* Logout / Exit Option */}
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={16} color={theme.danger} style={{ marginRight: 4 }} />
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
  title: { fontSize: Typography.sizes.xl, fontWeight: '800', textTransform: 'uppercase' },
  subtitle: { fontSize: Typography.sizes.xs, marginTop: 4, marginBottom: Spacing.lg, lineHeight: 18 },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  statusText: { fontSize: Typography.sizes.xs, fontWeight: '700', flex: 1 },
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
  },
  resendText: { fontSize: Typography.sizes.xs },
  resendLink: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
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
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  logoutText: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
});