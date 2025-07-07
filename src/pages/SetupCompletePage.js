import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const SetupCompletePage = () => {
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="text-green-500 w-16 h-16" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Setup Complete! 🎉</h2>
        <p className="text-gray-600 mb-6">
          Your school has been successfully set up. You and your team can now start managing classes, students, and activities through your dashboards.
        </p>
        <button
          onClick={handleGoToDashboard}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default SetupCompletePage;
