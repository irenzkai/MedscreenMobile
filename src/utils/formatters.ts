import { AppointmentStatus, StatusColors } from '../types';
import { StatusColors as ThemeStatusColors } from '../constants/theme';

// ============================================================================
// Medscreen Patient Portal - Text & Data Formatters
// ============================================================================

/**
 * Formats a monetary amount into Philippine Peso standard format (₱X,XXX.XX).
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₱0.00';
  }
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  return '₱' + numeric.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Composes a normalized, PSA-compliant full patient name representation.
 * Handles 'N/A' middle name fallbacks cleanly.
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
 * Formats duration from minutes to human-readable string (e.g. 65 -> "1h 5m", 15 -> "15 mins").
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
  if (isExpired) {
    return ThemeStatusColors.expired;
  }
  return ThemeStatusColors[status] || ThemeStatusColors.pending;
}