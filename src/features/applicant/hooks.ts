import { useState, useEffect, useCallback } from 'react';
import { ApplicantService } from './service';
import { ApiError } from '@/lib/api-error';

export const useApplicantProfile = (applicantId?: string) => {
  const [data, setData] = useState<Awaited<ReturnType<typeof ApplicantService.getProfileDisplayData>> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await ApplicantService.getProfileDisplayData(applicantId);
      setData(profile);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [applicantId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    applicant: data,
    isLoading: loading,
    error,
    refresh: fetchProfile,
  };
};
