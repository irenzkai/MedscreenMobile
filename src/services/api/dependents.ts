import { apiClient } from './client';
import { Dependent, Sex } from '../../types';

export interface CreateDependentPayload {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  birthdate: string;
  sex: Sex;
  street: string;
  barangay: string;
  city: string;
  province: string;
  inherit_address?: boolean;
}

export type UpdateDependentPayload = CreateDependentPayload;

export const dependentsApi = {
  /**
   * Retrieves all active and archived family dependents for the logged-in patient
   */
  getDependents: async (): Promise<{ active: Dependent[]; archived: Dependent[] }> => {
    const response = await apiClient.get<{ dependents?: Dependent[]; archived?: Dependent[] }>('/dependents');
    const active = response.data.dependents || [];
    const archived = response.data.archived || [];
    return { active, archived };
  },

  /**
   * Registers a new child dependent (minor under 18)
   */
  createDependent: async (payload: CreateDependentPayload): Promise<Dependent> => {
    const response = await apiClient.post<Dependent>('/dependents', payload);
    return response.data;
  },

  /**
   * Updates existing dependent information
   */
  updateDependent: async (id: number, payload: UpdateDependentPayload): Promise<Dependent> => {
    const response = await apiClient.put<Dependent>(`/dependents/${id}`, payload);
    return response.data;
  },

  /**
   * Deactivates / soft-deletes a dependent record
   */
  deleteDependent: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.delete<{ success: boolean; message?: string }>(`/dependents/${id}`);
    return response.data;
  },

  /**
   * Restores an archived dependent record
   */
  restoreDependent: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>(`/dependents/${id}/restore`);
    return response.data;
  },
};