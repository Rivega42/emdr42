'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', agreedToTerms: false, agreedToAge: false });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.agreedToTerms) newErrors.terms = 'You must agree to the terms';
    if (!formData.agreedToAge) newErrors.age = 'You must be 18 or older';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); router.push('/dashboard'); }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="w-20 h-20 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4"><span className="text-white text-4xl">🧠</span></div>
            <h1 className="text-3xl font-bold text-gray-900">EMDR-AI</h1>
          </Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Create Your Account</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-gray-500 text-sm mb-2">Full Name</label>
              <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors" placeholder="John Doe" />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="email" className="block text-gray-500 text-sm mb-2">Email Address</label>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors" placeholder="you@example.com" />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="password" className="block text-gray-500 text-sm mb-2">Password</label>
              <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors" placeholder="••••••••" />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-gray-500 text-sm mb-2">Confirm Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors" placeholder="••••••••" />
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>
            <div className="space-y-3">
              <label className="flex items-start text-gray-500 text-sm"><input name="agreedToAge" type="checkbox" checked={formData.agreedToAge} onChange={handleChange} className="mr-2 mt-1" /><span>I confirm that I am 18 years or older</span></label>
              {errors.age && <p className="text-red-500 text-sm ml-6">{errors.age}</p>}
              <label className="flex items-start text-gray-500 text-sm"><input name="agreedToTerms" type="checkbox" checked={formData.agreedToTerms} onChange={handleChange} className="mr-2 mt-1" /><span>I agree to the Terms of Service and Privacy Policy</span></label>
              {errors.terms && <p className="text-red-500 text-sm ml-6">{errors.terms}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isLoading ? 'Creating Account...' : 'Create Account'}</button>
          </form>
          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200"><p className="text-amber-800 text-sm"><strong>Important:</strong> EMDR-AI is a wellness tool and not a replacement for professional mental health care.</p></div>
          <p className="mt-6 text-center text-gray-400 text-sm">Already have an account?{' '}<Link href="/login" className="text-gray-900 hover:underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
