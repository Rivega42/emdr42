export type UserRole = 'PATIENT' | 'THERAPIST' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser extends User {
  sessionsCount: number;
  lastActiveAt: string | null;
}

export interface Session {
  id: string;
  userId: string;
  status: 'active' | 'completed' | 'aborted' | 'paused';
  blsPattern: string;
  blsSpeed: number;
  startedAt: string;
  completedAt: string | null;
  durationMinutes: number | null;
  sudsStart: number | null;
  sudsEnd: number | null;
  vocStart: number | null;
  vocEnd: number | null;
  createdAt: string;
}

export interface CreateSessionDto {
  blsPattern?: string;
  blsSpeed?: number;
  targetMemory?: string;
  negCognition?: string;
  posCognition?: string;
  sudsScore?: number;
  vocScore?: number;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PlatformMetrics {
  totalUsers: number;
  activeSessionsNow: number;
  sessionsToday: number;
  safetyAlertsCount: number;
  totalSessions: number;
  completionRate: number;
  avgSessionDuration: number;
  avgSudsReduction: number;
  safetyEventsCount: number;
  sessionStatusBreakdown: {
    completed: number;
    aborted: number;
    paused: number;
  };
  topPatterns: { pattern: string; count: number }[];
  recentSafetyAlerts: SafetyAlert[];
}

export interface SafetyAlert {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  type: 'stress_critical' | 'dissociation' | 'panic' | 'manual_stop';
  message: string;
  createdAt: string;
}

export interface PlatformSetting {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description: string;
  updatedAt: string;
}
