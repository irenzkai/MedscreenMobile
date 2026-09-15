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
  disabledReason?: string;
}

/**
 * Returns required biological specimen, resolving missing API fields via clinical catalog defaults.
 */
function resolveSpecimenSample(service: Service): string {
  if (service.sample_required && service.sample_required !== 'N/A') {
    return service.sample_required;
  }
  const name = service.name.toUpperCase();
  if (name.includes('URINE') || name.includes('URINALYSIS') || name.includes('DRUG TEST')) {
    return 'Urine';
  }
  if (name.includes('STOOL') || name.includes('FECALYSIS')) {
    return 'Stool';
  }
  if (name.includes('PREGNANCY TEST')) {
    return 'Urine';
  }
  if (name.includes('PEDIA') || name.includes('PREGNANCY PACKAGE')) {
    return 'Blood, Urine';
  }
  if (name.includes('X-RAY') || name.includes('XRAY') || name.includes('ECG') || name.includes('MEDICAL CERTIFICATE')) {
    return 'N/A';
  }
  // Standard laboratory test default is blood sample
  return 'Blood';
}

export const ServiceItem: React.FC<ServiceItemProps> = ({
  service,
  selected = false,
  onToggle,
  selectable = true,
  disabled = false,
  disabledReason,
}) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePress = () => {
    if (selectable && onToggle && !disabled) {
      onToggle(service);
    }
  };

  const isFemaleOnly = service.gender_restriction === 'female';
  const isMaleOnly = service.gender_restriction === 'male';
  const specimenName = resolveSpecimenSample(service);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.bgCard,
          borderColor: disabled
            ? theme.borderColor
            : selected
            ? theme.brandAccent
            : theme.borderColor,
          borderLeftColor: disabled
            ? theme.borderColor
            : selected
            ? theme.brandAccent
            : theme.borderColor,
          borderLeftWidth: selected ? 4 : 1,
          opacity: disabled ? 0.6 : 1,
        },
      ]}>
      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.75}
        onPress={handlePress}
        disabled={disabled}
        style={styles.mainRow}>
        {selectable && (
          <View
            style={[
              styles.checkbox,
              {
                borderColor: disabled
                  ? theme.borderColor
                  : selected
                  ? theme.brandAccent
                  : theme.borderColor,
                backgroundColor: disabled
                  ? theme.surfaceSubtle
                  : selected
                  ? theme.brandAccent
                  : 'transparent',
              },
            ]}>
            {disabled ? (
              <Ionicons name="lock-closed" size={12} color={theme.textMuted} />
            ) : selected ? (
              <Ionicons name="checkmark" size={16} color="#1C232D" />
            ) : null}
          </View>
        )}

        <View style={styles.titleCol}>
          <Text
            style={[
              styles.serviceName,
              { color: disabled ? theme.textMuted : theme.textMain },
            ]}>
            {service.name.toUpperCase()}
          </Text>

          <View style={styles.badgesRow}>
            {/* Gender Badge */}
            {isFemaleOnly ? (
              <View
                style={[
                  styles.genderBadge,
                  { backgroundColor: 'rgba(233, 30, 99, 0.1)', borderColor: '#E91E63' },
                ]}>
                <Ionicons name="female" size={11} color="#E91E63" />
                <Text style={[styles.genderText, { color: '#E91E63' }]}>FEMALE ONLY</Text>
              </View>
            ) : isMaleOnly ? (
              <View
                style={[
                  styles.genderBadge,
                  { backgroundColor: 'rgba(33, 150, 243, 0.1)', borderColor: '#2196F3' },
                ]}>
                <Ionicons name="male" size={11} color="#2196F3" />
                <Text style={[styles.genderText, { color: '#2196F3' }]}>MALE ONLY</Text>
              </View>
            ) : (
              <View
                style={[
                  styles.genderBadge,
                  { backgroundColor: theme.surfaceSubtle, borderColor: theme.brandAccent },
                ]}>
                <Ionicons name="people" size={11} color={theme.brandAccent} />
                <Text style={[styles.genderText, { color: theme.brandAccent }]}>
                  ALL GENDERS
                </Text>
              </View>
            )}

            {/* Specimen Required Badge */}
            {specimenName !== 'N/A' && (
              <View style={[styles.specimenBadge, { backgroundColor: theme.surfaceSubtle }]}>
                <Ionicons name="water" size={11} color={theme.danger} />
                <Text style={[styles.specimenText, { color: theme.textMain }]}>
                  {specimenName}
                </Text>
              </View>
            )}

            {/* Duration Badge */}
            <View style={[styles.timeBadge, { backgroundColor: theme.surfaceSubtle }]}>
              <Ionicons name="time-outline" size={11} color={theme.brandAccent} />
              <Text style={[styles.timeText, { color: theme.textMuted }]}>
                {formatDuration(service.estimated_time)}
              </Text>
            </View>
          </View>

          {disabled && disabledReason && (
            <View style={styles.restrictionNotice}>
              <Ionicons name="alert-circle" size={12} color={theme.warning} />
              <Text style={[styles.restrictionText, { color: theme.warning }]}>
                {disabledReason}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.priceCol}>
          <Text
            style={[
              styles.priceText,
              { color: disabled ? theme.textMuted : theme.brandAccent },
            ]}>
            {formatCurrency(service.price)}
          </Text>
          <TouchableOpacity
            hitSlop={10}
            onPress={() => setIsExpanded((prev) => !prev)}
            style={styles.expandChevron}>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.textMuted}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View
          style={[
            styles.drawer,
            { borderTopColor: theme.borderColor, backgroundColor: theme.surfaceSubtle },
          ]}>
          {service.description ? (
            <Text style={[styles.descText, { color: theme.textMuted }]}>
              {service.description}
            </Text>
          ) : null}

          {service.preparation ? (
            <View style={styles.prepRow}>
              <Ionicons name="information-circle" size={15} color={theme.brandAccent} />
              <Text style={[styles.prepText, { color: theme.textMain }]}>
                <Text style={{ fontWeight: '800' }}>Preparation: </Text>
                {service.preparation}
              </Text>
            </View>
          ) : (
            <Text style={[styles.prepNone, { color: theme.textMuted }]}>
              No special fasting or prior clinical preparation required.
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
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
  titleCol: {
    flex: 1,
    paddingRight: Spacing.xs,
  },
  serviceName: {
    fontSize: Typography.sizes.sm,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  genderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  genderText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  specimenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  specimenText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  restrictionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  restrictionText: {
    fontSize: 10,
    fontWeight: '700',
  },
  priceCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: Spacing.xs,
  },
  priceText: {
    fontSize: Typography.sizes.md,
    fontWeight: '900',
  },
  expandChevron: {
    marginTop: 4,
    padding: 2,
  },
  drawer: {
    borderTopWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  descText: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
  },
  prepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  prepText: {
    fontSize: Typography.sizes.xs,
    flex: 1,
    lineHeight: 16,
  },
  prepNone: {
    fontSize: Typography.sizes.xs - 2,
    fontStyle: 'italic',
  },
});