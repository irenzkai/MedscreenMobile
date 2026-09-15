import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { AppointmentStatus } from '../../types';
import { getStatusTheme } from '../../utils/formatters';
import { BorderRadius, Spacing, Typography } from '../../constants/theme';

export interface BadgeProps {
  label?: string;
  status?: AppointmentStatus;
  isExpired?: boolean;
  bg?: string;
  color?: string;
  borderColor?: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  status,
  isExpired = false,
  bg,
  color,
  borderColor,
  size = 'md',
  style,
  textStyle,
  icon,
}) => {
  // If status is provided, derive clinical palette from theme tokens
  const themeProps = status ? getStatusTheme(status, isExpired) : null;

  const resolvedBg = bg || themeProps?.bg || 'rgba(108, 117, 125, 0.12)';
  const resolvedColor = color || themeProps?.text || '#6C757D';
  const resolvedBorder = borderColor || themeProps?.border || 'transparent';
  const resolvedLabel = label || themeProps?.label || 'STATUS';

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badgeContainer,
        {
          backgroundColor: resolvedBg,
          borderColor: resolvedBorder,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? 6 : 10,
        },
        style,
      ]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.badgeText,
          {
            color: resolvedColor,
            fontSize: isSmall ? Typography.sizes.xs - 2 : Typography.sizes.xs,
          },
          textStyle,
        ]}>
        {resolvedLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconContainer: {
    marginRight: 4,
  },
});