import { axiosInstance } from '@/lib/axios';
import { Applicant, UpdateApplicantDto, ApplicantProfileResponse } from './types';
 
export const ApplicantApi = {
  getProfile: async (id: string = 'me') => {
    const response = await axiosInstance.get<ApplicantProfileResponse>(`/applicants/${id}`);
    return response.data;
  },

  updateProfile: async (data: UpdateApplicantDto) => {
    const response = await axiosInstance.patch<Applicant>('/applicants/me', data);
    return response.data;
  },

  deleteAccount: () => 
    axiosInstance.delete('/applicants/me'),
};
