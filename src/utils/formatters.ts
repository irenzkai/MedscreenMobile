import { Appointment, AppointmentStatus } from '../types';
import { StatusColors as ThemeStatusColors } from '../constants/theme';
import { calculateAge } from './validators';
export { calculateAge } from './validators';

// ============================================================================
// Medscreen Patient Portal - Text & Data Formatters
// ============================================================================

/**
 * Accurately constructs a local Date object from an appointment date & time slot,
 * preventing UTC date shifting across timezones.
 */
export function getAppointmentScheduledDate(appointment: Appointment): Date | null {
  if (!appointment.appointment_date) return null;

  let year: number;
  let month: number; // 0-indexed
  let day: number;

  const rawDate = appointment.appointment_date;

  if (rawDate.includes('T')) {
    const parsed = new Date(rawDate);
    if (isNaN(parsed.getTime())) return null;
    year = parsed.getFullYear();
    month = parsed.getMonth();
    day = parsed.getDate();
  } else {
    const parts = rawDate.split('-').map((p) => parseInt(p, 10));
    if (parts.length < 3 || parts.some(isNaN)) return null;
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (appointment.time_slot) {
    const timeParts = appointment.time_slot.split(':').map((p) => parseInt(p, 10));
    if (timeParts.length >= 2 && !isNaN(timeParts[0]) && !isNaN(timeParts[1])) {
      hours = timeParts[0];
      minutes = timeParts[1];
      if (timeParts.length >= 3 && !isNaN(timeParts[2])) {
        seconds = timeParts[2];
      }
    }
  }

  return new Date(year, month, day, hours, minutes, seconds);
}

/**
 * Evaluates whether an appointment is within 24 hours of its scheduled slot.
 */
export function getCancellationPolicyDetails(appointment: Appointment): {
  isWithin24Hours: boolean;
  scheduledFormatted: string;
  diffHours: number;
} {
  const scheduled = getAppointmentScheduledDate(appointment);
  const scheduledFormatted = `${formatDate(appointment.appointment_date)} ${formatTimeSlot(appointment.time_slot)}`;

  if (!scheduled) {
    return { isWithin24Hours: false, scheduledFormatted, diffHours: 999 };
  }

  const now = new Date();
  const diffHours = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Strictly within 24 hours: 0 <= diffHours < 24
  const isWithin24Hours = diffHours >= 0 && diffHours < 24;

  return { isWithin24Hours, scheduledFormatted, diffHours };
}

/**
 * Calculates whether an appointment has dynamically expired (24-hour unprogressed rule).
 */
export function isAppointmentExpired(appointment: Appointment): boolean {
  if (['retest', 'tested', 'encoded', 'released'].includes(appointment.status)) {
    return false;
  }
  if (appointment.status === 'expired') {
    return true;
  }

  const scheduled = getAppointmentScheduledDate(appointment);
  if (!scheduled || isNaN(scheduled.getTime())) {
    return false;
  }

  // Matching Laravel Carbon rule: now > scheduledAt + 24 hours
  const expiryTimestamp = scheduled.getTime() + 24 * 60 * 60 * 1000;
  return Date.now() > expiryTimestamp;
}

/**
 * Resolves the effective clinical status of an appointment, accounting for dynamic expiration.
 */
export function getEffectiveAppointmentStatus(appointment: Appointment): AppointmentStatus {
  if (isAppointmentExpired(appointment)) {
    return 'expired';
  }
  return appointment.status;
}

/**
 * Reliably calculates the patient age from the appointment snapshot or parent/dependent birthdates.
 */
export function calculatePatientAge(appointment: Appointment): string {
  if (
    appointment.patient_age !== undefined &&
    appointment.patient_age !== null &&
    String(appointment.patient_age).trim() !== '' &&
    appointment.patient_age !== 'N/A'
  ) {
    return `${appointment.patient_age} Years Old`;
  }

  const rawBirthdate =
    appointment.patient_birthdate || appointment.dependent?.birthdate;
  if (rawBirthdate) {
    const age = calculateAge(rawBirthdate);
    if (age >= 0) {
      return `${age} Years Old`;
    }
  }
  return 'Age Not Specified';
}

/**
 * Formats a monetary amount into Philippine Peso standard format (₱X,XXX.XX).
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₱0.00';
  }
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  return (
    '₱' +
    numeric.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Composes a normalized, PSA-compliant full patient name representation.
 */
export function formatPatientName(
  firstName?: string | null,
  middleName?: string | null,
  lastName?: string | null,
  suffix?: string | null
): string {
  const f = firstName ? firstName.trim().toUpperCase() : '';
  const m =
    middleName && middleName.trim().toUpperCase() !== 'N/A'
      ? middleName.trim().toUpperCase()
      : '';
  const l = lastName ? lastName.trim().toUpperCase() : '';
  const s = suffix ? suffix.trim().toUpperCase() : '';
  const parts = [f, m, l].filter(Boolean);
  let compiled = parts.join(' ');
  if (s) {
    compiled += ` ${s}`;
  }
  return compiled || 'NOT SPECIFIED';
}

/**
 * Compiles atomic address fields into standard clinical address layout.
 */
export function formatAddress(
  street?: string | null,
  barangay?: string | null,
  city?: string | null,
  province?: string | null
): string {
  const parts: string[] = [];
  if (street && street.trim()) {
    parts.push(street.trim().toUpperCase());
  }
  if (barangay && barangay.trim() && !barangay.includes('Select')) {
    parts.push(`BRGY. ${barangay.trim().toUpperCase()}`);
  }
  if (city && city.trim() && !city.includes('Select')) {
    parts.push(city.trim().toUpperCase());
  }
  if (province && province.trim() && !province.includes('Select')) {
    parts.push(province.trim().toUpperCase());
  }
  return parts.join(', ') || 'Address Not Provided';
}

/**
 * Formats a raw phone string for display in the 9-digit input box (removes leading 09 or +639).
 */
export function formatDisplayPhone(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  let cleaned = rawPhone.trim().replace(/[^0-9]/g, '');
  if (cleaned.startsWith('639')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('09')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('9')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned.substring(0, 9);
}

/**
 * Normalizes input phone to standard 11-digit mobile format starting with 09.
 */
export function formatToStandardPhone(phoneDisplay: string): string {
  const cleaned = phoneDisplay.trim().replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('09')) return cleaned;
  return '09' + cleaned;
}

/**
 * Formats date into readable clinical string (e.g. "Oct 24, 2025").
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Formats time into 12-hour AM/PM string (e.g. "08:00:00" -> "08:00 AM").
 */
export function formatTimeSlot(timeString?: string | null): string {
  if (!timeString) return 'N/A';
  try {
    const parts = timeString.split(':');
    if (parts.length < 2) return timeString;
    let hour = parseInt(parts[0], 10);
    const min = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
    return `${hourStr}:${min} ${ampm}`;
  } catch {
    return timeString;
  }
}

/**
 * Formats duration from minutes to human-readable string (e.g. 65 -> "1h 5m").
 */
export function formatDuration(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '5 mins';
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
  }
  return `${minutes} mins`;
}

/**
 * Formats ISO timestamp into relative human-readable time (e.g. "2 hours ago").
 */
export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return '';
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  } catch {
    return '';
  }
}

/**
 * Returns complete styling metadata for an appointment status badge.
 */
export function getStatusTheme(status: AppointmentStatus, isExpired = false) {
  if (isExpired || status === 'expired') {
    return ThemeStatusColors.expired;
  }
  return ThemeStatusColors[status] || ThemeStatusColors.pending;
}