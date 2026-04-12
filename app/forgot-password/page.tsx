'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><h1 className="text-3xl font-bold text-gray-900">Reset Password</h1></div>
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          {submitted ? (
            <div className="text-center">
              <p className="text-gray-900 text-lg mb-4">If an account with that email exists, we sent a password reset link.</p>
              <Link href="/login" className="text-gray-900 hover:underline">Back to Sign In</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-gray-500 text-sm mb-4">Enter your email address and we will send you a link to reset your password.</p>
              <div>
                <label htmlFor="email" className="block text-gray-500 text-sm mb-2">Email Address</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors" placeholder="you@example.com" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors disabled:opacity-50">{isLoading ? 'Sending...' : 'Send Reset Link'}</button>
              <p className="text-center text-gray-400 text-sm"><Link href="/login" className="text-gray-900 hover:underline">Back to Sign In</Link></p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
