import React, { useEffect, useState, useMemo } from 'react';
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
import { servicesApi } from '../../services/api/services';
import { Service } from '../../types';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { ServiceItem } from '../../components/appointments/ServiceItem';
import { Button } from '../../components/common/Button';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export const ServicesScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [services, setServices] = useState<Service[]>([]);
  const [activeCategory, setActiveCategory] = useState<'individual' | 'package'>('individual');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCatalog = async () => {
    try {
      const data = await servicesApi.getServices();
      setServices(data);
    } catch (error) {
      console.error('Error loading service catalog:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCatalog();
  };

  // Filter list based on selected tab and query string
  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      const matchesCategory = svc.category === activeCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        svc.name.toLowerCase().includes(query) ||
        svc.description.toLowerCase().includes(query) ||
        (svc.preparation && svc.preparation.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [services, activeCategory, searchQuery]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgMain }]}>
      <Header
        title="Diagnostic Tests"
        subtitle="Catalog & Patient Guidelines"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateAppointment')}
            style={[styles.bookHeaderBtn, { backgroundColor: theme.brandAccent }]}
            hitSlop={8}>
            <Ionicons name="calendar-outline" size={14} color="#1C232D" />
            <Text style={styles.bookHeaderBtnText}>BOOK</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>
        {/* Search Bar */}
        <Input
          placeholder="Search examinations, tests, prep..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={{ marginBottom: Spacing.sm }}
          prefixText=""
        />

        {/* Category Tabs: Individual Tests vs Health Packages */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveCategory('individual')}
            style={[
              styles.tabBtn,
              {
                backgroundColor: activeCategory === 'individual' ? theme.brandAccent : theme.bgCard,
                borderColor: activeCategory === 'individual' ? theme.brandAccent : theme.borderColor,
              },
            ]}>
            <Ionicons
              name="flask-outline"
              size={14}
              color={activeCategory === 'individual' ? '#1C232D' : theme.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeCategory === 'individual' ? '#1C232D' : theme.textMuted },
              ]}>
              Individual Tests
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveCategory('package')}
            style={[
              styles.tabBtn,
              {
                backgroundColor: activeCategory === 'package' ? theme.brandAccent : theme.bgCard,
                borderColor: activeCategory === 'package' ? theme.brandAccent : theme.borderColor,
              },
            ]}>
            <Ionicons
              name="medkit-outline"
              size={14}
              color={activeCategory === 'package' ? '#1C232D' : theme.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeCategory === 'package' ? '#1C232D' : theme.textMuted },
              ]}>
              Health Packages
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Services List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.brandAccent} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              Loading diagnostic test catalog...
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.brandAccent}
                colors={[theme.brandAccent]}
              />
            }>
            {filteredServices.length === 0 ? (
              <View style={[styles.emptyBox, { borderColor: theme.borderColor }]}>
                <Ionicons name="search-outline" size={36} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.textMain }]}>No Tests Found</Text>
                <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                  No laboratory examinations match your search query.
                </Text>
              </View>
            ) : (
              filteredServices.map((service) => (
                <View key={service.id} style={styles.serviceItemWrap}>
                  <ServiceItem
                    service={service}
                    selectable={false}
                    disabled={false}
                  />
                  <View style={styles.itemActions}>
                    <Button
                      title="Select & Book Test"
                      size="sm"
                      variant="outline"
                      onPress={() => navigation.navigate('CreateAppointment')}
                      icon={<Ionicons name="calendar" size={14} color={theme.brandAccent} />}
                    />
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, padding: Spacing.md },
  bookHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  bookHeaderBtnText: { color: '#1C232D', fontSize: 10, fontWeight: '800' },
  tabBar: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  tabBtnText: { fontSize: Typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: Typography.sizes.xs, marginTop: Spacing.sm },
  listContent: { paddingBottom: 40 },
  serviceItemWrap: { marginBottom: Spacing.sm },
  itemActions: { marginTop: -4, marginBottom: Spacing.sm, alignItems: 'flex-end' },
  emptyBox: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '800',
    marginTop: Spacing.sm,
    textTransform: 'uppercase',
  },
  emptySub: { fontSize: Typography.sizes.xs, textAlign: 'center', marginTop: 4 },
});