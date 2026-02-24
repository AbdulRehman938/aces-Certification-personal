import { axiosInstance } from '@/lib/axios';
import { AdminDashboardResponse } from './types';
export const AdminApi = {
  getDashboardStats: async () => {
    const response = await axiosInstance.get<AdminDashboardResponse>('/admin/stats');
    return response.data;
  },

  getAllApplicants: async () => {
    const response = await axiosInstance.get('/admin/applicants');
    return response.data;
  },
};
