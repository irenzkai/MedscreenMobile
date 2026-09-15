import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '../../constants/theme';

export interface WizardProgressBarProps {
  currentStep: number;
  totalSteps?: number;
  stepLabels?: string[];
}

const DEFAULT_LABELS = [
  'Patient',
  'Details',
  'Services',
  'Schedule',
  'Payment',
];

export const WizardProgressBar: React.FC<WizardProgressBarProps> = ({
  currentStep,
  totalSteps = 5,
  stepLabels = DEFAULT_LABELS,
}) => {
  const theme = useTheme();
  const activeLabel = stepLabels[currentStep - 1] || `Step ${currentStep}`;
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.infoRow}>
        <Text style={[styles.stepLabel, { color: theme.brandAccent }]}>
          Step {currentStep}: {activeLabel}
        </Text>
        <Text style={[styles.percentLabel, { color: theme.textMuted }]}>{percentage}%</Text>
      </View>

      {/* Continuous Progress Bar */}
      <View style={[styles.barTrack, { backgroundColor: theme.borderColor }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${percentage}%`,
              backgroundColor: theme.brandAccent,
            },
          ]}
        />
      </View>

      {/* Stepper Dots Indicator */}
      <View style={styles.dotsRow}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <View key={stepNumber} style={styles.dotItem}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isCompleted
                      ? theme.brandAccent
                      : isCurrent
                      ? theme.bgCard
                      : theme.borderColor,
                    borderColor: isCurrent ? theme.brandAccent : 'transparent',
                    borderWidth: isCurrent ? 2 : 0,
                  },
                ]}>
                {isCompleted ? (
                  <Ionicons name="checkmark" size={10} color="#1C232D" />
                ) : (
                  <Text
                    style={[
                      styles.dotNumber,
                      { color: isCurrent ? theme.brandAccent : theme.textMuted },
                    ]}>
                    {stepNumber}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepText,
                  {
                    color: isCurrent ? theme.brandAccent : theme.textMuted,
                    fontWeight: isCurrent ? '800' : '600',
                  },
                ]}
                numberOfLines={1}>
                {stepLabels[index]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  stepLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  percentLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
  },
  barTrack: {
    height: 4,
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  dotItem: {
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dotNumber: {
    fontSize: 9,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 9,
    textTransform: 'uppercase',
  },
});