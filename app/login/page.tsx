'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push('/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="w-20 h-20 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-4xl">🧠</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">EMDR-AI</h1>
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Welcome Back</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-gray-500 text-sm mb-2">Email Address</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors" placeholder="you@example.com" />
            </div>
            <div>
              <label htmlFor="password" className="block text-gray-500 text-sm mb-2">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors" placeholder="••••••••" />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center text-gray-500 text-sm">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="mr-2" />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-gray-900 text-sm hover:underline">Forgot password?</Link>
            </div>
            <button type="submit" disabled={isLoading} className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">Or continue with</span></div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center px-4 py-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"><span className="text-gray-700">Google</span></button>
              <button className="flex items-center justify-center px-4 py-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"><span className="text-gray-700">GitHub</span></button>
            </div>
          </div>

          <p className="mt-8 text-center text-gray-400 text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-gray-900 hover:underline">Sign up for free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
