import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { authApi } from '../../services/api/auth';
import { useTheme } from '../../hooks/useTheme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { NoticeBox } from '../../components/common/NoticeBox';
import { validateEmail } from '../../utils/validators';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';
import { extractErrorMessage } from '../../services/api/client';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView | null>(null);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  /**
   * Helper: Sets error message and immediately teleports / scrolls
   * the screen back to the very top so the NoticeBox is in direct view.
   */
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessStatus(null);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  const showSuccess = (msg: string) => {
    setSuccessStatus(msg);
    setErrorMsg(null);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async () => {
    setErrorMsg(null);
    setSuccessStatus(null);
    setEmailError(null);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setEmailError(emailErr);
      showError(emailErr);
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: email.trim() });
      showSuccess(res.status || 'We have emailed your password reset link!');
      setCooldown(60); // 60s cooldown like web portal
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setLoading(false);
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
          <View style={[styles.iconCircle, { backgroundColor: theme.surfaceSubtle }]}>
            <Ionicons name="key-outline" size={32} color={theme.brandAccent} />
          </View>
          <Text style={[styles.title, { color: theme.textMain }]}>Forgot Password</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Provide your registered email address below, and we will send a secure password
            reset link to your inbox.
          </Text>

          {/* Dynamic Success Notice */}
          {successStatus ? (
            <NoticeBox
              type="success"
              title="Reset Link Dispatched"
              message={successStatus}
              onClose={() => setSuccessStatus(null)}
              style={{ marginBottom: Spacing.md }}
            />
          ) : null}

          {/* Dynamic In-Page Error Notice (Teleport Target at Top) */}
          {errorMsg ? (
            <NoticeBox
              type="danger"
              message={errorMsg}
              onClose={() => setErrorMsg(null)}
              style={{ marginBottom: Spacing.md }}
            />
          ) : null}

          <Input
            label="Registered Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (emailError) setEmailError(null);
            }}
            placeholder="example@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
            isRequired
          />

          <Button
            title={cooldown > 0 ? `Resend in ${cooldown}s` : 'Send Reset Link'}
            onPress={handleSubmit}
            loading={loading}
            disabled={cooldown > 0}
            size="lg"
            style={{ marginTop: Spacing.sm }}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.backBtn}
            hitSlop={8}>
            <Ionicons
              name="arrow-back"
              size={16}
              color={theme.brandAccent}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.backBtnText, { color: theme.brandAccent }]}>
              Back to Login
            </Text>
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
});