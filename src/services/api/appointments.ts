import { apiClient } from './client';
import { Appointment, SlotOccupancyResponse } from '../../types';

export interface AppointmentsListResponse {
  self: Appointment[];
  dependents: Appointment[];
  bulkCount: number; // Stored to display count while bulk creation is locked in app
}

export const appointmentsApi = {
  /**
   * Fetches all user-related appointments categorized by personal and dependents
   */
  getAppointments: async (): Promise<AppointmentsListResponse> => {
    const response = await apiClient.get<{
      self: { data?: Appointment[] } | Appointment[];
      dependents: { data?: Appointment[] } | Appointment[];
      bulkPaginator?: { total?: number };
    }>('/appointments');

    const selfData = Array.isArray(response.data.self)
      ? response.data.self
      : response.data.self?.data || [];

    const dependentsData = Array.isArray(response.data.dependents)
      ? response.data.dependents
      : response.data.dependents?.data || [];

    const bulkCount = response.data.bulkPaginator?.total || 0;

    return {
      self: selfData,
      dependents: dependentsData,
      bulkCount,
    };
  },

  /**
   * Queries real-time slot occupancy and clinic schedule configuration for a given date
   */
  checkSlots: async (date: string, excludeId?: number): Promise<SlotOccupancyResponse> => {
    const params: Record<string, string | number> = { date };
    if (excludeId) params.exclude_id = excludeId;

    const response = await apiClient.get<SlotOccupancyResponse>('/api/check-slots', { params });
    return response.data;
  },

  /**
   * Submits a new appointment booking (Personal or Dependent) using FormData
   */
  createAppointment: async (formData: FormData): Promise<{ success: boolean; appointment: Appointment }> => {
    const response = await apiClient.post<{ success: boolean; appointment: Appointment }>('/appointments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Resubmits a returned, canceled, or expired appointment with updated details
   */
  resubmitAppointment: async (id: number, formData: FormData): Promise<{ success: boolean; message?: string }> => {
    // Laravel method spoofing for multipart updates
    formData.append('_method', 'PUT');

    const response = await apiClient.post<{ success: boolean; message?: string }>(`/appointments/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Cancels a pending, approved, or returned appointment (subject to 24-hr policy)
   */
  cancelAppointment: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>(`/appointments/${id}/cancel`);
    return response.data;
  },

  /**
   * Soft-deletes an expired appointment from patient dashboard view
   */
  softDeleteAppointment: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>(`/appointments/${id}/soft-delete`);
    return response.data;
  },

  /**
   * Forwards released PDF result to an authorized email address
   */
  forwardResultEmail: async (
    id: number,
    targetEmail?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const payload = targetEmail ? { target_email: targetEmail } : {};
    const response = await apiClient.post<{ success: boolean; message?: string }>(
      `/appointments/${id}/forward-email`,
      payload
    );
    return response.data;
  },
};