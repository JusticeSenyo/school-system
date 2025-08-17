import React, { useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';

const CommunicationPage = () => {
  const [form, setForm] = useState({
    recipientGroup: 'parents',
    subject: '',
    message: '',
    sendVia: {
      sms: false,
      email: false,
      dashboard: true,
    },
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleSendVia = (channel) => {
    setForm((prev) => ({
      ...prev,
      sendVia: { ...prev.sendVia, [channel]: !prev.sendVia[channel] },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Connect to backend API or service
    alert('Message sent successfully!');
  };

  return (
    <DashboardLayout title="Communication" subtitle="Send messages to parents or teachers">
      {/* Form Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Send New Message</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipient Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Recipient Group</label>
            <select
              name="recipientGroup"
              value={form.recipientGroup}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="parents">Parents</option>
              <option value="teachers">Teachers</option>
              <option value="all">All (Parents & Teachers)</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
            <input
              type="text"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={5}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Send Via */}
          <div className="flex flex-wrap gap-4 mt-4">
            {['sms', 'email', 'dashboard'].map((channel) => (
              <label key={channel} className="inline-flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.sendVia[channel]}
                  onChange={() => toggleSendVia(channel)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded"
                />
                <span>{channel.toUpperCase()}</span>
              </label>
            ))}
          </div>

          {/* Submit */}
          <div className="mt-6">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-medium shadow"
            >
              Send Message
            </button>
          </div>
        </form>
      </div>

      {/* Recent Messages */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Recent Messages</h2>
        <ul className="space-y-3">
          {[1, 2, 3].map((_, i) => (
            <li key={i} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <div className="text-sm text-gray-800 dark:text-gray-100">
                <strong>To:</strong> Parents &nbsp;|&nbsp;
                <strong>Via:</strong> Email, Dashboard
              </div>
              <div className="text-sm mt-1 text-gray-600 dark:text-gray-300">
                Meeting Reminder for PTA - This Friday 3PM.
              </div>
              <div className="text-xs text-gray-400 mt-1">Sent on: 2024-01-20 10:00AM</div>
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
};

export default CommunicationPage;
