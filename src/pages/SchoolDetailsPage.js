// SchoolDetailsPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingProgressBar from '../components/OnboardingProgressBar';

const SchoolDetailsPage = () => {
  const navigate = useNavigate();

  const [schoolDetails, setSchoolDetails] = useState({
    schoolName: '',
    address: '',
    phone: '',
    email: '',
    establishedYear: '',
    motto: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSchoolDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('School Details Submitted:', schoolDetails);
    navigate('/setup/add-users');
  };

  return (
    <div className="min-h-screen bg-blue-50 p-6 flex justify-center items-start">
      <div className="w-full max-w-3xl bg-white p-10 rounded-xl shadow-xl">
        <OnboardingProgressBar />

        <h2 className="text-3xl font-bold text-center text-indigo-700 mb-2">
          Enter School Details
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Start by providing essential information about your school.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="schoolName"
            placeholder="School Name"
            value={schoolDetails.schoolName}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400"
          />

          <input
            type="text"
            name="address"
            placeholder="School Address"
            value={schoolDetails.address}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="tel"
              name="phone"
              placeholder="Contact Phone"
              value={schoolDetails.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400"
            />

            <input
              type="email"
              name="email"
              placeholder="Contact Email"
              value={schoolDetails.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              name="establishedYear"
              placeholder="Established Year"
              value={schoolDetails.establishedYear}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400"
            />

            <input
              type="text"
              name="motto"
              placeholder="School Motto"
              value={schoolDetails.motto}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="flex justify-between items-center border-t pt-6">
            <button
              type="button"
              onClick={() => navigate('/setup')}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Back to Setup Overview
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition"
            >
              Save and Continue →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchoolDetailsPage;
