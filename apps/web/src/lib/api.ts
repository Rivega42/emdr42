interface User {
  id: string;
  email: string;
  name: string;
  role: 'PATIENT' | 'THERAPIST' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || import.meta.env.VITE_API_URL || 'http://localhost:3001';
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
      throw new Error(body.message || res.statusText);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

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
}

export const api = new ApiClient();
