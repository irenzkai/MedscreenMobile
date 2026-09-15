export type UserRole = 'user' | 'staff' | 'lab_tech' | 'admin';

export type Sex = 'Male' | 'Female';

export type AppointmentStatus =
  | 'pending'
  | 'approved'
  | 'tested'
  | 'encoded'
  | 'released'
  | 'returned'
  | 'retest'
  | 'canceled'
  | 'expired';

export type PaymentMethod = 'Cash' | 'Cashless';

export type PaymentStatus = 'unpaid' | 'paid' | 'invalid' | 'refunded';

export type HistoryPermissionStatus = 'none' | 'pending_patient' | 'pending_staff' | 'granted';

export interface User {
  id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  name: string;
  email: string;
  phone: string;
  birthdate: string;
  sex: Sex;
  street: string;
  barangay: string;
  city: string;
  province: string;
  role: UserRole;
  is_active: boolean;
  email_verified_at?: string | null;
  phone_verified_at?: string | null;
  password_change_required?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Dependent {
  id: number;
  user_id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  name: string;
  birthdate: string;
  age?: number;
  sex: Sex;
  phone?: string | null;
  street: string;
  barangay: string;
  city: string;
  province: string;
  address?: string;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: number;
  name: string;
  price: number;
  description: string;
  preparation: string;
  estimated_time?: number;
  category: 'individual' | 'package';
  gender_restriction: 'male' | 'female' | 'both';
  is_available: boolean;
  sample_required?: string;
  formatted_time?: string;
}

export interface PaymentProvider {
  id: number;
  name: string;
  logo?: string | null;
  qr_code: string;
  is_active: boolean;
}

export interface AppointmentConfig {
  id?: number;
  day_of_week?: number;
  specific_date?: string;
  is_open: boolean;
  opening_time: string;
  closing_time: string;
  slot_duration: number;
  has_lunch_break: boolean;
  lunch_start?: string | null;
  lunch_end?: string | null;
  max_patients_per_slot: number;
  lead_time_hours: number;
}

export interface SlotOccupancyResponse {
  patient_gender: string;
  is_closed: boolean;
  config: AppointmentConfig | null;
  full_slots: string[];
  occupied_slots: Record<string, number>;
  server_time: string;
  server_date: string;
}

export interface Appointment {
  id: number;
  user_id: number;
  dependent_id?: number | null;
  organization_name?: string | null;
  batch_id?: string | null;
  appointment_date: string;
  time_slot: string;
  patient_first_name?: string | null;
  patient_middle_name?: string | null;
  patient_last_name?: string | null;
  patient_suffix?: string | null;
  patient_name: string;
  patient_email?: string | null;
  patient_phone?: string | null;
  patient_sex?: Sex | null;
  patient_birthdate?: string | null;
  patient_age?: number | string;
  referral_note?: string | null;
  patient_street?: string | null;
  patient_barangay?: string | null;
  patient_city?: string | null;
  patient_province?: string | null;
  patient_address?: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_receipt?: string | null;
  payment_amount: number;
  status: AppointmentStatus;
  return_reason?: string | null;
  deleted_by_patient: boolean;
  tested_at?: string | null;
  result_estimated_at?: string | null;
  results_released_at?: string | null;
  created_at: string;
  updated_at: string;
  user?: User | null;
  services?: Service[];
  dependent?: Dependent | null;
  result?: AppointmentResult | null;
}

export interface AppointmentResult {
  id: number;
  appointment_id: number;
  included_reports?: string[];
  lab_status?: string;
  med_status?: string;
  radio_status?: string;
  drug_status?: string;
  lab_scan?: string | null;
  radio_scan?: string | null;
  xray_image?: string | null;
  drug_test_scan?: string | null;
  med_cert_scan?: string | null;
}

export interface HistoryScan {
  id?: number;
  label: string;
  file_path: string;
  certificate_no?: string | null;
}

export interface HistoryRecord {
  id: number;
  date_of_record: string;
  requested_by: string;
  patient_name: string;
  age: number;
  sex: Sex;
  address: string;
  tests_requested: string[];
  scans: HistoryScan[];
}

export interface LaboratoryHistory {
  id: number;
  user_id: number;
  permission_status: HistoryPermissionStatus;
}

export interface InAppNotification {
  id: string;
  type: string;
  data: {
    title: string;
    message: string;
    url?: string;
    type?: 'info' | 'success' | 'danger';
  };
  read_at?: string | null;
  created_at: string;
}

export interface PSGCItem {
  code: string;
  name: string;
}