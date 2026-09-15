import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { psgcApi } from '../../services/api/psgc';
import { PSGCItem } from '../../types';
import { Input } from './Input';
import { BorderRadius, Spacing, Typography } from '../../constants/theme';

export interface AddressSelectorProps {
  province?: string;
  city?: string;
  barangay?: string;
  street: string;
  onAddressChange: (address: {
    province: string;
    city: string;
    barangay: string;
    street: string;
  }) => void;
  errorStreet?: string;
  errorProvince?: string;
  errorCity?: string;
  errorBarangay?: string;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
  province = '',
  city = '',
  barangay = '',
  street,
  onAddressChange,
  errorStreet,
  errorProvince,
  errorCity,
  errorBarangay,
}) => {
  const theme = useTheme();

  const [provinces, setProvinces] = useState<PSGCItem[]>([]);
  const [cities, setCities] = useState<PSGCItem[]>([]);
  const [barangays, setBarangays] = useState<PSGCItem[]>([]);

  const [selectedProvince, setSelectedProvince] = useState<string>(province);
  const [selectedCity, setSelectedCity] = useState<string>(city);
  const [selectedBarangay, setSelectedBarangay] = useState<string>(barangay);
  const [streetVal, setStreetVal] = useState<string>(street);

  // Modal selector states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'province' | 'city' | 'barangay'>('province');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    psgcApi.getProvinces().then(setProvinces);
  }, []);

  useEffect(() => {
    setSelectedProvince(province);
    setSelectedCity(city);
    setSelectedBarangay(barangay);
    setStreetVal(street);
  }, [province, city, barangay, street]);

  const openPicker = async (type: 'province' | 'city' | 'barangay') => {
    setSearchQuery('');
    setModalType(type);

    if (type === 'city') {
      if (!selectedProvince) return;
      const provObj = provinces.find((p) => p.name === selectedProvince);
      if (provObj) {
        setLoadingItems(true);
        const cList = await psgcApi.getCities(provObj.code);
        setCities(cList);
        setLoadingItems(false);
      }
    } else if (type === 'barangay') {
      if (!selectedCity) return;
      const cityObj = cities.find((c) => c.name === selectedCity);
      if (cityObj) {
        setLoadingItems(true);
        const bList = await psgcApi.getBarangays(cityObj.code);
        setBarangays(bList);
        setLoadingItems(false);
      }
    }

    setModalVisible(true);
  };

  const handleSelectItem = (item: PSGCItem) => {
    if (modalType === 'province') {
      setSelectedProvince(item.name);
      setSelectedCity('');
      setSelectedBarangay('');
      onAddressChange({
        province: item.name,
        city: '',
        barangay: '',
        street: streetVal,
      });
    } else if (modalType === 'city') {
      setSelectedCity(item.name);
      setSelectedBarangay('');
      onAddressChange({
        province: selectedProvince,
        city: item.name,
        barangay: '',
        street: streetVal,
      });
    } else if (modalType === 'barangay') {
      setSelectedBarangay(item.name);
      onAddressChange({
        province: selectedProvince,
        city: selectedCity,
        barangay: item.name,
        street: streetVal,
      });
    }
    setModalVisible(false);
  };

  const handleStreetChange = (text: string) => {
    setStreetVal(text);
    onAddressChange({
      province: selectedProvince,
      city: selectedCity,
      barangay: selectedBarangay,
      street: text,
    });
  };

  const getItemsForCurrentModal = (): PSGCItem[] => {
    const list =
      modalType === 'province' ? provinces : modalType === 'city' ? cities : barangays;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) => i.name.toLowerCase().includes(q));
  };

  const compiledAddress = [
    streetVal.trim().toUpperCase(),
    selectedBarangay ? `BRGY. ${selectedBarangay.toUpperCase()}` : '',
    selectedCity ? selectedCity.toUpperCase() : '',
    selectedProvince ? selectedProvince.toUpperCase() : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.container}>
      {/* 1. Province Dropdown */}
      <View style={styles.fieldWrap}>
        <Text style={[styles.label, { color: theme.textMuted }]}>PROVINCE *</Text>
        <TouchableOpacity
          onPress={() => openPicker('province')}
          style={[
            styles.pickerTrigger,
            {
              backgroundColor: theme.bgCard,
              borderColor: errorProvince ? theme.danger : theme.borderColor,
              borderWidth: errorProvince ? 1.5 : 1,
            },
          ]}>
          <Text
            style={[
              styles.triggerText,
              { color: selectedProvince ? theme.textMain : theme.textMuted },
            ]}>
            {selectedProvince || 'Select Province'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
        </TouchableOpacity>
        {errorProvince ? (
          <Text style={[styles.inlineError, { color: theme.danger }]}>{errorProvince}</Text>
        ) : null}
      </View>

      {/* 2. City / Municipality Dropdown */}
      <View style={styles.fieldWrap}>
        <Text style={[styles.label, { color: theme.textMuted }]}>CITY / MUNICIPALITY *</Text>
        <TouchableOpacity
          disabled={!selectedProvince}
          onPress={() => openPicker('city')}
          style={[
            styles.pickerTrigger,
            {
              backgroundColor: theme.bgCard,
              borderColor: errorCity ? theme.danger : theme.borderColor,
              borderWidth: errorCity ? 1.5 : 1,
              opacity: selectedProvince ? 1 : 0.5,
            },
          ]}>
          <Text
            style={[
              styles.triggerText,
              { color: selectedCity ? theme.textMain : theme.textMuted },
            ]}>
            {selectedCity ||
              (selectedProvince ? 'Select City / Municipality' : 'Select Province First')}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
        </TouchableOpacity>
        {errorCity ? (
          <Text style={[styles.inlineError, { color: theme.danger }]}>{errorCity}</Text>
        ) : null}
      </View>

      {/* 3. Barangay Dropdown */}
      <View style={styles.fieldWrap}>
        <Text style={[styles.label, { color: theme.textMuted }]}>BARANGAY *</Text>
        <TouchableOpacity
          disabled={!selectedCity}
          onPress={() => openPicker('barangay')}
          style={[
            styles.pickerTrigger,
            {
              backgroundColor: theme.bgCard,
              borderColor: errorBarangay ? theme.danger : theme.borderColor,
              borderWidth: errorBarangay ? 1.5 : 1,
              opacity: selectedCity ? 1 : 0.5,
            },
          ]}>
          <Text
            style={[
              styles.triggerText,
              { color: selectedBarangay ? theme.textMain : theme.textMuted },
            ]}>
            {selectedBarangay || (selectedCity ? 'Select Barangay' : 'Select City First')}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
        </TouchableOpacity>
        {errorBarangay ? (
          <Text style={[styles.inlineError, { color: theme.danger }]}>{errorBarangay}</Text>
        ) : null}
      </View>

      {/* 4. Street / House No. */}
      <Input
        label="Street / House No."
        value={streetVal}
        onChangeText={handleStreetChange}
        placeholder="House / Lot / Street Name"
        error={errorStreet}
        isRequired
      />

      {/* Live Address Preview */}
      {compiledAddress.length > 0 && (
        <View style={[styles.previewBox, { backgroundColor: theme.surfaceSubtle }]}>
          <Text style={[styles.previewLabel, { color: theme.brandAccent }]}>
            COMPILED ADDRESS PREVIEW
          </Text>
          <Text style={[styles.previewText, { color: theme.textMain }]}>
            {compiledAddress}
          </Text>
        </View>
      )}

      {/* Searchable Picker Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.bgCard, borderColor: theme.borderColor },
            ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.brandAccent }]}>
                Select{' '}
                {modalType === 'province'
                  ? 'Province'
                  : modalType === 'city'
                  ? 'City / Municipality'
                  : 'Barangay'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Search filter inside modal */}
            <View
              style={[
                styles.searchBox,
                { backgroundColor: theme.bgMain, borderColor: theme.borderColor },
              ]}>
              <Ionicons
                name="search"
                size={16}
                color={theme.textMuted}
                style={{ marginRight: 6 }}
              />
              <TextInput
                placeholder="Search..."
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, { color: theme.textMain }]}
              />
            </View>

            {loadingItems ? (
              <ActivityIndicator
                size="small"
                color={theme.brandAccent}
                style={{ marginVertical: 40 }}
              />
            ) : (
              <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
                {getItemsForCurrentModal().map((item) => (
                  <TouchableOpacity
                    key={item.code}
                    onPress={() => handleSelectItem(item)}
                    style={[styles.itemRow, { borderBottomColor: theme.borderColor }]}>
                    <Text style={[styles.itemText, { color: theme.textMain }]}>
                      {item.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  fieldWrap: {
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  triggerText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
  },
  inlineError: {
    fontSize: Typography.sizes.xs - 1,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 2,
  },
  previewBox: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  previewLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  previewText: {
    fontSize: Typography.sizes.xs - 1,
    fontWeight: '700',
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.xs,
  },
  itemText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
  },
});