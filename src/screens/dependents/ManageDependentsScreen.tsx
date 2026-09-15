import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
import { formatPatientName, formatAddress, calculateAge } from '../../utils/formatters';
import { CONFIG } from '../../constants/config';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ManageDependents'>;

export const ManageDependentsScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { logout } = useAuth();

  const [activeDependents, setActiveDependents] = useState<Dependent[]>([]);
  const [archivedDependents, setArchivedDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Promotion Modal State
  const [promoteModalVisible, setPromoteModalVisible] = useState<boolean>(false);
  const [selectedDepForPromotion, setSelectedDepForPromotion] = useState<Dependent | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const fetchDependents = useCallback(async () => {
    try {
      const res = await dependentsApi.getDependents();
      setActiveDependents(res.active);
      setArchivedDependents(res.archived);
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

  const handleDelete = (dep: Dependent) => {
    Alert.alert(
      'Remove Family Member?',
      `Are you sure you want to deactivate and remove ${dep.name}? In compliance with clinical archiving regulations, their medical records will be securely retained before being permanently purged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await dependentsApi.deleteDependent(dep.id);
              fetchDependents();
            } catch {
              Alert.alert('Error', 'Could not remove dependent profile.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRestore = async (dep: Dependent) => {
    try {
      setLoading(true);
      await dependentsApi.restoreDependent(dep.id);
      Alert.alert('Restored', `${dep.name} has been reactivated into your active family list.`);
      fetchDependents();
    } catch {
      Alert.alert('Error', 'Could not restore dependent record.');
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
    Alert.alert('Link Copied', 'The promotion registration link has been copied to your clipboard.');
  };

  const handleLogoutAndRegister = async () => {
    setPromoteModalVisible(false);
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'PatientTabs' }],
    });
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
            This portal supports registered minor dependents (under 18 years old) only. Once a dependent reaches 18, their profile can be promoted to an independent account.
          </Text>
        </Card>

        {/* Active Dependents Section */}
        <Text style={[styles.sectionHeading, { color: theme.textMain }]}>Active Family Members</Text>

        {loading ? (
          <ActivityIndicator size="small" color={theme.brandAccent} style={{ marginVertical: Spacing.xl }} />
        ) : activeDependents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="people-outline" size={44} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.textMain }]}>No Dependents Registered</Text>
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

            return (
              <Card
                key={dep.id}
                style={styles.depCard}
                variant={isOver18 ? 'warning' : 'default'}>
                <View style={styles.depHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.depName, { color: theme.textMain }]}>
                      {formatPatientName(dep.first_name, dep.middle_name, dep.last_name, dep.suffix)}
                    </Text>
                    <Text style={[styles.depMeta, { color: theme.textMuted }]}>
                      {dep.sex.toUpperCase()} • {age} YRS OLD
                    </Text>
                  </View>

                  {isOver18 ? (
                    <View style={[styles.expiredBadge, { backgroundColor: 'rgba(255, 193, 7, 0.1)' }]}>
                      <Ionicons name="warning" size={12} color={theme.warning} style={{ marginRight: 4 }} />
                      <Text style={[styles.expiredBadgeText, { color: theme.warning }]}>18+ EXPIRED</Text>
                    </View>
                  ) : (
                    <View style={[styles.activeBadge, { backgroundColor: theme.surfaceSubtle }]}>
                      <Text style={[styles.activeBadgeText, { color: theme.brandAccent }]}>MINOR</Text>
                    </View>
                  )}
                </View>

                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={13} color={theme.brandAccent} />
                  <Text style={[styles.addressText, { color: theme.textMuted }]} numberOfLines={1}>
                    {formatAddress(dep.street, dep.barangay, dep.city, dep.province)}
                  </Text>
                </View>

                {/* Over-18 Expiration Warning Banner */}
                {isOver18 && (
                  <View style={[styles.expiredNoticeBox, { backgroundColor: theme.surfaceSubtle }]}>
                    <Text style={[styles.expiredNoticeText, { color: theme.warning }]}>
                      Minor status expired. Profile editing is locked. Please promote this account so they can manage their own medical history.
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
                    onPress={() => handleDelete(dep)}
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
                      {archived.sex.toUpperCase()} • {calculateAge(archived.birthdate)} YRS OLD (ARCHIVED)
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
              <Text style={[styles.modalTitle, { color: theme.textMain }]}>Promote to Independent Account</Text>
              <TouchableOpacity onPress={() => setPromoteModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDescription, { color: theme.textMuted }]}>
              Promoting <Text style={{ color: theme.brandAccent, fontWeight: '800' }}>{selectedDepForPromotion?.name}</Text> allows them to create their own independent profile. All historic laboratory results and medical files will be automatically transferred to their new account.
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
                onPress={handleLogoutAndRegister}
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
  policyCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, gap: Spacing.xs, marginBottom: Spacing.md },
  policyText: { fontSize: Typography.sizes.xs - 1, flex: 1, lineHeight: 16 },
  sectionHeading: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  emptyCard: { padding: Spacing.xl, alignItems: 'center', justifyContent: 'center', marginVertical: Spacing.md, borderStyle: 'dashed' },
  emptyTitle: { fontSize: Typography.sizes.md, fontWeight: '800', textTransform: 'uppercase', marginTop: Spacing.sm },
  emptySubtitle: { fontSize: Typography.sizes.xs, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  depCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  depHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  depName: { fontSize: Typography.sizes.sm, fontWeight: '800', textTransform: 'uppercase' },
  depMeta: { fontSize: Typography.sizes.xs - 1, fontWeight: '700', marginTop: 2 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  activeBadgeText: { fontSize: 10, fontWeight: '800' },
  expiredBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  expiredBadgeText: { fontSize: 10, fontWeight: '800' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs },
  addressText: { fontSize: Typography.sizes.xs - 1, flex: 1 },
  expiredNoticeBox: { padding: Spacing.xs, borderRadius: BorderRadius.sm, marginTop: Spacing.sm },
  expiredNoticeText: { fontSize: 10, lineHeight: 14, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1 },
  deleteBtn: { padding: 8, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  archivedSection: { marginTop: Spacing.lg },
  archivedCard: { padding: Spacing.md, marginBottom: Spacing.xs },
  archivedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: Spacing.md },
  modalCard: { padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  modalIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: Typography.sizes.sm, fontWeight: '800', textTransform: 'uppercase', flex: 1, marginHorizontal: Spacing.sm },
  modalDescription: { fontSize: Typography.sizes.xs, lineHeight: 18, marginBottom: Spacing.md },
  linkBox: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xs, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.lg },
  linkText: { flex: 1, fontSize: 11, paddingHorizontal: Spacing.xs },
  copyBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: BorderRadius.sm },
  copyBtnText: { color: '#1C232D', fontSize: 11, fontWeight: '800' },
  modalActions: { alignItems: 'center' },
});