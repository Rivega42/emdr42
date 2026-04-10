import type { User, Session, GetSessionsParams, UpdateProfileData } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const fetchJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
};

export const api = {
  // Sessions
  getSessions: (params?: GetSessionsParams): Promise<Session[]> => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return fetchJson<Session[]>(`/sessions${qs ? `?${qs}` : ''}`);
  },

  getSession: (id: string): Promise<Session> => {
    return fetchJson<Session>(`/sessions/${id}`);
  },

  // User profile
  getProfile: (): Promise<User> => {
    return fetchJson<User>('/users/me');
  },

  updateProfile: (data: UpdateProfileData): Promise<User> => {
    return fetchJson<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Data management
  deleteAllData: (): Promise<void> => {
    return fetchJson<void>('/users/me/data', {
      method: 'DELETE',
    });
  },
};
