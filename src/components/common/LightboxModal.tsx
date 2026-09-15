import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  isImageDocument,
  isDocxDocument,
  downloadFile,
  fetchFileToCache,
  openDocumentInAndroid,
  resolveFileUrl,
} from '../../utils/fileHelpers';
import { BorderRadius, Spacing } from '../../constants/theme';

export interface LightboxModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  imageUri?: string | null;
  pdfUri?: string | null;
  downloadUrl?: string | null;
  filename?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LightboxModal: React.FC<LightboxModalProps> = ({
  visible,
  onClose,
  title = 'Document Preview',
  imageUri,
  pdfUri,
  downloadUrl,
  filename,
}) => {
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [localDocUri, setLocalDocUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const rawTarget = pdfUri || imageUri;
  const isImage = isImageDocument(rawTarget);
  const isDocx = isDocxDocument(rawTarget);
  const resolvedTarget = resolveFileUrl(rawTarget);
  const targetDownloadUrl = downloadUrl ? resolveFileUrl(downloadUrl) : resolvedTarget;
  const effectiveFilename =
    filename || (isImage ? 'medical_scan.jpg' : isDocx ? 'document.docx' : 'clinical_result.pdf');

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.75));
  const resetZoom = () => setScale(1);

  // If document is a PDF or DOCX, fetch it to cache so Android's native viewer can open it directly
  useEffect(() => {
    if (visible && rawTarget && !isImage) {
      setLoadError(null);
      setLoading(true);

      const cacheName = `preview_${Date.now()}_${effectiveFilename}`;
      fetchFileToCache(rawTarget, cacheName)
        .then((cachedUri) => {
          if (cachedUri) {
            setLocalDocUri(cachedUri);
            // Automatically open native Android reader directly
            openDocumentInAndroid(cachedUri, title, isDocx);
          } else {
            setLoadError('Unable to load document from server.');
          }
        })
        .catch(() => {
          setLoadError('Failed to fetch document.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLocalDocUri(null);
      setLoadError(null);
      setLoading(false);
    }
  }, [visible, rawTarget, isImage, isDocx]);

  const handleLaunchAndroidViewer = async () => {
    if (!localDocUri) return;
    await openDocumentInAndroid(localDocUri, title, isDocx);
  };

  const handleDownload = async () => {
    if (!targetDownloadUrl) return;
    setDownloading(true);
    await downloadFile(targetDownloadUrl, effectiveFilename);
    setDownloading(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleDownload}
              disabled={downloading}
              style={styles.actionIconBtn}
              hitSlop={10}>
              {downloading ? (
                <ActivityIndicator size="small" color="#19D38C" />
              ) : (
                <Ionicons name="download-outline" size={22} color="#19D38C" />
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.actionIconBtn} hitSlop={10}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Viewer Content */}
        <View style={styles.canvasContainer}>
          {isImage ? (
            /* DIRECT NATIVE IMAGE PREVIEW (Rendered right on screen with pan/zoom) */
            <View style={styles.imageCanvas}>
              <Image
                source={{ uri: resolvedTarget }}
                style={[styles.previewImage, { transform: [{ scale }] }]}
                resizeMode="contain"
                onError={() => setLoadError('Unable to render image asset.')}
              />
              {loadError ? (
                <View style={[StyleSheet.absoluteFill, styles.centerBox]}>
                  <Ionicons name="alert-circle-outline" size={48} color="#FF4D4D" />
                  <Text style={styles.errorText}>{loadError}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            /* PDF & DOCX NATIVE VIEWER CARD FOR ANDROID */
            <View style={styles.centerBox}>
              {loading ? (
                <>
                  <ActivityIndicator size="large" color="#19D38C" />
                  <Text style={styles.loadingText}>Opening in Android document viewer...</Text>
                </>
              ) : loadError ? (
                <>
                  <Ionicons name="alert-circle-outline" size={48} color="#FF4D4D" />
                  <Text style={styles.errorText}>{loadError}</Text>
                </>
              ) : (
                <View style={styles.docCard}>
                  <View style={styles.docIconCircle}>
                    <Ionicons
                      name={isDocx ? 'document-text' : 'document-attach'}
                      size={44}
                      color="#19D38C"
                    />
                  </View>

                  <Text style={styles.docTitle}>{title}</Text>
                  <Text style={styles.docSub}>
                    {isDocx ? 'DOCX Document' : 'PDF Document'} ready for viewing.
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.openViewerBtn}
                    onPress={handleLaunchAndroidViewer}>
                    <Ionicons name="open-outline" size={18} color="#1C232D" style={{ marginRight: 6 }} />
                    <Text style={styles.openViewerBtnText}>OPEN NATIVE VIEWER</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.downloadDocBtn}
                    onPress={handleDownload}>
                    <Ionicons name="download-outline" size={18} color="#19D38C" style={{ marginRight: 6 }} />
                    <Text style={styles.downloadDocBtnText}>
                      {downloading ? 'SAVING...' : 'SAVE TO DEVICE'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Zoom Controls for Images Only */}
        {isImage && !loadError && (
          <View style={styles.toolbar}>
            <TouchableOpacity onPress={zoomOut} style={styles.toolBtn}>
              <Ionicons name="remove-circle-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.zoomText}>{Math.round(scale * 100)}%</Text>
            <TouchableOpacity onPress={zoomIn} style={styles.toolBtn}>
              <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={resetZoom} style={[styles.toolBtn, styles.resetBtn]}>
              <Ionicons name="refresh-outline" size={20} color="#FF4D4D" />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 19, 0.96)',
    justifyContent: 'space-between',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionIconBtn: { padding: 6 },
  canvasContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    width: '100%',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF4D4D',
    fontSize: 13,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  docCard: {
    backgroundColor: '#1C232D',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    maxWidth: 320,
    width: '88%',
    borderWidth: 1.5,
    borderColor: 'rgba(25, 211, 140, 0.3)',
  },
  docIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(25, 211, 140, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  docTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  docSub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  openViewerBtn: {
    backgroundColor: '#19D38C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    width: '100%',
    marginBottom: Spacing.sm,
  },
  openViewerBtnText: {
    color: '#1C232D',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  downloadDocBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#19D38C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    width: '100%',
  },
  downloadDocBtnText: {
    color: '#19D38C',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  imageCanvas: {
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_HEIGHT * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  toolbar: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 35, 45, 0.85)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: Spacing.md,
  },
  toolBtn: { padding: 6 },
  resetBtn: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    paddingLeft: Spacing.sm,
  },
  zoomText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    minWidth: 40,
    textAlign: 'center',
  },
});