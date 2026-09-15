import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SlotOccupancyResponse } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { formatTimeSlot } from '../../utils/formatters';
import { BorderRadius, Spacing, Typography } from '../../constants/theme';

export interface TimeSlotPickerProps {
  date: string; // YYYY-MM-DD
  selectedSlot: string | null;
  onSelectSlot: (slot: string, displayTime: string) => void;
  occupancyData: SlotOccupancyResponse | null;
  loading: boolean;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  date,
  selectedSlot,
  onSelectSlot,
  occupancyData,
  loading,
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.brandAccent} />
        <Text style={[styles.statusText, { color: theme.textMuted }]}>
          Loading clinic schedules...
        </Text>
      </View>
    );
  }

  if (!occupancyData || !date) {
    return (
      <View style={[styles.centerContainer, styles.dashedBox, { borderColor: theme.borderColor }]}>
        <Ionicons name="calendar-outline" size={32} color={theme.textMuted} />
        <Text style={[styles.statusText, { color: theme.textMuted }]}>
          Select an appointment date above to view available time slots.
        </Text>
      </View>
    );
  }

  if (occupancyData.is_closed) {
    return (
      <View style={[styles.centerContainer, styles.dashedBox, { borderColor: theme.danger }]}>
        <Ionicons name="close-circle-outline" size={36} color={theme.danger} />
        <Text style={[styles.statusTitle, { color: theme.danger }]}>Clinic Closed</Text>
        <Text style={[styles.statusText, { color: theme.textMuted }]}>
          The laboratory is closed on this date. Please pick another schedule.
        </Text>
      </View>
    );
  }

  const config = occupancyData.config;
  if (!config) {
    return (
      <View style={[styles.centerContainer, styles.dashedBox, { borderColor: theme.warning }]}>
        <Ionicons name="alert-circle-outline" size={32} color={theme.warning} />
        <Text style={[styles.statusText, { color: theme.textMuted }]}>
          No schedule rules found for this date.
        </Text>
      </View>
    );
  }

  // Generate slots
  const slots: Array<{ timeStr: string; display: string; disabled: boolean }> = [];
  const start = new Date(`2000-01-01T${config.opening_time}`);
  const end = new Date(`2000-01-01T${config.closing_time}`);
  const now = new Date();
  const todayLocal = now.toISOString().split('T')[0];

  const current = new Date(start);
  while (current < end) {
    const hours = current.getHours().toString().padStart(2, '0');
    const minutes = current.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}:00`;
    const display = formatTimeSlot(timeStr);

    const isFull = (occupancyData.full_slots || []).includes(timeStr);
    const isLunch =
      config.has_lunch_break &&
      config.lunch_start &&
      config.lunch_end &&
      timeStr >= config.lunch_start &&
      timeStr < config.lunch_end;

    // Check 2-hour lead time buffer if selected date is today
    let isPast = false;
    if (date === todayLocal) {
      const leadTimeMs = (config.lead_time_hours || 0) * 3600 * 1000;
      const slotDateTime = new Date(`${date}T${timeStr}`);
      isPast = slotDateTime.getTime() < now.getTime() + leadTimeMs;
    }

    if (!isLunch) {
      slots.push({
        timeStr,
        display,
        disabled: isFull || isPast,
      });
    }

    current.setMinutes(current.getMinutes() + config.slot_duration);
  }

  return (
    <View style={styles.gridContainer}>
      <Text style={[styles.sectionTitle, { color: theme.textMain }]}>
        Available Time Blocks
      </Text>
      <View style={styles.grid}>
        {slots.map((slot) => {
          const isSelected = selectedSlot === slot.timeStr;
          return (
            <TouchableOpacity
              key={slot.timeStr}
              disabled={slot.disabled}
              onPress={() => onSelectSlot(slot.timeStr, slot.display)}
              style={[
                styles.slotButton,
                {
                  backgroundColor: isSelected
                    ? theme.brandAccent
                    : slot.disabled
                    ? theme.surfaceSubtle
                    : theme.bgCard,
                  borderColor: isSelected
                    ? theme.brandAccent
                    : slot.disabled
                    ? 'transparent'
                    : theme.borderColor,
                },
              ]}>
              <Text
                style={[
                  styles.slotText,
                  {
                    color: isSelected
                      ? '#1C232D'
                      : slot.disabled
                      ? theme.textMuted
                      : theme.textMain,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}>
                {slot.display}
              </Text>
              {slot.disabled && (
                <Text style={[styles.slotSub, { color: theme.danger }]}>Unavailable</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    marginVertical: Spacing.md,
  },
  statusTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '800',
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  gridContainer: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  slotButton: {
    width: '31%',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotText: {
    fontSize: Typography.sizes.xs,
    letterSpacing: 0.25,
  },
  slotSub: {
    fontSize: Typography.sizes.xs - 3,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});