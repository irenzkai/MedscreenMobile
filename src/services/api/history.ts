import { apiClient } from './client';
import { HistoryPermissionStatus, HistoryRecord, Appointment } from '../../types';

export interface MedicalHistoryResponse {
  permissionStatus: HistoryPermissionStatus;
  appointments: Appointment[];
  existingRecords: HistoryRecord[];
}

export const historyApi = {
  /**
   * Fetches patient medical history, including past released appointments and digitized legacy records
   */
  getMedicalHistory: async (): Promise<MedicalHistoryResponse> => {
    const response = await apiClient.get<{
      labHistory?: { permission_status?: HistoryPermissionStatus };
      appointments?: Appointment[];
      existingRecords?: HistoryRecord[];
    }>('/patient-history');

    return {
      permissionStatus: response.data.labHistory?.permission_status || 'none',
      appointments: response.data.appointments || [],
      existingRecords: response.data.existingRecords || [],
    };
  },

  /**
   * Dispatches a request to laboratory staff to digitize physical records
   */
  requestDigitization: async (): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>('/patient-history/request');
    return response.data;
  },

  /**
   * Accepts clinic staff's handshake permission request to digitize records
   */
  acceptDigitizationRequest: async (): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>('/patient-history/accept');
    return response.data;
  },
};