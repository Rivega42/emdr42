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
    return this.request('/users/me');
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
    return this.request(`/admin/settings/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    });
  }

  async getAdminUsers(
    params?: { page?: number; limit?: number },
  ): Promise<AdminUser[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.request(`/admin/users${qs ? `?${qs}` : ''}`);
  }

  // Achievements
  async getAchievements(): Promise<any[]> {
    return this.request('/achievements');
  }

  async checkAchievements(): Promise<{ unlocked: string[] }> {
    return this.request('/achievements/check', { method: 'POST' });
  }

  // Therapist
  async getMyPatients(
    params?: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<PatientSummary>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.request(`/therapist/patients${qs ? `?${qs}` : ''}`);
  }

  async getPatientSessions(
    patientId: string,
    params?: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<Session>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.request(`/therapist/patients/${patientId}/sessions${qs ? `?${qs}` : ''}`);
  }

  async getPatientProgress(
    patientId: string,
  ): Promise<{ sessions: Session[]; total: number }> {
    return this.request(`/therapist/patients/${patientId}/progress`);
  }

  async getSessionDetail(sessionId: string): Promise<SessionDetail> {
    return this.request(`/sessions/${sessionId}`);
  }

  async addSessionNote(
    sessionId: string,
    content: string,
  ): Promise<any> {
    return this.request(`/therapist/sessions/${sessionId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async getSessionNotes(sessionId: string): Promise<any[]> {
    return this.request(`/therapist/sessions/${sessionId}/notes`);
  }

  // User profile
  async updateProfile(data: { name?: string; settings?: Record<string, any> }): Promise<User> {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // GDPR
  async exportMyData(): Promise<any> {
    return this.request('/users/me').then(async (user: any) => {
      return this.request(`/users/${user.id}/export`);
    });
  }

  async deleteMyData(): Promise<void> {
    return this.request('/users/me').then(async (user: any) => {
      return this.request(`/users/${user.id}/data`, { method: 'DELETE' });
    });
  }
}

export { ApiClient, ApiError };
export const api = new ApiClient();
