import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '../../constants/theme';

export interface NoticeBoxProps {
  type?: 'danger' | 'warning' | 'info' | 'success';
  title?: string;
  message: string | React.ReactNode;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const NoticeBox: React.FC<NoticeBoxProps> = ({
  type = 'danger',
  title,
  message,
  onClose,
  style,
  icon,
}) => {
  const theme = useTheme();

  const getThemeConfig = () => {
    switch (type) {
      case 'warning':
        return {
          bg: 'rgba(255, 193, 7, 0.12)',
          border: theme.warning,
          color: theme.warning,
          defaultIcon: 'warning-outline' as keyof typeof Ionicons.glyphMap,
          defaultTitle: 'Notice',
        };
      case 'info':
        return {
          bg: 'rgba(13, 202, 240, 0.12)',
          border: theme.info,
          color: theme.info,
          defaultIcon: 'information-circle-outline' as keyof typeof Ionicons.glyphMap,
          defaultTitle: 'Information',
        };
      case 'success':
        return {
          bg: 'rgba(25, 211, 140, 0.10)',
          border: theme.brandAccent,
          color: theme.brandAccent,
          defaultIcon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap,
          defaultTitle: 'Success',
        };
      case 'danger':
      default:
        return {
          bg: 'rgba(220, 53, 69, 0.09)',
          border: theme.danger,
          color: theme.danger,
          defaultIcon: 'alert-circle-outline' as keyof typeof Ionicons.glyphMap,
          defaultTitle: 'Attention Required',
        };
    }
  };

  const config = getThemeConfig();
  const selectedIcon = icon || config.defaultIcon;
  const headerTitle = title || config.defaultTitle;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
        style,
      ]}>
      <Ionicons name={selectedIcon} size={20} color={config.color} style={styles.icon} />
      <View style={styles.content}>
        {headerTitle ? (
          <Text style={[styles.title, { color: config.color }]}>{headerTitle}</Text>
        ) : null}
        {typeof message === 'string' ? (
          <Text style={[styles.message, { color: theme.textMain }]}>{message}</Text>
        ) : (
          message
        )}
      </View>
      {onClose && (
        <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={config.color} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    marginVertical: Spacing.xs,
  },
  icon: {
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  message: {
    fontSize: Typography.sizes.xs,
    lineHeight: 17,
  },
  closeBtn: {
    marginLeft: Spacing.xs,
    padding: 2,
  },
});