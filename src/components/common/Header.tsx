import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { Spacing } from '../../constants/theme';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingTop: Math.max(insets.top, 16),
          backgroundColor: theme.brandDark,
          borderBottomColor: theme.borderSecondary,
        },
      ]}>
      <View style={styles.contentRow}>
        {/* Left Side: Back Arrow or Brand Logo */}
        {showBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={theme.brandAccent} />
          </TouchableOpacity>
        ) : (
          <View style={styles.brandingRow}>
            {/* Circular Clipped Logo Image */}
            <View style={[styles.logoCircle, { borderColor: theme.brandAccent }]}>
              <Image
                source={require('../../../assets/images/logo.jpg')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.brandTitle}>
              MED<Text style={{ color: theme.brandAccent }}>SCREEN</Text>
            </Text>
          </View>
        )}

        {/* Center Title (Only displayed on sub-screens when showBack is true) */}
        {showBack && title ? (
          <View style={styles.titleWrapper}>
            <Text style={[styles.screenTitle, { color: '#FFFFFF' }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.screenSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {/* Right Action */}
        <View style={styles.rightActionWrapper}>
          {rightAction ? rightAction : <View style={{ width: 36 }} />}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    zIndex: 100,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  titleWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  screenTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  screenSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  rightActionWrapper: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 36,
  },
});