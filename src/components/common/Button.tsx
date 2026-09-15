import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { BorderRadius, Spacing } from '../../constants/theme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'outline-secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  uppercase?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  uppercase = true,
}) => {
  const theme = useTheme();

  // Determine button container styles based on variant
  const getContainerVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.brandAccent,
          borderColor: theme.brandAccent,
          borderWidth: 1.5,
        };
      case 'secondary':
        return {
          backgroundColor: theme.bgCard,
          borderColor: theme.borderColor,
          borderWidth: 1.5,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: theme.brandAccent,
          borderWidth: 1.5,
        };
      case 'outline-secondary':
        return {
          backgroundColor: 'transparent',
          borderColor: theme.borderColor,
          borderWidth: 1.5,
        };
      case 'danger':
        return {
          backgroundColor: theme.danger,
          borderColor: theme.danger,
          borderWidth: 1.5,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: theme.brandAccent,
          borderColor: theme.brandAccent,
          borderWidth: 1.5,
        };
    }
  };

  // Determine text color based on variant
  const getTextVariantStyle = (): TextStyle => {
    switch (variant) {
      case 'primary':
        return { color: '#1C232D', fontWeight: '800' };
      case 'secondary':
        return { color: theme.textMain, fontWeight: '700' };
      case 'outline':
        return { color: theme.brandAccent, fontWeight: '700' };
      case 'outline-secondary':
        return { color: theme.textMuted, fontWeight: '700' };
      case 'danger':
        return { color: '#FFFFFF', fontWeight: '800' };
      case 'ghost':
        return { color: theme.brandAccent, fontWeight: '700' };
      default:
        return { color: '#1C232D', fontWeight: '800' };
    }
  };

  // Determine sizing
  const getSizeStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          container: { paddingVertical: 8, paddingHorizontal: 16 },
          text: { fontSize: 12 },
        };
      case 'lg':
        return {
          container: { paddingVertical: 16, paddingHorizontal: 28 },
          text: { fontSize: 15 },
        };
      case 'md':
      default:
        return {
          container: { paddingVertical: 12, paddingHorizontal: 20 },
          text: { fontSize: 13 },
        };
    }
  };

  const sizeStyle = getSizeStyle();
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.baseButton,
        getContainerVariantStyle(),
        sizeStyle.container,
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#1C232D' : theme.brandAccent}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text
            style={[
              styles.baseText,
              getTextVariantStyle(),
              sizeStyle.text,
              uppercase && styles.uppercaseText,
              textStyle,
            ]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    letterSpacing: 0.5,
  },
  uppercaseText: {
    textTransform: 'uppercase',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  disabled: {
    opacity: 0.45,
  },
});