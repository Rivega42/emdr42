'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { AdminUser, UserRole } from '@/lib/types';

const ROLES: UserRole[] = ['PATIENT', 'THERAPIST', 'ADMIN'];
const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const { hasRole } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => { if (!hasRole('ADMIN')) { router.push('/dashboard'); return; } const load = async () => { try { const data = await api.getAdminUsers(); setUsers(data); } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load users'); } finally { setLoading(false); } }; load(); }, [hasRole, router]);

  const filtered = useMemo(() => { let result = users; if (roleFilter !== 'ALL') result = result.filter((u) => u.role === roleFilter); if (search.trim()) { const q = search.toLowerCase(); result = result.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)); } return result; }, [users, roleFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, roleFilter]);

  const handleRoleChange = (userId: string, newRole: UserRole) => { setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))); };
  const handleToggleActive = (userId: string) => { setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: !u.isActive } : u)); };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" /></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Управление пользователями</h1>
        <p className="text-gray-500">Всего: {filtered.length}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Поиск по имени или email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Поиск пользователей"
          className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | 'ALL')}
          aria-label="Фильтр по роли"
          className="px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
        >
          <option value="ALL">Все роли</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Имя</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Email</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Роль</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Сессий</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Был в сети</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Статус</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((user, i) => (
                <tr key={user.id} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                  <td className="px-6 py-4 text-gray-900 font-medium">{user.name}</td>
                  <td className="px-6 py-4 text-gray-500">{user.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                      aria-label={`Роль пользователя ${user.name}`}
                      className="px-2 py-1 bg-white border border-gray-300 rounded-md text-gray-900 text-sm focus:outline-none focus:border-gray-900"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{user.sessionsCount}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString('ru-RU') : 'Никогда'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(user.id)}
                      aria-label={`Переключить статус ${user.name}`}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        user.isActive
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {user.isActive ? 'Активен' : 'Неактивен'}
                    </button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Пользователей не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <span className="text-gray-400 text-sm">Страница {page} из {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Назад
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Вперёд
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
