import { Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { CONFIG } from '../constants/config';
import { getStoredToken } from '../services/api/client';

/**
 * Normalizes any storage or relative asset path into a clean, reachable URL.
 */
export function resolveFileUrl(path?: string | null): string {
  if (!path) return '';

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  let clean = path.replace(/^\/+/, '');
  if (clean.startsWith('storage/')) {
    clean = clean.substring('storage/'.length);
  }

  return `${CONFIG.API_BASE_URL}/media/${clean}`;
}

/**
 * Builds the authenticated API endpoint for an appointment result file.
 */
export function getAppointmentResultApiUrl(
  appointmentId: number,
  type = 'lab',
  mode: 'preview' | 'download' = 'preview'
): string {
  return `${CONFIG.API_BASE_URL}/appointments/${appointmentId}/result/${type}/${mode}`;
}

/**
 * Detects if a path or URL points specifically to an image asset.
 */
export function isImageDocument(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.jpg') ||
    clean.endsWith('.jpeg') ||
    clean.endsWith('.png') ||
    clean.endsWith('.jfif') ||
    clean.endsWith('.webp') ||
    clean.endsWith('.bmp')
  );
}

/**
 * Determines whether a file path or URL points to a PDF document.
 */
export function isPdfDocument(url?: string | null): boolean {
  if (!url) return false;
  if (isImageDocument(url)) return false;
  const clean = url.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.pdf') ||
    clean.includes('/result/') ||
    clean.includes('/preview') ||
    clean.includes('/download')
  );
}

/**
 * Determines whether a file path or URL points to a DOCX/Word document.
 */
export function isDocxDocument(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.docx') || clean.endsWith('.doc');
}

/**
 * Internal downloader supporting modern Expo SDK 54 File/Paths API and legacy fallback.
 */
async function executeDownload(
  fullUrl: string,
  folder: 'document' | 'cache',
  filename: string,
  headers: Record<string, string>
): Promise<string> {
  try {
    if (typeof File !== 'undefined' && typeof Paths !== 'undefined' && File.downloadFileAsync) {
      const targetDir = folder === 'document' ? Paths.document : Paths.cache;
      const destination = new File(targetDir, filename);
      if (destination.exists) {
        try {
          destination.delete();
        } catch {}
      }
      const downloaded = await File.downloadFileAsync(fullUrl, destination, { headers });
      return downloaded.uri;
    }
  } catch (modernErr) {
    console.warn('Modern File.downloadFileAsync failed, attempting legacy API:', modernErr);
  }

  const baseDir =
    folder === 'document'
      ? LegacyFileSystem.documentDirectory
      : LegacyFileSystem.cacheDirectory;
  const localUri = `${baseDir}${filename}`;
  const res = await LegacyFileSystem.downloadAsync(fullUrl, localUri, { headers });
  return res.uri;
}

/**
 * Downloads a file directly inside the mobile app to device storage.
 */
export async function downloadFile(
  urlOrPath: string,
  suggestedFilename = 'document.pdf'
): Promise<string | null> {
  try {
    const fullUrl = resolveFileUrl(urlOrPath);
    const token = await getStoredToken();
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const safeFilename = suggestedFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const downloadedUri = await executeDownload(fullUrl, 'document', safeFilename, headers);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(downloadedUri, {
        dialogTitle: `Save ${suggestedFilename}`,
        mimeType: suggestedFilename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        UTI: suggestedFilename.endsWith('.pdf') ? 'com.adobe.pdf' : undefined,
      });
    } else {
      Alert.alert('Download Complete', `File saved to ${downloadedUri}`);
    }

    return downloadedUri;
  } catch (error: any) {
    Alert.alert('Download Error', error?.message || 'Could not download file to device.');
    return null;
  }
}

export const downloadFileInApp = downloadFile;

/**
 * Downloads a remote file into the app's local cache for in-app previewing.
 */
export async function fetchFileToCache(
  urlOrPath: string,
  cacheFilename: string
): Promise<string | null> {
  try {
    const fullUrl = resolveFileUrl(urlOrPath);
    const token = await getStoredToken();
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const safeFilename = cacheFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const localUri = await executeDownload(fullUrl, 'cache', safeFilename, headers);
    return localUri;
  } catch (err) {
    console.error('Failed to cache file for in-app preview:', err);
    return null;
  }
}

/**
 * Opens a cached PDF or DOCX file directly inside Android's native viewer app
 * (Google Drive Viewer, Mi Viewer, etc.) using IntentLauncher without redirecting to a browser.
 */
export async function openDocumentInAndroid(
  localUri: string,
  title?: string,
  isDocx = false
): Promise<void> {
  const mimeType = isDocx
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'application/pdf';

  try {
    // Convert file:// URI to content:// URI so Android external viewer apps can read it
    const contentUri = await LegacyFileSystem.getContentUriAsync(localUri);

    let IntentLauncher: any = null;
    try {
      IntentLauncher = require('expo-intent-launcher');
    } catch {}

    if (IntentLauncher && IntentLauncher.startActivityAsync) {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: mimeType,
      });
      return;
    }
  } catch (err) {
    console.warn('IntentLauncher failed, falling back to Sharing:', err);
  }

  // Fallback if IntentLauncher is unavailable
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localUri, {
      dialogTitle: title || 'View Clinical Report',
      mimeType,
      UTI: isDocx ? undefined : 'com.adobe.pdf',
    });
  } else {
    Alert.alert('Document Ready', 'File is downloaded in your local storage.');
  }
}