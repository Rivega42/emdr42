'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword: password }) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message || 'Failed to reset password'); }
      setSuccess(true);
    } catch (err: any) { setError(err.message || 'Something went wrong'); } finally { setIsLoading(false); }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-900 text-lg mb-4">Invalid or missing reset token.</p>
          <Link href="/forgot-password" className="text-gray-900 hover:underline">Request a new reset link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><h1 className="text-3xl font-bold text-gray-900">Set New Password</h1></div>
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          {success ? (
            <div className="text-center">
              <p className="text-gray-900 text-lg mb-4">Your password has been reset successfully.</p>
              <Link href="/login" className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md inline-block transition-colors">Sign In</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">{error}</div>}
              <div>
                <label htmlFor="password" className="block text-gray-500 text-sm mb-2">New Password</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors" placeholder="••••••••" />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-gray-500 text-sm mb-2">Confirm Password</label>
                <input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors disabled:opacity-50">{isLoading ? 'Resetting...' : 'Reset Password'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
