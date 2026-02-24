import { useState, useEffect } from 'react';
import { AdminService } from './service';
import { AdminDashboardResponse } from './types';
import { ApiError } from '@/lib/api-error';

export const useAdminDashboard = () => {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const result = await AdminService.getDashboardOverview();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err as ApiError);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return { data, isLoading, error };
};
