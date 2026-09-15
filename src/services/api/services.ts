import { apiClient } from './client';
import { Service, PaymentProvider } from '../../types';

export interface ServicesResponse {
  services: Service[];
  popularServices?: Service[];
}

export const servicesApi = {
  /**
   * Fetches the complete catalog of active clinical tests and health packages
   */
  getServices: async (): Promise<Service[]> => {
    const response = await apiClient.get<{ services?: Service[] } | Service[]>('/services');
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.services || [];
  },

  /**
   * Fetches active e-wallet/online payment gateways (e.g. GCash, Maya) with QR assets
   */
  getPaymentProviders: async (): Promise<PaymentProvider[]> => {
    const response = await apiClient.get<{ paymentProviders?: PaymentProvider[] } | PaymentProvider[]>('/payment-providers');
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.paymentProviders || [];
  },
};