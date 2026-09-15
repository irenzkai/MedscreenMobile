import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { openWebUrl } from '../../utils/externalLinks';
import { BorderRadius, Spacing } from '../../constants/theme';

export interface LightboxModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  imageUri?: string | null;
  pdfUri?: string | null;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LightboxModal: React.FC<LightboxModalProps> = ({
  visible,
  onClose,
  title = 'Document Preview',
  imageUri,
  pdfUri,
}) => {
  const [scale, setScale] = useState(1);

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.75));
  const resetZoom = () => setScale(1);

  const handleOpenPdfExternal = () => {
    if (pdfUri) {
      openWebUrl(pdfUri);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        {/* Top Header Controls */}
        <View style={styles.headerBar}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={10}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Canvas Display View */}
        <View style={styles.canvasContainer}>
          {pdfUri ? (
            <View style={styles.pdfPromptCard}>
              <Ionicons name="document-text-outline" size={64} color="#19D38C" />
              <Text style={styles.pdfPromptTitle}>PDF Document Available</Text>
              <Text style={styles.pdfPromptSub}>
                To view or download this medical result, open it in your secure browser.
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.openBrowserBtn}
                onPress={handleOpenPdfExternal}>
                <Ionicons name="open-outline" size={18} color="#1C232D" style={{ marginRight: 6 }} />
                <Text style={styles.openBrowserBtnText}>OPEN DOCUMENT</Text>
              </TouchableOpacity>
            </View>
          ) : imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={[
                styles.previewImage,
                { transform: [{ scale }] },
              ]}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="image-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>No preview asset available</Text>
            </View>
          )}
        </View>

        {/* Floating Zoom & Tool Controls (Images only) */}
        {imageUri && (
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
    backgroundColor: 'rgba(7, 11, 19, 0.95)',
    justifyContent: 'space-between',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  closeButton: {
    padding: 6,
  },
  canvasContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.65,
  },
  pdfPromptCard: {
    backgroundColor: '#1C232D',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pdfPromptTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  pdfPromptSub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  openBrowserBtn: {
    backgroundColor: '#19D38C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
    width: '100%',
  },
  openBrowserBtnText: {
    color: '#1C232D',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: Spacing.sm,
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
  toolBtn: {
    padding: 6,
  },
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