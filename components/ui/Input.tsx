import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, id, className = '', ...props }) => (
  <div>
    {label && (
      <label htmlFor={id} className="block text-gray-500 text-sm mb-2">
        {label}
      </label>
    )}
    <input
      id={id}
      className={`w-full px-4 py-3 bg-white border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
        error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-gray-900'
      } ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
  </div>
);
