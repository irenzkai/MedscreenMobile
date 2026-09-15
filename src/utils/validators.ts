// ============================================================================
// Medscreen Patient Portal - Input Validators
// Compliant with Philippine DOH & PSA Identification Standards
// ============================================================================

/**
 * Validates personal name fields (First, Middle, Last).
 * Rules:
 * - Allowed: Letters, Spanish Ñ/ñ, accented vowels, spaces, periods, hyphens, and apostrophes.
 * - Must start with a letter.
 * - Must contain at least one letter.
 * - Cannot contain consecutive punctuation marks (e.g. '--' or '..').
 * - Maximum length: 60 characters.
 */
export function validateName(value: string, fieldName = 'Name'): string | null {
  const val = value ? value.trim() : '';

  if (!val || val === 'N/A' || val.toUpperCase() === 'N/A') {
    return null;
  }

  const charRegex = /^[a-zA-Z\u00f1\u00d1\u00e1\u00c1\u00e9\u00c9\u00ed\u00cd\u00f3\u00d3\u00fa\u00da\u00fc\u00dc \s.'-]+$/;
  const startRegex = /^[a-zA-Z\u00f1\u00d1\u00e1\u00c1\u00e9\u00c9\u00ed\u00cd\u00f3\u00d3\u00fa\u00da\u00fc\u00dc]/;
  const letterRegex = /[a-zA-Z\u00f1\u00d1\u00e1\u00c1\u00e9\u00c9\u00ed\u00cd\u00f3\u00d3\u00fa\u00da\u00fc\u00dc]/;
  const consecutiveRegex = /[.'-]{2,}/;

  if (!charRegex.test(val)) {
    return `${fieldName} may only contain letters, spaces, periods, hyphens, and apostrophes.`;
  }

  if (!startRegex.test(val)) {
    return `${fieldName} must start with a letter.`;
  }

  if (!letterRegex.test(val)) {
    return `${fieldName} must contain at least one letter.`;
  }

  if (consecutiveRegex.test(val)) {
    return `${fieldName} cannot contain consecutive punctuation marks.`;
  }

  if (val.length > 60) {
    return `${fieldName} cannot exceed 60 characters.`;
  }

  return null;
}

/**
 * Validates name suffix (e.g., JR, SR, II, III, IV, V).
 * Rules:
 * - Purely letters, Roman numerals, spaces, and periods (Arabic digits 1-9 are rejected).
 * - Maximum length: 10 characters.
 */
export function validateSuffix(value?: string | null): string | null {
  if (!value) return null;
  const val = value.trim();
  if (!val) return null;

  if (val.length > 10) {
    return 'Suffix cannot exceed 10 characters.';
  }

  const suffixRegex = /^[a-zA-Z\s.]+$/;
  if (!suffixRegex.test(val)) {
    return 'Suffix may only contain letters, spaces, and periods.';
  }

  return null;
}

/**
 * Calculates accurate age from a birthdate string (YYYY-MM-DD).
 */
export function calculateAge(birthdateStr: string): number {
  if (!birthdateStr) return 0;
  const dob = new Date(birthdateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(dob.getTime())) return 0;

  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

/**
 * Validates birthdate against account policy rules:
 * - Patient / Self account: must be at least 18 years of age.
 * - Family Dependent account: must be a minor (strictly under 18 years of age).
 * - Cannot be in the future.
 */
export function validateBirthdate(birthdateStr: string, isDependent = false): string | null {
  if (!birthdateStr) {
    return 'Birthdate is required.';
  }

  const dob = new Date(birthdateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(dob.getTime())) {
    return 'Please enter a valid date in YYYY-MM-DD format.';
  }

  if (dob > today) {
    return 'Birthdate cannot be in the future.';
  }

  const age = calculateAge(birthdateStr);

  if (isDependent) {
    if (age >= 18) {
      return 'Administrative Policy: Dependents must be minors (under 18 years of age).';
    }
  } else {
    if (age < 18) {
      return 'Administrative Policy: You must be at least 18 years old to register or book for yourself.';
    }
  }

  return null;
}

/**
 * Validates Philippine standard mobile number.
 * Rules:
 * - Strictly 11 digits starting with 09 (e.g. 09123456789).
 */
export function validatePhone(phone: string): string | null {
  const val = phone ? phone.trim() : '';

  if (!val) {
    return 'Contact phone number is required.';
  }

  const phoneRegex = /^09\d{9}$/;
  if (!phoneRegex.test(val)) {
    return 'The phone number must start with 09 and contain exactly 11 digits.';
  }

  return null;
}

/**
 * Validates email address format.
 */
export function validateEmail(email: string): string | null {
  const val = email ? email.trim() : '';

  if (!val) {
    return 'Email address is required.';
  }

  const emailRegex = /^[^@\s]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(val)) {
    return 'Please enter a valid email address with a domain (e.g., name@domain.com).';
  }

  return null;
}

/**
 * Validates strict password policy for authentication security:
 * - Minimum 8 characters.
 * - At least one uppercase letter.
 * - At least one lowercase letter.
 * - At least one numeric digit.
 * - At least one special symbol.
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required.';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return 'Password must contain both uppercase and lowercase characters.';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number.';
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must include at least one special character / symbol (!@#$%^&*).';
  }

  return null;
}

/**
 * Validates that confirmation matches primary password.
 */
export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
  if (!confirmation) {
    return 'Please confirm your password.';
  }

  if (password !== confirmation) {
    return 'Password confirmation does not match.';
  }

  return null;
}

/**
 * Validates standard required text fields.
 */
export function validateRequired(value: string | undefined | null, fieldName: string): string | null {
  if (!value || !value.trim()) {
    return `${fieldName} is required.`;
  }
  return null;
}