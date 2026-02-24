import { ApplicantApi } from './api';
export const ApplicantService = {
  async getProfileDisplayData(applicantId?: string) {
    const data = await ApplicantApi.getProfile(applicantId);
    const { applicant } = data;

    return {
      ...applicant,
      fullName: `${applicant.firstName} ${applicant.lastName}`.trim(),
      displayEmail: applicant.email.toLowerCase(),
      formattedJoinDate: new Date(applicant.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      stats: data.stats,
    };
  },

  async updateProfile(id: string, updates: Record<string, unknown>) {
    return await ApplicantApi.updateProfile(updates);
  }
};
