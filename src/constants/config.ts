/**
 * Global Configuration for Medscreen Mobile Client
 * Connected to Production Render Backend & Aiven Database
 */

export const CONFIG = {
  API_BASE_URL: 'https://labappointment.onrender.com/api',
  WEB_BASE_URL: 'https://labappointment.onrender.com',
  PSGC_BASE_URL: 'https://psgc.gitlab.io/api',
  APP_NAME: 'Medscreen Diagnostic Laboratory',
  SUPPORT_EMAIL: 'medscreen.lab@gmail.com',
  SUPPORT_PHONE: '(083) 823 8754',
  CLINIC_LOCATION: 'Atis St, General Santos City (Dadiangas), 9500 South Cotabato',
  FACEBOOK_URL: 'https://web.facebook.com/medscreendiagnosticlab/',
};

export const EXTERNAL_ROUTES = {
  VERIFY_RESULT: `${CONFIG.WEB_BASE_URL}/verify-result`,
  LEGAL_PRIVACY: `${CONFIG.WEB_BASE_URL}/legal/privacy`,
  LEGAL_TERMS: `${CONFIG.WEB_BASE_URL}/legal/terms`,
  LEGAL_DPA: `${CONFIG.WEB_BASE_URL}/legal/dpa`,
  LEGAL_COOKIES: `${CONFIG.WEB_BASE_URL}/legal/cookies`,
  BULK_APPOINTMENT: `${CONFIG.WEB_BASE_URL}/appointments/bulk`,
};