import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: false,
    agreedToAge: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.agreedToTerms) newErrors.terms = 'You must agree to the terms';
    if (!formData.agreedToAge) newErrors.age = 'You must be 18 or older';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsLoading(true);
    // Simulate registration
    setTimeout(() => {
      setIsLoading(false);
      navigate('/onboarding');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-4xl">🧠</span>
            </div>
            <h1 className="text-3xl font-bold text-white">EMDR-AI</h1>
          </Link>
        </div>

        {/* Registration Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Create Your Account</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-white/70 text-sm mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-colors"
                placeholder="John Doe"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-white/70 text-sm mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-colors"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-white/70 text-sm mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-colors"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-white/70 text-sm mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-colors"
                placeholder="••••••••"
              />
              {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>

            <div className="space-y-3">
              <label className="flex items-start text-white/70 text-sm">
                <input
                  name="agreedToAge"
                  type="checkbox"
                  checked={formData.agreedToAge}
                  onChange={handleChange}
                  className="mr-2 mt-1"
                />
                <span>I confirm that I am 18 years or older</span>
              </label>
              {errors.age && <p className="text-red-400 text-sm ml-6">{errors.age}</p>}

              <label className="flex items-start text-white/70 text-sm">
                <input
                  name="agreedToTerms"
                  type="checkbox"
                  checked={formData.agreedToTerms}
                  onChange={handleChange}
                  className="mr-2 mt-1"
                />
                <span>
                  I agree to the{' '}
                  <Link to="/terms" className="text-blue-400 hover:text-blue-300">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>
                </span>
              </label>
              {errors.terms && <p className="text-red-400 text-sm ml-6">{errors.terms}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
            <p className="text-yellow-200 text-sm">
              ⚠️ <strong>Important:</strong> EMDR-AI is a wellness tool and not a replacement for 
              professional mental health care. If you're experiencing severe symptoms or crisis, 
              please seek help from a qualified professional.
            </p>
          </div>

          <p className="mt-6 text-center text-white/60 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;