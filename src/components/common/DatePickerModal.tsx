import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';
import { calculateAge } from '../../utils/validators';
import { BorderRadius, Spacing, Typography } from '../../constants/theme';

export interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (dateStr: string, calculatedAge?: number) => void;
  initialDate?: string;
  isDependent?: boolean;
  mode?: 'birthdate' | 'schedule';
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  onSelectDate,
  initialDate,
  isDependent = false,
  mode = 'birthdate',
}) => {
  const theme = useTheme();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate();

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const todayStr = `${currentYear}-${pad(currentMonth)}-${pad(currentDay)}`;

  // Parse initial date
  const parsed = initialDate ? new Date(initialDate) : null;
  const validParsed = parsed && !isNaN(parsed.getTime());

  const defaultYear = validParsed
    ? parsed.getFullYear()
    : mode === 'schedule'
    ? currentYear
    : isDependent
    ? currentYear - 8
    : currentYear - 22;

  const defaultMonth = validParsed ? parsed.getMonth() + 1 : mode === 'schedule' ? currentMonth : 1;
  const defaultDay = validParsed ? parsed.getDate() : mode === 'schedule' ? currentDay : 1;

  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth);
  const [selectedDay, setSelectedDay] = useState<number>(defaultDay);

  const dateStr = `${selectedYear}-${pad(selectedMonth)}-${pad(selectedDay)}`;

  // 1. DYNAMIC YEAR LIST
  const years =
    mode === 'schedule'
      ? [currentYear, currentYear + 1]
      : Array.from({ length: isDependent ? 18 : 75 }, (_, i) =>
          isDependent ? currentYear - i : currentYear - 18 - i
        );

  // 2. DYNAMIC MONTH LIST (Filter out past months if schedule is current year)
  const availableMonths = MONTHS.map((name, idx) => ({ name, monthNum: idx + 1 })).filter((m) => {
    if (mode === 'schedule' && selectedYear === currentYear) {
      return m.monthNum >= currentMonth; // Cannot select past months
    }
    return true;
  });

  // 3. DYNAMIC DAY LIST (Filter out past days if schedule is current year and current month)
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const availableDays = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter((d) => {
    if (mode === 'schedule' && selectedYear === currentYear && selectedMonth === currentMonth) {
      return d >= currentDay; // Cannot select past days
    }
    return true;
  });

  // Date and Time Calculations
  const liveAge = calculateAge(dateStr);
  const selectedDateObj = new Date(`${dateStr}T00:00:00`);
  const dayOfWeekIndex = selectedDateObj.getDay();
  const dayOfWeekName = DAYS_OF_WEEK[dayOfWeekIndex];
  const isSunday = dayOfWeekIndex === 0;
  const isPastDate = mode === 'schedule' && dateStr < todayStr;

  // Validation Flags
  const isInvalid =
    mode === 'schedule'
      ? isPastDate || isSunday
      : isDependent
      ? liveAge >= 18 || liveAge < 0
      : liveAge < 18;

  const handleConfirm = () => {
    if (isInvalid) return;
    onSelectDate(dateStr, mode === 'birthdate' ? liveAge : undefined);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.dialogCard, { backgroundColor: theme.bgCard, borderColor: theme.borderColor }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.dialogTitle, { color: theme.brandAccent }]}>
                {mode === 'schedule' ? 'Select Visit Schedule' : 'Select Birthdate'}
              </Text>
              <Text style={[styles.dialogSub, { color: theme.textMuted }]}>
                {mode === 'schedule'
                  ? 'Clinic Open Mon - Sat (Sunday Closed)'
                  : isDependent
                  ? 'Dependent Policy: Must be a minor under 18'
                  : 'Personal Policy: Must be 18+ years old'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Validation & Preview Highlight Box */}
          <View
            style={[
              styles.previewBanner,
              {
                backgroundColor: isInvalid ? 'rgba(220, 53, 69, 0.08)' : theme.surfaceSubtle,
                borderColor: isInvalid ? theme.danger : theme.brandAccent,
              },
            ]}>
            <Ionicons
              name={isInvalid ? 'alert-circle' : 'checkmark-circle'}
              size={22}
              color={isInvalid ? theme.danger : theme.brandAccent}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerDateText, { color: isInvalid ? theme.danger : theme.brandAccent }]}>
                {MONTHS[selectedMonth - 1]} {selectedDay}, {selectedYear}
              </Text>

              {mode === 'schedule' ? (
                <Text style={[styles.bannerSubText, { color: isInvalid ? theme.danger : theme.textMain }]}>
                  {dayOfWeekName} • {isSunday ? 'Clinic Closed on Sundays' : isPastDate ? 'Cannot select past date' : 'Valid Clinic Schedule'}
                </Text>
              ) : (
                <Text style={[styles.bannerSubText, { color: isInvalid ? theme.danger : theme.textMain }]}>
                  Calculated Age: {liveAge} Years Old ({isDependent ? (liveAge < 18 ? 'Valid Minor' : 'Invalid: 18+ Expired') : (liveAge >= 18 ? 'Valid Adult' : 'Invalid: Under 18')})
                </Text>
              )}
            </View>
          </View>

          {/* 3 Columns: Year, Month, Day */}
          <View style={styles.columnsRow}>
            {/* Year Column */}
            <View style={styles.column}>
              <Text style={[styles.columnLabel, { color: theme.textMuted }]}>YEAR</Text>
              <ScrollView style={[styles.columnScroll, { borderColor: theme.borderColor }]} showsVerticalScrollIndicator={false}>
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    onPress={() => setSelectedYear(y)}
                    style={[styles.columnItem, selectedYear === y && { backgroundColor: theme.brandAccent }]}>
                    <Text
                      style={[
                        styles.itemText,
                        {
                          color: selectedYear === y ? '#1C232D' : theme.textMain,
                          fontWeight: selectedYear === y ? '800' : '600',
                        },
                      ]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Month Column */}
            <View style={styles.column}>
              <Text style={[styles.columnLabel, { color: theme.textMuted }]}>MONTH</Text>
              <ScrollView style={[styles.columnScroll, { borderColor: theme.borderColor }]} showsVerticalScrollIndicator={false}>
                {availableMonths.map((m) => (
                  <TouchableOpacity
                    key={m.monthNum}
                    onPress={() => setSelectedMonth(m.monthNum)}
                    style={[styles.columnItem, selectedMonth === m.monthNum && { backgroundColor: theme.brandAccent }]}>
                    <Text
                      style={[
                        styles.itemText,
                        {
                          color: selectedMonth === m.monthNum ? '#1C232D' : theme.textMain,
                          fontWeight: selectedMonth === m.monthNum ? '800' : '600',
                        },
                      ]}>
                      {m.name.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Day Column */}
            <View style={styles.column}>
              <Text style={[styles.columnLabel, { color: theme.textMuted }]}>DAY</Text>
              <ScrollView style={[styles.columnScroll, { borderColor: theme.borderColor }]} showsVerticalScrollIndicator={false}>
                {availableDays.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setSelectedDay(d)}
                    style={[styles.columnItem, selectedDay === d && { backgroundColor: theme.brandAccent }]}>
                    <Text
                      style={[
                        styles.itemText,
                        {
                          color: selectedDay === d ? '#1C232D' : theme.textMain,
                          fontWeight: selectedDay === d ? '800' : '600',
                        },
                      ]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Action Button */}
          <Button
            title={mode === 'schedule' ? 'Set Visit Schedule' : 'Confirm Birthdate'}
            variant="primary"
            disabled={isInvalid}
            onPress={handleConfirm}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  dialogCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dialogTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dialogSub: {
    fontSize: Typography.sizes.xs - 2,
    marginTop: 2,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  bannerDateText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bannerSubText: {
    fontSize: Typography.sizes.xs - 2,
    marginTop: 2,
    fontWeight: '600',
  },
  columnsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    height: 180,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  columnScroll: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  columnItem: {
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: Typography.sizes.xs,
  },
});