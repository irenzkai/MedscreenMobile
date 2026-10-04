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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { NoticeBox } from '../../components/common/NoticeBox';
import { ActionModal } from '../../components/common/ActionModal';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';
import { User } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ReactivateAccount'>;

export const ReactivateAccountScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { verifyReactivationOtp, sendReactivationOtp, completeReactivation } = useAuth();
  const scrollViewRef = useRef<ScrollView | null>(null);

  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Success Modal & Session State
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [pendingSession, setPendingSession] = useState<{ token: string; user: User } | null>(null);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  /**
   * Helper: Sets error message and immediately teleports / scrolls
   * the screen back to the very top so the NoticeBox is in direct view.
   */
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

  const handleReactivate = async () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      showError('Please enter the complete 6-digit reactivation code.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    const res = await verifyReactivationOtp(fullOtp);
    setLoading(false);

    if (res.success) {
      if (res.token && res.user) {
        setPendingSession({ token: res.token, user: res.user });
      }
      setSuccessModalVisible(true);
    } else {
      showError(res.message || 'Incorrect or expired reactivation code.');
    }
  };

  const handleSuccessDismiss = async () => {
    setSuccessModalVisible(false);
    if (pendingSession && completeReactivation) {
      await completeReactivation(pendingSession.token, pendingSession.user);
    }
  };

  const handleResend = async () => {
    setErrorMsg(null);
    setResending(true);
    const res = await sendReactivationOtp();
    setResending(false);

    if (res.success) {
      showSuccess('A fresh reactivation OTP was sent to your email.');
    } else {
      showError(res.message || 'Failed to dispatch reactivation code.');
    }
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
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 193, 7, 0.1)' }]}>
            <Ionicons name="shield-half-outline" size={32} color={theme.warning} />
          </View>

          <Text style={[styles.title, { color: theme.textMain }]}>Account Reactivation</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Your profile is currently deactivated. Enter the 6-digit authorization OTP sent to
            your registered email to restore access.
          </Text>

          {/* Dynamic Success Notice */}
          {successMsg ? (
            <NoticeBox
              type="success"
              title="Code Dispatched"
              message={successMsg}
              onClose={() => setSuccessMsg(null)}
              style={{ marginBottom: Spacing.md }}
            />
          ) : null}

          {/* Dynamic In-Page Error Notice */}
          {errorMsg ? (
            <NoticeBox
              type="danger"
              message={errorMsg}
              onClose={() => setErrorMsg(null)}
              style={{ marginBottom: Spacing.md }}
            />
          ) : null}

          {/* 6-Digit OTP */}
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
            title="Reactivate Account"
            onPress={handleReactivate}
            loading={loading}
            size="lg"
            style={{ marginTop: Spacing.md }}
          />

          <Button
            title="Resend Reactivation Code"
            variant="outline"
            onPress={handleResend}
            loading={resending}
            size="sm"
            style={{ marginTop: Spacing.sm }}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.backBtn}
            hitSlop={8}>
            <Ionicons
              name="arrow-back"
              size={16}
              color={theme.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.backBtnText, { color: theme.textMuted }]}>
              Back to Login
            </Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* UNIFIED MODAL: Account Reactivated Success Prompt */}
      <ActionModal
        visible={successModalVisible}
        type="success"
        icon="checkmark-circle-outline"
        title="Account Reactivated"
        confirmText="Enter Portal"
        isSingleAction={true}
        confirmVariant="primary"
        onClose={handleSuccessDismiss}
        onConfirm={handleSuccessDismiss}
        message={
          <View style={styles.successModalContent}>
            <Text style={[styles.successModalPrompt, { color: theme.textMain }]}>
              Welcome back! Your clinical history and portal access have been fully restored.
            </Text>
          </View>
        }
      />
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  backBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  // Success Modal Styles
  successModalContent: {
    width: '100%',
    marginTop: Spacing.xs,
  },
  successModalPrompt: {
    fontSize: Typography.sizes.xs + 1,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  successAlertBox: {
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginTop: 4,
  },
  successAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  successAlertBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  successAlertBody: {
    fontSize: Typography.sizes.xs - 1,
    lineHeight: 16,
  },
});