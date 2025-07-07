import React from 'react';
import { useLocation } from 'react-router-dom';

const steps = [
  { label: 'Users', path: '/setup/add-users' },
  { label: 'Classes', path: '/setup/classes-subjects' },
  { label: 'Fees', path: '/setup/fees' },
  { label: 'Students', path: '/setup/students' },
  { label: 'Complete', path: '/setup/complete' },
];

const OnboardingProgressBar = () => {
  const { pathname } = useLocation();
  const currentIndex = steps.findIndex((step) => pathname.startsWith(step.path));

  const progressPercent = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="mb-10">
      {/* Step Indicators */}
      <div className="flex justify-between items-center text-xs font-medium text-gray-600 mb-4">
        {steps.map((step, idx) => {
          const isActive = idx === currentIndex;
          const isCompleted = idx < currentIndex;

          return (
            <div key={step.path} className="flex-1 text-center">
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-indigo-600 text-white scale-110 shadow-md'
                    : isCompleted
                    ? 'bg-indigo-200 text-indigo-800'
                    : 'bg-gray-300 text-white'
                }`}
                title={step.label}
              >
                {idx + 1}
              </div>
              <div
                className={`mt-1 ${
                  isActive ? 'text-indigo-700 font-semibold' : 'text-gray-400'
                }`}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-gray-200 rounded overflow-hidden">
        <div
          className="absolute left-0 top-0 h-2 bg-indigo-600 rounded transition-all duration-500 ease-in-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};

export default OnboardingProgressBar;
