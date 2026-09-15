import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { validateEmail, validateRequired } from '../../utils/validators';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleLogin = async () => {
    setErrorMessage(null);
    const emailErr = validateEmail(email);
    const passErr = validateRequired(password, 'Password');

    if (emailErr || passErr) {
      setErrors({
        email: emailErr || undefined,
        password: passErr || undefined,
      });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        if (res.deactivated) {
          Alert.alert(
            'Account Deactivated',
            res.message || 'Your account is deactivated. Would you like to reactivate it now?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reactivate',
                onPress: () => navigation.navigate('ReactivateAccount'),
              },
            ]
          );
        } else {
          setErrorMessage(res.message || 'Invalid email or password.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login failed. Please try again.');
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
        {/* Top Brand Logo Banner */}
        <View style={styles.brandHeader}>
          <View style={[styles.logoCircle, { borderColor: theme.brandAccent }]}>
            <Ionicons name="fitness" size={32} color={theme.brandAccent} />
          </View>
          <Text style={[styles.brandTitle, { color: theme.textMain }]}>
            MED<Text style={{ color: theme.brandAccent }}>SCREEN</Text>
          </Text>
          <Text style={[styles.brandTagline, { color: theme.textMuted }]}>
            Diagnostic Laboratory & Clinic Portal
          </Text>
        </View>

        {/* Login Form Card */}
        <Card style={styles.formCard}>
          <Text style={[styles.formTitle, { color: theme.textMain }]}>Welcome Back</Text>
          <Text style={[styles.formSub, { color: theme.textMuted }]}>
            Sign in with your registered patient account credentials.
          </Text>

          {/* Error Banner */}
          {errorMessage && (
            <View style={[styles.errorBanner, { backgroundColor: 'rgba(220, 53, 69, 0.08)', borderColor: theme.danger }]}>
              <Ionicons name="alert-circle" size={18} color={theme.danger} />
              <Text style={[styles.errorBannerText, { color: theme.danger }]}>{errorMessage}</Text>
            </View>
          )}

          <Input
            label="Email Address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="name@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            error={errors.email}
            isRequired
          />

          <Input
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="Enter your password"
            isPassword
            error={errors.password}
            isRequired
          />

          {/* Forgot Password Link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotBtn}
            hitSlop={8}>
            <Text style={[styles.forgotText, { color: theme.brandAccent }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <Button
            title="Log In"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={{ marginTop: Spacing.sm }}
          />

          {/* Registration Redirection Footer */}
          <View style={styles.registerFooter}>
            <Text style={[styles.registerPrompt, { color: theme.textMuted }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.registerLink, { color: theme.brandAccent }]}>
                Register Here
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, justifyContent: 'center' },
  brandHeader: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandTagline: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
  formCard: {
    padding: Spacing.xl,
  },
  formTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formSub: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorBannerText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    flex: 1,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
  },
  forgotText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
  },
  registerFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  registerPrompt: {
    fontSize: Typography.sizes.xs,
  },
  registerLink: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});