import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { EXTERNAL_ROUTES } from '../constants/config';

/**
 * Open external web page inside standard secure in-app browser
 */
export async function openWebUrl(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
      toolbarColor: '#1C232D',
      controlsColor: '#19D38C',
    });
  } catch (error) {
    Alert.alert('Unable to open link', 'Could not open the browser. Please visit the website directly.');
  }
}

/**
 * Opens Verification Gateway on Website
 */
export async function openVerifyResultOnWeb(): Promise<void> {
  await openWebUrl(EXTERNAL_ROUTES.VERIFY_RESULT);
}

/**
 * Compliance / Legal Links
 */
export async function openPrivacyPolicyOnWeb(): Promise<void> {
  await openWebUrl(EXTERNAL_ROUTES.LEGAL_PRIVACY);
}

export async function openTermsOfServiceOnWeb(): Promise<void> {
  await openWebUrl(EXTERNAL_ROUTES.LEGAL_TERMS);
}

export async function openDataPrivacyActOnWeb(): Promise<void> {
  await openWebUrl(EXTERNAL_ROUTES.LEGAL_DPA);
}

/**
 * Modal Alert informing patients that Bulk Appointments are exclusive to the web
 */
export function alertBulkWebExclusive(): void {
  Alert.alert(
    'Website Exclusive Feature',
    'Corporate & Bulk Appointment bookings are exclusive to our web portal for batch spreadsheet compilation and billing verification.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Go to Website', onPress: () => openWebUrl(EXTERNAL_ROUTES.BULK_APPOINTMENT) },
    ]
  );
}