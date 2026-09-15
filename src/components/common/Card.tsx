import React from 'react';
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { BorderRadius, Spacing } from '../../constants/theme';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'accent' | 'danger' | 'warning' | 'dashed';
  onPress?: () => void;
  activeOpacity?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  onPress,
  activeOpacity = 0.85,
}) => {
  const theme = useTheme();

  const getBorderColor = (): string => {
    switch (variant) {
      case 'accent':
        return theme.brandAccent;
      case 'danger':
        return theme.danger;
      case 'warning':
        return theme.warning;
      case 'dashed':
      case 'default':
      default:
        return theme.borderColor;
    }
  };

  const getBorderStyle = (): ViewStyle => {
    if (variant === 'dashed') {
      return {
        borderStyle: 'dashed',
        borderWidth: 1.5,
      };
    }
    if (variant === 'accent') {
      return {
        borderWidth: 1.5,
      };
    }
    return {
      borderWidth: 1,
    };
  };

  const cardStyle: ViewStyle = {
    backgroundColor: theme.bgCard,
    borderColor: getBorderColor(),
    ...getBorderStyle(),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        style={[styles.card, cardStyle, style]}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, cardStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
});