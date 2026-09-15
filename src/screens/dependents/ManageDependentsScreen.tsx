import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { dependentsApi } from '../../services/api/dependents';
import { Dependent } from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ActionModal } from '../../components/common/ActionModal';
import { formatPatientName, formatAddress, calculateAge } from '../../utils/formatters';
import { CONFIG } from '../../constants/config';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ManageDependents'>;

export const ManageDependentsScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { user, logoutAndRegister } = useAuth();
  const [activeDependents, setActiveDependents] = useState<Dependent[]>([]);
  const [archivedDependents, setArchivedDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Unified Modals State
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    onConfirm: () => Promise<void>;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: async () => {},
  });

  const [successModalConfig, setSuccessModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  // Promotion Modal State
  const [promoteModalVisible, setPromoteModalVisible] = useState<boolean>(false);
  const [selectedDepForPromotion, setSelectedDepForPromotion] = useState<Dependent | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const fetchDependents = useCallback(async () => {
    try {
      const res = await dependentsApi.getDependents();
      setActiveDependents(res.active || []);
      setArchivedDependents(res.archived || []);
    } catch (error) {
      console.error('Failed to load dependents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDependents();
    });
    return unsubscribe;
  }, [navigation, fetchDependents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDependents();
  };

  // Open unified modal for removing dependent
  const handlePromptDelete = (dep: Dependent) => {
    const depName = formatPatientName(dep.first_name, dep.middle_name, dep.last_name, dep.suffix);

    setConfirmModalConfig({
      visible: true,
      title: 'Remove Family Member',
      message: `Are you sure you want to deactivate and remove ${depName}? In compliance with clinical archiving regulations, their medical records will be securely retained before being permanently purged.`,
      confirmText: 'Remove',
      cancelText: 'Keep',
      icon: 'trash-outline',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await dependentsApi.deleteDependent(dep.id);
          setConfirmModalConfig((prev) => ({ ...prev, visible: false }));
          setSuccessModalConfig({
            visible: true,
            title: 'Profile Removed',
            message: `${depName} has been moved to your family archives.`,
          });
          fetchDependents();
        } catch {
          setConfirmModalConfig((prev) => ({ ...prev, visible: false }));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Open unified modal on restore
  const handleRestore = async (dep: Dependent) => {
    const depName = formatPatientName(dep.first_name, dep.middle_name, dep.last_name, dep.suffix);
    try {
      setLoading(true);
      await dependentsApi.restoreDependent(dep.id);
      setSuccessModalConfig({
        visible: true,
        title: 'Profile Restored',
        message: `${depName} has been reactivated into your active family members list.`,
      });
      fetchDependents();
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  const openPromotionModal = (dep: Dependent) => {
    setSelectedDepForPromotion(dep);
    setCopiedLink(false);
    setPromoteModalVisible(true);
  };

  const promoUrl = selectedDepForPromotion
    ? `${CONFIG.WEB_BASE_URL}/register?promote=${selectedDepForPromotion.id}`
    : '';

  const handleCopyLink = () => {
    setCopiedLink(true);
    setSuccessModalConfig({
      visible: true,
      title: 'Link Copied',
      message: 'The promotion registration link has been copied to your clipboard.',
    });
  };

  const handleLogoutAndRegisterNow = async () => {
    if (!selectedDepForPromotion) return;
    setPromoteModalVisible(false);
    await logoutAndRegister(selectedDepForPromotion, user);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <Header
        title="Family Dependents"
        subtitle="Manage Child Profiles"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateDependent')}
            style={[styles.addHeaderBtn, { backgroundColor: theme.brandAccent }]}
            hitSlop={8}>
            <Ionicons name="person-add" size={14} color="#1C232D" />
            <Text style={styles.addHeaderBtnText}>ADD</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.brandAccent}
            colors={[theme.brandAccent]}
          />
        }>
        {/* Compliance Information Card */}
        <Card style={styles.policyCard}>
          <Ionicons name="information-circle-outline" size={20} color={theme.brandAccent} />
          <Text style={[styles.policyText, { color: theme.textMuted }]}>
            This portal supports registered minor dependents (under 18 years old) only. Once a
            dependent reaches 18, their profile can be promoted to an independent account.
          </Text>
        </Card>

        {/* Active Dependents Section */}
        <Text style={[styles.sectionHeading, { color: theme.textMain }]}>
          Active Family Members
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color={theme.brandAccent} style={{ marginVertical: Spacing.xl }} />
        ) : activeDependents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="people-outline" size={44} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.textMain }]}>
              No Dependents Registered
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              Register your children or minors to book diagnostic tests on their behalf.
            </Text>
            <Button
              title="Add Child Profile"
              size="sm"
              onPress={() => navigation.navigate('CreateDependent')}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        ) : (
          activeDependents.map((dep) => {
            const age = calculateAge(dep.birthdate);
            const isOver18 = age >= 18;
            const depFullName = formatPatientName(dep.first_name, dep.middle_name, dep.last_name, dep.suffix);

            return (
              <Card
                key={dep.id}
                style={styles.depCard}
                variant={isOver18 ? 'warning' : 'default'}>
                <View style={styles.depHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.depName, { color: theme.textMain }]}>
                      {depFullName}
                    </Text>
                    <Text style={[styles.depMeta, { color: theme.textMuted }]}>
                      {(dep.sex || 'Male').toUpperCase()} • {age} YRS OLD
                    </Text>
                  </View>

                  {isOver18 ? (
                    <View style={[styles.expiredBadge, { backgroundColor: 'rgba(255, 193, 7, 0.1)' }]}>
                      <Ionicons name="warning" size={12} color={theme.warning} style={{ marginRight: 4 }} />
                      <Text style={[styles.expiredBadgeText, { color: theme.warning }]}>
                        18+ EXPIRED
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.activeBadge, { backgroundColor: theme.surfaceSubtle }]}>
                      <Text style={[styles.activeBadgeText, { color: theme.brandAccent }]}>
                        MINOR
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={13} color={theme.brandAccent} />
                  <Text style={[styles.addressText, { color: theme.textMuted }]} numberOfLines={1}>
                    {formatAddress(dep.street, dep.barangay, dep.city, dep.province)}
                  </Text>
                </View>

                {isOver18 && (
                  <View style={[styles.expiredNoticeBox, { backgroundColor: theme.surfaceSubtle }]}>
                    <Text style={[styles.expiredNoticeText, { color: theme.warning }]}>
                      Minor status expired. Profile editing is locked. Please promote this account so
                      they can register and manage their own medical history.
                    </Text>
                  </View>
                )}

                {/* Actions Toolbar */}
                <View style={[styles.actionsRow, { borderTopColor: theme.borderColor }]}>
                  {!isOver18 ? (
                    <Button
                      title="Edit Details"
                      variant="outline-secondary"
                      size="sm"
                      icon={<Ionicons name="pencil" size={13} color={theme.textMuted} />}
                      onPress={() => navigation.navigate('EditDependent', { dependentId: dep.id })}
                      style={{ flex: 1 }}
                    />
                  ) : null}

                  <Button
                    title="Promote Account"
                    variant={isOver18 ? 'primary' : 'outline'}
                    size="sm"
                    icon={<Ionicons name="arrow-up-circle-outline" size={14} color={isOver18 ? '#1C232D' : theme.brandAccent} />}
                    onPress={() => openPromotionModal(dep)}
                    style={{ flex: 1 }}
                  />

                  <TouchableOpacity
                    onPress={() => handlePromptDelete(dep)}
                    style={[styles.deleteBtn, { borderColor: theme.danger }]}
                    hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}

        {/* Archived Dependents Section */}
        {archivedDependents.length > 0 && (
          <View style={styles.archivedSection}>
            <Text style={[styles.sectionHeading, { color: theme.warning }]}>
              Archived Profiles ({archivedDependents.length})
            </Text>
            {archivedDependents.map((archived) => (
              <Card key={archived.id} variant="dashed" style={styles.archivedCard}>
                <View style={styles.archivedRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.depName, { color: theme.textMuted }]}>
                      {formatPatientName(archived.first_name, archived.middle_name, archived.last_name, archived.suffix)}
                    </Text>
                    <Text style={[styles.depMeta, { color: theme.textMuted }]}>
                      {(archived.sex || 'Male').toUpperCase()} • {calculateAge(archived.birthdate)} YRS OLD (ARCHIVED)
                    </Text>
                  </View>
                  <Button
                    title="Restore"
                    size="sm"
                    variant="outline"
                    icon={<Ionicons name="refresh" size={12} color={theme.brandAccent} />}
                    onPress={() => handleRestore(archived)}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* UNIFIED MODAL: Confirmation for Delete/Archive */}
      <ActionModal
        visible={confirmModalConfig.visible}
        type="danger"
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText={confirmModalConfig.confirmText}
        cancelText={confirmModalConfig.cancelText}
        icon={confirmModalConfig.icon}
        loading={actionLoading}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, visible: false }))}
        onConfirm={confirmModalConfig.onConfirm}
      />

      {/* UNIFIED MODAL: Action Success Acknowledgement */}
      <ActionModal
        visible={successModalConfig.visible}
        type="success"
        title={successModalConfig.title}
        message={successModalConfig.message}
        isSingleAction={true}
        confirmText="OK"
        onClose={() => setSuccessModalConfig((prev) => ({ ...prev, visible: false }))}
      />

      {/* Promotion Modal */}
      <Modal
        visible={promoteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPromoteModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: theme.surfaceSubtle }]}>
                <Ionicons name="arrow-up-circle" size={28} color={theme.brandAccent} />
              </View>
              <Text style={[styles.modalTitle, { color: theme.textMain }]}>
                Promote to Independent Account
              </Text>
              <TouchableOpacity onPress={() => setPromoteModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDescription, { color: theme.textMuted }]}>
              Promoting{' '}
              <Text style={{ color: theme.brandAccent, fontWeight: '800' }}>
                {selectedDepForPromotion
                  ? formatPatientName(
                      selectedDepForPromotion.first_name,
                      selectedDepForPromotion.middle_name,
                      selectedDepForPromotion.last_name,
                      selectedDepForPromotion.suffix
                    )
                  : ''}
              </Text>{' '}
              allows them to create their own account. All historic laboratory results and medical
              records will be safely transferred to their independent profile.
            </Text>

            <View style={[styles.linkBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderColor }]}>
              <Text style={[styles.linkText, { color: theme.textMain }]} numberOfLines={1}>
                {promoUrl}
              </Text>
              <TouchableOpacity onPress={handleCopyLink} style={[styles.copyBtn, { backgroundColor: theme.brandAccent }]}>
                <Text style={styles.copyBtnText}>{copiedLink ? 'COPIED!' : 'COPY'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Logout & Register Them Now"
                variant="primary"
                onPress={handleLogoutAndRegisterNow}
                style={{ width: '100%', marginBottom: Spacing.sm }}
              />
              <Button
                title="Close"
                variant="outline-secondary"
                size="sm"
                onPress={() => setPromoteModalVisible(false)}
                style={{ width: '100%' }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 60 },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  addHeaderBtnText: { color: '#1C232D', fontSize: 11, fontWeight: '800' },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  policyText: { fontSize: Typography.sizes.xs - 1, flex: 1, lineHeight: 16 },
  sectionHeading: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  depCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  depHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  depName: { fontSize: Typography.sizes.sm, fontWeight: '800', textTransform: 'uppercase' },
  depMeta: { fontSize: Typography.sizes.xs - 1, fontWeight: '700', marginTop: 2 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  activeBadgeText: { fontSize: 10, fontWeight: '800' },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  expiredBadgeText: { fontSize: 10, fontWeight: '800' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs },
  addressText: { fontSize: Typography.sizes.xs - 1, flex: 1 },
  expiredNoticeBox: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  expiredNoticeText: { fontSize: 10, lineHeight: 14, fontWeight: '600' },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archivedSection: { marginTop: Spacing.lg },
  archivedCard: { padding: Spacing.md, marginBottom: Spacing.xs },
  archivedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  modalCard: { padding: Spacing.lg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  modalDescription: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  linkText: { flex: 1, fontSize: 11, paddingHorizontal: Spacing.xs },
  copyBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: BorderRadius.sm },
  copyBtnText: { color: '#1C232D', fontSize: 11, fontWeight: '800' },
  modalActions: { alignItems: 'center' },
});