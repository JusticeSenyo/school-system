// components/LoadingSpinner.js
import React from 'react';
import { GraduationCap } from 'lucide-react';

const LoadingSpinner = ({ size = 'medium', color = 'blue', showLogo = false }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    gray: 'text-gray-400',
    white: 'text-white',
    green: 'text-green-600',
    purple: 'text-purple-600'
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {showLogo && (
        <div className="mb-4 p-3 bg-blue-100 rounded-xl">
          <GraduationCap className="h-8 w-8 text-blue-600" />
        </div>
      )}
      <svg
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  );
};

export default LoadingSpinner;