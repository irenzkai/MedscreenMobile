import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Service } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency, formatDuration } from '../../utils/formatters';
import { BorderRadius, Spacing, Typography } from '../../constants/theme';

export interface ServiceItemProps {
  service: Service;
  selected?: boolean;
  onToggle?: (service: Service) => void;
  selectable?: boolean;
  disabled?: boolean;
}

export const ServiceItem: React.FC<ServiceItemProps> = ({
  service,
  selected = false,
  onToggle,
  selectable = true,
  disabled = false,
}) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePress = () => {
    if (selectable && onToggle && !disabled) {
      onToggle(service);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.bgCard,
          borderColor: selected ? theme.brandAccent : theme.borderColor,
          borderLeftColor: selected ? theme.brandAccent : theme.borderColor,
          borderLeftWidth: selected ? 4 : 1,
        },
      ]}>
      {/* Top Clickable Bar */}
      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.75}
        onPress={handlePress}
        disabled={disabled}
        style={styles.mainRow}>
        {/* Checkbox Icon */}
        {selectable && (
          <View
            style={[
              styles.checkbox,
              {
                borderColor: selected ? theme.brandAccent : theme.borderColor,
                backgroundColor: selected ? theme.brandAccent : 'transparent',
              },
            ]}>
            {selected && <Ionicons name="checkmark" size={16} color="#1C232D" />}
          </View>
        )}

        {/* Title, Badges, & Price */}
        <View style={styles.titleArea}>
          <Text style={[styles.serviceName, { color: theme.textMain }]} numberOfLines={2}>
            {service.name.toUpperCase()}
          </Text>

          <View style={styles.badgeRow}>
            {service.sample_required && service.sample_required !== 'N/A' && (
              <View style={[styles.badge, { backgroundColor: theme.surfaceSubtle }]}>
                <Ionicons name="water-outline" size={10} color={theme.danger} />
                <Text style={[styles.badgeText, { color: theme.textMuted }]}>
                  {service.sample_required}
                </Text>
              </View>
            )}

            <View style={[styles.badge, { backgroundColor: theme.surfaceSubtle }]}>
              <Ionicons name="time-outline" size={10} color={theme.brandAccent} />
              <Text style={[styles.badgeText, { color: theme.textMuted }]}>
                {formatDuration(service.estimated_time)}
              </Text>
            </View>

            {service.gender_restriction !== 'both' && (
              <View style={[styles.badge, { backgroundColor: 'rgba(255, 193, 7, 0.1)' }]}>
                <Text style={[styles.badgeText, { color: theme.warning }]}>
                  {service.gender_restriction === 'male' ? 'Male Only' : 'Female Only'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Price & Expand Drawer Trigger */}
        <View style={styles.rightArea}>
          <Text style={[styles.priceText, { color: theme.brandAccent }]}>
            {formatCurrency(service.price)}
          </Text>
          <TouchableOpacity
            hitSlop={8}
            onPress={() => setIsExpanded((prev) => !prev)}
            style={styles.expandTrigger}>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.textMuted}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Expandable Preparation & Description Drawer */}
      {isExpanded && (
        <View style={[styles.drawer, { borderTopColor: theme.borderColor }]}>
          {service.description ? (
            <Text style={[styles.descriptionText, { color: theme.textMuted }]}>
              {service.description}
            </Text>
          ) : null}

          {service.preparation ? (
            <View style={[styles.prepBox, { backgroundColor: theme.surfaceSubtle }]}>
              <Ionicons name="information-circle-outline" size={14} color={theme.brandAccent} />
              <Text style={[styles.prepText, { color: theme.textMain }]}>
                Prep: {service.preparation}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  titleArea: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  serviceName: {
    fontSize: Typography.sizes.sm,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 3,
  },
  badgeText: {
    fontSize: Typography.sizes.xs - 2,
    fontWeight: '700',
  },
  rightArea: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  priceText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '900',
  },
  expandTrigger: {
    marginTop: 4,
    padding: 2,
  },
  drawer: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  descriptionText: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
  },
  prepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  prepText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    flex: 1,
  },
});