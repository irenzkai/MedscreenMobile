import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '../../constants/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helperText?: string;
  prefixText?: string;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  isRequired?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  prefixText,
  isPassword = false,
  containerStyle,
  isRequired = false,
  style,
  ...rest
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasError = !!error;

  const getBorderColor = (): string => {
    if (hasError) return theme.danger;
    if (isFocused) return theme.brandAccent;
    return theme.borderColor;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            {label} {isRequired && <Text style={{ color: theme.danger }}>*</Text>}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.bgCard,
            borderColor: getBorderColor(),
            borderWidth: isFocused || hasError ? 1.5 : 1,
          },
        ]}>
        {prefixText && (
          <View style={[styles.prefixBox, { backgroundColor: theme.surfaceSubtle }]}>
            <Text style={[styles.prefixText, { color: theme.textMain }]}>{prefixText}</Text>
          </View>
        )}

        <TextInput
          placeholderTextColor={theme.textMuted}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.textInput,
            {
              color: theme.textMain,
              paddingLeft: prefixText ? Spacing.sm : Spacing.md,
            },
            style,
          ]}
          {...rest}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword((prev) => !prev)}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.brandAccent}
            />
          </TouchableOpacity>
        )}
      </View>

      {hasError ? (
        <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.helperText, { color: theme.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    height: 48,
  },
  prefixBox: {
    paddingHorizontal: Spacing.md,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.05)',
  },
  prefixText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: Typography.sizes.sm,
    paddingRight: Spacing.md,
  },
  eyeIcon: {
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
    fontWeight: '600',
  },
  helperText: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
});