import React, { useState, useEffect } from 'react';
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
import { validateEmail } from '../../utils/validators';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';
import { extractErrorMessage } from '../../services/api/client';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
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

    const emailErr = validateEmail(email);
    if (emailErr) {
      setErrorMsg(emailErr);
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: email.trim() });
      setSuccessStatus(res.status || 'We have emailed your password reset link!');
      setCooldown(60); // 60s cooldown like web portal
    } catch (err) {
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setLoading(false);
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
            <Ionicons name="key-outline" size={32} color={theme.brandAccent} />
          </View>

          <Text style={[styles.title, { color: theme.textMain }]}>Forgot Password</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Provide your registered email address below, and we will send a secure password reset link to your inbox.
          </Text>

          {successStatus && (
            <View style={[styles.statusBox, { backgroundColor: 'rgba(25, 211, 140, 0.08)', borderColor: theme.success }]}>
              <Ionicons name="checkmark-circle" size={18} color={theme.success} />
              <Text style={[styles.statusText, { color: theme.success }]}>{successStatus}</Text>
            </View>
          )}

          {errorMsg && (
            <View style={[styles.statusBox, { backgroundColor: 'rgba(220, 53, 69, 0.08)', borderColor: theme.danger }]}>
              <Ionicons name="alert-circle" size={18} color={theme.danger} />
              <Text style={[styles.statusText, { color: theme.danger }]}>{errorMsg}</Text>
            </View>
          )}

          <Input
            label="Registered Email"
            value={email}
            onChangeText={setEmail}
            placeholder="example@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
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
            <Ionicons name="arrow-back" size={16} color={theme.brandAccent} style={{ marginRight: 4 }} />
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  backBtnText: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
});