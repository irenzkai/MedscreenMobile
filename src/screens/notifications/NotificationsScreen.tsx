import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../hooks/useTheme';
import { apiClient } from '../../services/api/client';
import { InAppNotification } from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { formatRelativeTime } from '../../utils/formatters';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export const NotificationsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get<{ notifications?: { data?: InAppNotification[] } | InAppNotification[] }>(
        '/notifications'
      );
      const data = Array.isArray(res.data)
        ? res.data
        : (res.data.notifications as any)?.data || (res.data.notifications as any) || [];
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (notif: InAppNotification) => {
    try {
      await apiClient.get(`/notifications/${notif.id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch {
      // Proceed gracefully
    }

    navigation.navigate('PatientTabs', { screen: 'Appointments' });
  };

  const handleClearAll = async () => {
    try {
      await apiClient.get('/notifications/clear-all');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      );
    } catch {
      // Proceed gracefully
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <Header
        title="Notifications"
        subtitle={`${unreadCount} Unread Alerts`}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleClearAll} hitSlop={8}>
              <Text style={[styles.markAllText, { color: theme.brandAccent }]}>READ ALL</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.brandAccent} />
        </View>
      ) : (
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
          {notifications.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="notifications-off-outline" size={44} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.textMain }]}>No Notifications</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                Updates on your appointments, results, and clinical status will appear here.
              </Text>
            </Card>
          ) : (
            notifications.map((notif) => {
              const isUnread = !notif.read_at;

              return (
                <Card
                  key={notif.id}
                  onPress={() => handleMarkAsRead(notif)}
                  style={[
                    styles.notifCard,
                    {
                      borderLeftColor: isUnread ? theme.brandAccent : theme.borderColor,
                      borderLeftWidth: isUnread ? 4 : 1,
                      backgroundColor: isUnread ? theme.surfaceSubtle : theme.bgCard,
                    },
                  ]}>
                  <View style={styles.notifRow}>
                    <View
                      style={[
                        styles.iconWrap,
                        {
                          backgroundColor: isUnread ? theme.surfaceSubtle : 'rgba(0,0,0,0.03)',
                        },
                      ]}>
                      <Ionicons
                        name={isUnread ? 'notifications' : 'notifications-outline'}
                        size={18}
                        color={isUnread ? theme.brandAccent : theme.textMuted}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[
                            styles.notifTitle,
                            { color: isUnread ? theme.brandAccent : theme.textMain },
                          ]}>
                          {notif.data.title.toUpperCase()}
                        </Text>
                        {isUnread && (
                          <View style={[styles.newBadge, { backgroundColor: theme.brandAccent }]}>
                            <Text style={styles.newBadgeText}>NEW</Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.notifMessage, { color: theme.textMain }]}>
                        {notif.data.message}
                      </Text>

                      <Text style={[styles.notifTime, { color: theme.textMuted }]}>
                        {formatRelativeTime(notif.created_at)}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 40 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  markAllText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  emptyCard: { padding: Spacing.xl, alignItems: 'center', justifyContent: 'center', marginVertical: Spacing.xl, borderStyle: 'dashed' },
  emptyTitle: { fontSize: Typography.sizes.sm, fontWeight: '800', textTransform: 'uppercase', marginTop: Spacing.sm },
  emptySubtitle: { fontSize: Typography.sizes.xs, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  notifCard: { marginBottom: Spacing.xs, padding: Spacing.md },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  iconWrap: { width: 36, height: 36, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  notifTitle: { fontSize: Typography.sizes.xs, fontWeight: '800', letterSpacing: 0.5 },
  newBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: BorderRadius.sm },
  newBadgeText: { color: '#1C232D', fontSize: 9, fontWeight: '800' },
  notifMessage: { fontSize: Typography.sizes.xs, lineHeight: 18, marginTop: 2 },
  notifTime: { fontSize: 10, marginTop: 6, fontWeight: '600' },
});