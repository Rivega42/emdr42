export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface Session {
  id: string;
  userId: string;
  date: string;
  duration: number; // in seconds
  pattern: string;
  sudsStart?: number;
  sudsEnd?: number;
  status: 'completed' | 'interrupted' | 'in-progress';
  notes?: string;
}

export interface PlatformMetrics {
  totalSessions: number;
  totalTime: number; // in seconds
  avgSudsReduction: number;
  streak: number;
}

export interface GetSessionsParams {
  limit?: number;
  offset?: number;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
}
