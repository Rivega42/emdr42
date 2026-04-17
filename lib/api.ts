import type {
  User,
  RegisterDto,
  Session,
  CreateSessionDto,
  PaginatedResponse,
  PlatformMetrics,
  PlatformSetting,
  AdminUser,
  PatientSummary,
  SessionDetail,
} from './types';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(res.status, body.message || res.statusText);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  // Auth
  async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(
    data: RegisterDto,
  ): Promise<{ access_token: string; user: User }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile(): Promise<User> {
    return this.request('/auth/profile');
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  // Sessions
  async getSessions(
    params?: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<Session>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.request(`/sessions${qs ? `?${qs}` : ''}`);
  }

  async getSession(id: string): Promise<Session> {
    return this.request(`/sessions/${id}`);
  }

  async createSession(data: CreateSessionDto): Promise<Session> {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Admin
  async getMetrics(): Promise<PlatformMetrics> {
    return this.request('/admin/metrics');
  }

  async getSettings(): Promise<PlatformSetting[]> {
    return this.request('/admin/settings');
  }

  async updateSetting(
    key: string,
    value: unknown,
  ): Promise<PlatformSetting> {
    return this.request('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ key, value }),
    });
  }

  async getAdminUsers(): Promise<AdminUser[]> {
    return this.request('/admin/users');
  }

  // Therapist
  async getMyPatients(): Promise<PatientSummary[]> {
    return this.request('/users?role=PATIENT');
  }

  async getPatientSessions(patientId: string): Promise<Session[]> {
    return this.request(`/users/${patientId}/sessions`);
  }

  async getSessionDetail(sessionId: string): Promise<SessionDetail> {
    return this.request(`/sessions/${sessionId}`);
  }

  async updateSessionNotes(
    sessionId: string,
    notes: string,
  ): Promise<void> {
    return this.request(`/sessions/${sessionId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
  }

  // Analytics (#125)
  async getMyAnalytics(params?: { from?: string; to?: string }): Promise<{
    totalSessions: number;
    completed: number;
    aborted: number;
    completionRate: number;
    avgSudsReduction: number;
    avgVocGain: number;
    avgDurationSec: number;
    sessions: Array<{
      id: string;
      startedAt: string | null;
      durationSec: number | null;
      sudsBaseline: number | null;
      sudsFinal: number | null;
      vocBaseline: number | null;
      vocFinal: number | null;
    }>;
  }> {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    return this.request(`/analytics/me/sessions${qs.toString() ? `?${qs}` : ''}`);
  }

  async getPatientAnalyticsSummary(patientId: string) {
    return this.request(`/analytics/patients/${patientId}/summary`);
  }

  // Gamification (#89)
  async getMyProgress(): Promise<{
    xp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    xpToNextLevel: number;
    achievements: Array<{
      key: string;
      title: string;
      description: string;
      icon: string;
      unlockedAt: string;
    }>;
    locked: Array<{ key: string; title: string; description: string; icon: string }>;
  }> {
    return this.request('/gamification/me');
  }

  // Usage / billing (#130, #145)
  async getMyUsage(days = 30): Promise<{
    totalCostUsd: number;
    byProvider: Record<string, { totalCost: number; count: number }>;
    totalEvents: number;
  }> {
    return this.request(`/usage/me?days=${days}`);
  }

  async getMySubscription(): Promise<{
    plan: string;
    status: string;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    invoices?: Array<{
      id: string;
      amountCents: number;
      currency: string;
      status: string;
      hostedInvoiceUrl?: string | null;
      paidAt?: string | null;
      createdAt: string;
    }>;
  }> {
    return this.request('/billing/subscription');
  }

  async getBillingPlans(): Promise<Array<{
    id: string;
    name: string;
    priceCentsMonthly: number;
    features: string[];
    role: string;
  }>> {
    return this.request('/billing/plans');
  }

  async createCheckout(planId: string): Promise<{ checkoutUrl: string }> {
    return this.request(`/billing/checkout/${planId}`, { method: 'POST' });
  }

  // Crisis
  async getCrisisHotlines(): Promise<{
    country: string;
    emergencyNumber: string;
    hotlines: Array<{
      name: string;
      phone: string;
      sms?: string;
      online?: string;
      languages: string[];
      available247: boolean;
    }>;
  }> {
    return this.request('/crisis/hotlines');
  }
}

export { ApiClient, ApiError };
export const api = new ApiClient();
