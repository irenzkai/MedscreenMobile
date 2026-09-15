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
      {/* Top Navbar Header */}
      <Header
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
        {/* LOWERED SECTION TITLE */}
        <View style={styles.pageTitleBlock}>
          <Text style={[styles.pageMainTitle, { color: theme.brandAccent }]}>
            DIAGNOSTIC TESTS
          </Text>
          <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>
            Catalog, examination requirements, and patient guidelines.
          </Text>
        </View>

        {/* Search Bar */}
        <Input
          placeholder="Search examinations, tests, prep guidelines..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={{ marginBottom: Spacing.xs }}
        />

        {/* Category Navigation Tabs */}
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

        {/* Content Services List (Clean card presentation without per-item buttons) */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.brandAccent} />
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
                  No examinations match your search query.
                </Text>
              </View>
            ) : (
              filteredServices.map((service) => (
                <ServiceItem
                  key={service.id}
                  service={service}
                  selectable={false}
                  disabled={false}
                />
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
  container: { flex: 1, paddingHorizontal: Spacing.md },
  pageTitleBlock: {
    marginVertical: Spacing.sm,
  },
  pageMainTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pageSubtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  bookHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  bookHeaderBtnText: { color: '#1C232D', fontSize: 10, fontWeight: '800' },
  tabBar: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
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
  listContent: { paddingBottom: 40 },
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