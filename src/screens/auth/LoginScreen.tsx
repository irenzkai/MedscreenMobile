import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
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
import { NoticeBox } from '../../components/common/NoticeBox';
import { ActionModal } from '../../components/common/ActionModal';
import { validateLoginIdentifier, validateRequired } from '../../utils/validators';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const scrollViewRef = useRef<ScrollView | null>(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  // Deactivated Account Modal States
  const [deactivatedModalVisible, setDeactivatedModalVisible] = useState(false);
  const [deactivatedMessage, setDeactivatedMessage] = useState<string>('');

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  const handleLogin = async () => {
    setErrorMessage(null);
    const idErr = validateLoginIdentifier(identifier);
    const passErr = validateRequired(password, 'Password');

    if (idErr || passErr) {
      setErrors({
        identifier: idErr || undefined,
        password: passErr || undefined,
      });
      showError('Please check the highlighted credentials below.');
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = await login(identifier, password);
      if (!res.success) {
        if (res.deactivated) {
          setDeactivatedMessage(
            res.message ||
              'Your account is currently deactivated. A verification code has been dispatched to your email.'
          );
          setDeactivatedModalVisible(true);
        } else {
          showError(res.message || 'Invalid email/phone or password.');
        }
      } else if (res.unverified) {
        // Direct unverified user to account verification with their email if available
        navigation.navigate('VerifyAccount', {
          email: identifier.includes('@') ? identifier.trim() : res.user?.email || undefined,
        });
      }
    } catch (err: any) {
      showError(err?.message || 'Login failed. Please try again.');
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
        {/* Brand Header with Circular Clipped Logo */}
        <View style={styles.brandHeader}>
          <View style={[styles.logoCircle, { borderColor: theme.brandAccent }]}>
            <Image
              source={require('../../../assets/images/logo.jpg')}
              style={styles.logoImage}
              resizeMode="cover"
            />
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
          <Text style={[styles.formTitle, { color: theme.textMain }]}>Login Account</Text>
          <Text style={[styles.formSub, { color: theme.textMuted }]}>
            Sign in with your registered email address or mobile phone number.
          </Text>

          {errorMessage ? (
            <NoticeBox
              type="danger"
              message={errorMessage}
              onClose={() => setErrorMessage(null)}
              style={{ marginBottom: Spacing.md }}
            />
          ) : null}

          <Input
            label="Email or Mobile Phone"
            value={identifier}
            onChangeText={(text) => {
              setIdentifier(text);
              if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: undefined }));
            }}
            placeholder="name@example.com or 09XXXXXXXXX"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            error={errors.identifier}
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

          {/* Registration Footer */}
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

      {/* UNIFIED MODAL: Deactivated Account Prompt */}
      <ActionModal
        visible={deactivatedModalVisible}
        type="warning"
        icon="shield-half-outline"
        title="Account Deactivated"
        confirmText="Reactivate"
        cancelText="Cancel"
        confirmVariant="primary"
        onClose={() => setDeactivatedModalVisible(false)}
        onConfirm={() => {
          setDeactivatedModalVisible(false);
          navigation.navigate('ReactivateAccount');
        }}
        message={
          <View style={styles.deactivatedModalContent}>
            <Text style={[styles.deactivatedPrompt, { color: theme.textMain }]}>
              {deactivatedMessage ||
                'Your account is currently deactivated. Would you like to reactivate it now?'}
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
  brandHeader: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    backgroundColor: '#000',
  },
  logoImage: {
    width: '100%',
    height: '100%',
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
  // Deactivated Modal Styles
  deactivatedModalContent: {
    width: '100%',
    marginTop: Spacing.xs,
  },
  deactivatedPrompt: {
    fontSize: Typography.sizes.xs + 1,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  deactivatedAlertBox: {
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginTop: 4,
  },
  deactivatedAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  deactivatedAlertBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deactivatedAlertBody: {
    fontSize: Typography.sizes.xs - 1,
    lineHeight: 16,
  },
});