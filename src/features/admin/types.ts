export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin';
  permissions: string[];
  createdAt: string;
}

export interface AdminStats {
  totalApplicants: number;
  pendingReviews: number;
  activeSessions: number;
}

export interface RecentAction {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface AdminDashboardResponse {
  stats: AdminStats;
  recentActions: RecentAction[];
  isHealthy: boolean;
  lastUpdated: string;
}
