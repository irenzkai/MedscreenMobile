import { PSGCItem } from '../../types';

const API_BASE_URL = 'https://psgc.gitlab.io/api';

// In-memory cache for fetched geographic records
const addressCache = {
  provinces: null as PSGCItem[] | null,
  cities: new Map<string, PSGCItem[]>(),
  barangays: new Map<string, PSGCItem[]>(),
};

export const psgcApi = {
  /**
   * Fetches and caches all provinces from the PSGC API.
   */
  getProvinces: async (): Promise<PSGCItem[]> => {
    if (addressCache.provinces) {
      return addressCache.provinces;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/provinces.json`, {
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const sorted = data
            .map((p: any) => ({ code: String(p.code), name: String(p.name).trim() }))
            .sort((a: PSGCItem, b: PSGCItem) => a.name.localeCompare(b.name));
          addressCache.provinces = sorted;
          return sorted;
        }
      }
    } catch (error) {
      console.error('PSGC getProvinces error:', error);
    }

    return [];
  },

  /**
   * Fetches and caches Cities / Municipalities for a given Province code.
   */
  getCities: async (provinceCode: string): Promise<PSGCItem[]> => {
    if (!provinceCode) return [];
    const code = provinceCode.trim();

    if (addressCache.cities.has(code)) {
      return addressCache.cities.get(code)!;
    }

    try {
      let res = await fetch(`${API_BASE_URL}/provinces/${code}/cities-municipalities.json`, {
        headers: { Accept: 'application/json' },
      });

      // Fallback to region endpoint if code belongs to a region (e.g., NCR)
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/regions/${code}/cities-municipalities.json`, {
          headers: { Accept: 'application/json' },
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const sorted = data
            .map((c: any) => ({ code: String(c.code), name: String(c.name).trim() }))
            .sort((a: PSGCItem, b: PSGCItem) => a.name.localeCompare(b.name));
          addressCache.cities.set(code, sorted);
          return sorted;
        }
      }
    } catch (error) {
      console.error(`PSGC getCities error for province code ${code}:`, error);
    }

    return [];
  },

  /**
   * Fetches and caches Barangays for a given City code.
   */
  getBarangays: async (cityCode: string): Promise<PSGCItem[]> => {
    if (!cityCode) return [];
    const code = cityCode.trim();

    if (addressCache.barangays.has(code)) {
      return addressCache.barangays.get(code)!;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/cities-municipalities/${code}/barangays.json`, {
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const sorted = data
            .map((b: any) => ({ code: String(b.code || b.name), name: String(b.name).trim() }))
            .sort((a: PSGCItem, b: PSGCItem) => a.name.localeCompare(b.name));
          addressCache.barangays.set(code, sorted);
          return sorted;
        }
      }
    } catch (error) {
      console.error(`PSGC getBarangays error for city code ${code}:`, error);
    }

    return [];
  },

  /**
   * Clears in-memory address cache if required.
   */
  clearCache: (): void => {
    addressCache.provinces = null;
    addressCache.cities.clear();
    addressCache.barangays.clear();
  },
};