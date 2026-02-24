import { AdminApi } from './api';
import { AdminDashboardResponse } from './types';

export const AdminService = {
  async getDashboardOverview(): Promise<AdminDashboardResponse> {
    const data = await AdminApi.getDashboardStats();
    
    return {
      stats: data.stats,
      recentActions: data.recentActions || [],
      isHealthy: data.stats.pendingReviews < 50,
      lastUpdated: new Date().toISOString(),
    };
  }
};
