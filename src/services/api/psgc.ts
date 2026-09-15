import axios from 'axios';
import { CONFIG } from '../../constants/config';
import { PSGCItem } from '../../types';

const psgcClient = axios.create({
  baseURL: CONFIG.PSGC_BASE_URL,
  timeout: 10000,
});

// In-memory caches to prevent redundant network lookups
let provincesCache: PSGCItem[] | null = null;
const citiesCache = new Map<string, PSGCItem[]>();
const barangaysCache = new Map<string, PSGCItem[]>();

export const psgcApi = {
  /**
   * Fetches all Philippine Provinces
   */
  getProvinces: async (): Promise<PSGCItem[]> => {
    if (provincesCache) return provincesCache;

    try {
      const response = await psgcClient.get<Array<{ code: string; name: string }>>('/provinces.json');
      const list = response.data
        .map((p) => ({ code: p.code, name: p.name }))
        .sort((a, b) => a.name.localeCompare(b.name));

      provincesCache = list;
      return list;
    } catch (error) {
      console.error('PSGC Provinces Error:', error);
      return [];
    }
  },

  /**
   * Fetches all Cities / Municipalities for a given Province code
   */
  getCities: async (provinceCode: string): Promise<PSGCItem[]> => {
    if (!provinceCode) return [];
    if (citiesCache.has(provinceCode)) {
      return citiesCache.get(provinceCode)!;
    }

    try {
      const response = await psgcClient.get<Array<{ code: string; name: string }>>(
        `/provinces/${provinceCode}/cities-municipalities.json`
      );
      const list = response.data
        .map((c) => ({ code: c.code, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name));

      citiesCache.set(provinceCode, list);
      return list;
    } catch (error) {
      console.error('PSGC Cities Error:', error);
      return [];
    }
  },

  /**
   * Fetches all Barangays for a given City / Municipality code
   */
  getBarangays: async (cityCode: string): Promise<PSGCItem[]> => {
    if (!cityCode) return [];
    if (barangaysCache.has(cityCode)) {
      return barangaysCache.get(cityCode)!;
    }

    try {
      const response = await psgcClient.get<Array<{ code: string; name: string }>>(
        `/cities-municipalities/${cityCode}/barangays.json`
      );
      const list = response.data
        .map((b) => ({ code: b.code, name: b.name }))
        .sort((a, b) => a.name.localeCompare(b.name));

      barangaysCache.set(cityCode, list);
      return list;
    } catch (error) {
      console.error('PSGC Barangays Error:', error);
      return [];
    }
  },

  /**
   * Finds matching province item from string name (fuzzy/normalized comparison)
   */
  findProvinceByName: async (name: string): Promise<PSGCItem | undefined> => {
    const list = await psgcApi.getProvinces();
    const clean = name.trim().toUpperCase();
    return list.find(
      (p) =>
        p.name.toUpperCase() === clean ||
        p.name.toUpperCase().replace(/\b(PROVINCE OF)\b/g, '').trim() === clean
    );
  },

  /**
   * Finds matching city item from province code and city name
   */
  findCityByName: async (provinceCode: string, name: string): Promise<PSGCItem | undefined> => {
    const list = await psgcApi.getCities(provinceCode);
    const clean = name.trim().toUpperCase();
    return list.find(
      (c) =>
        c.name.toUpperCase() === clean ||
        c.name.toUpperCase().replace(/\b(CITY OF|MUNICIPALITY OF)\b/g, '').trim() === clean
    );
  },
};