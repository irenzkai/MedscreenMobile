import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';
import { BorderRadius, Spacing, Typography } from '../../constants/theme';

export interface ActionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  message: string | React.ReactNode;
  type?: 'danger' | 'warning' | 'info' | 'success';
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'outline-secondary';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  isSingleAction?: boolean; // True for success/info acknowledgement modals with 1 button
}

export const ActionModal: React.FC<ActionModalProps> = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  type = 'danger',
  confirmText,
  cancelText = 'Cancel',
  confirmVariant,
  icon,
  loading = false,
  isSingleAction = false,
}) => {
  const theme = useTheme();

  const getThemeConfig = () => {
    switch (type) {
      case 'warning':
        return {
          badgeBg: 'rgba(255, 193, 7, 0.12)',
          badgeBorder: theme.warning,
          badgeColor: theme.warning,
          defaultIcon: 'alert-circle-outline' as keyof typeof Ionicons.glyphMap,
          defaultConfirmVariant: 'primary' as const,
          defaultConfirmText: 'Proceed',
        };
      case 'info':
        return {
          badgeBg: 'rgba(13, 202, 240, 0.12)',
          badgeBorder: theme.info,
          badgeColor: theme.info,
          defaultIcon: 'information-circle-outline' as keyof typeof Ionicons.glyphMap,
          defaultConfirmVariant: 'primary' as const,
          defaultConfirmText: 'OK',
        };
      case 'success':
        return {
          badgeBg: 'rgba(25, 211, 140, 0.12)',
          badgeBorder: theme.brandAccent,
          badgeColor: theme.brandAccent,
          defaultIcon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap,
          defaultConfirmVariant: 'primary' as const,
          defaultConfirmText: 'Continue',
        };
      case 'danger':
      default:
        return {
          badgeBg: 'rgba(220, 53, 69, 0.12)',
          badgeBorder: theme.danger,
          badgeColor: theme.danger,
          defaultIcon: 'trash-outline' as keyof typeof Ionicons.glyphMap,
          defaultConfirmVariant: 'danger' as const,
          defaultConfirmText: 'Confirm',
        };
    }
  };

  const config = getThemeConfig();
  const activeIcon = icon || config.defaultIcon;
  const activeConfirmText = confirmText || config.defaultConfirmText;
  const activeConfirmVariant = confirmVariant || config.defaultConfirmVariant;

  const handleConfirmPress = async () => {
    if (onConfirm) {
      await onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.bgCard,
              borderColor: type === 'danger' ? 'rgba(220, 53, 69, 0.3)' : theme.borderColor,
            },
          ]}>
          {/* Circular Themed Icon Header Badge */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: config.badgeBg,
                borderColor: config.badgeBorder,
              },
            ]}>
            <Ionicons name={activeIcon} size={32} color={config.badgeColor} />
          </View>

          {/* Modal Header & Text Content */}
          <Text style={[styles.modalTitle, { color: theme.textMain }]}>{title}</Text>
          {typeof message === 'string' ? (
            <Text style={[styles.modalMessage, { color: theme.textMuted }]}>{message}</Text>
          ) : (
            message
          )}

          {/* Action Buttons Row */}
          <View style={styles.actionsRow}>
            {isSingleAction ? (
              <Button
                title={activeConfirmText}
                variant={activeConfirmVariant}
                size="md"
                onPress={handleConfirmPress}
                loading={loading}
                style={{ width: '100%' }}
              />
            ) : (
              <>
                <Button
                  title={cancelText}
                  variant="outline-secondary"
                  size="md"
                  onPress={onClose}
                  disabled={loading}
                  style={styles.actionBtn}
                />
                <Button
                  title={activeConfirmText}
                  variant={activeConfirmVariant}
                  size="md"
                  onPress={handleConfirmPress}
                  loading={loading}
                  style={styles.actionBtn}
                />
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 19, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.sizes.md + 1,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  modalMessage: {
    fontSize: Typography.sizes.xs + 1,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
  },
});