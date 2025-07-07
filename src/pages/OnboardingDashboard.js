import React from 'react';
import { useNavigate } from 'react-router-dom';

const steps = [
  { label: 'Add School Details', path: '/setup/school-details' },
  { label: 'Add Users & Assign Roles', path: '/setup/add-users' },
  { label: 'Add Classes & Subjects', path: '/setup/classes-subjects' },
  { label: 'Set Up Fees & Billing', path: '/setup/fees' },
  { label: 'Add Students', path: '/setup/students' },
];

const OnboardingDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-6 flex items-center justify-center">
      <div className="bg-white shadow-xl rounded-xl p-8 max-w-3xl w-full">
        <h2 className="text-2xl font-bold text-center mb-6">
          🎉 Welcome! Let’s set up your school
        </h2>

        <ul className="space-y-4">
          {steps.map((step, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg hover:bg-blue-50 transition"
            >
              <span className="font-medium text-gray-800">{step.label}</span>
              <button
                onClick={() => navigate(step.path)}
                className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700 text-sm"
              >
                Start
              </button>
            </li>
          ))}
        </ul>

        <div className="text-center text-sm text-gray-500 mt-6">
          You are on a <span className="font-medium text-indigo-600">14-day free trial</span>. Upgrade anytime.
        </div>
      </div>
    </div>
  );
};

export default OnboardingDashboard;
