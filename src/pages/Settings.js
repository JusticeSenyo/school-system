// pages/Settings.js - Fixed for your AuthContext
import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { 
  Settings as SettingsIcon, Bell, Shield, Moon, Globe, 
  LogOut, Save, Eye, EyeOff, Smartphone, Mail as MailIcon
} from 'lucide-react';

const Settings = () => {
  const { user, logout, apiCall } = useAuth(); // Using your AuthContext structure
  const [loading, setLoading] = useState(false);
  
  // Notification preferences
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
    assignments: true,
    grades: true,
    announcements: true
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    showOnlineStatus: false,
    allowMessages: true
  });

  // Theme and display
  const [preferences, setPreferences] = useState({
    darkMode: false,
    language: 'en',
    timezone: 'UTC-5'
  });

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Using your apiCall function to save settings
      const response = await apiCall('/profile/settings', {
        method: 'PUT',
        body: JSON.stringify({
          notifications,
          privacy,
          preferences
        })
      });
      
      if (response.success) {
        alert('Settings saved successfully!');
      } else {
        throw new Error(response.error || 'Failed to save settings');
      }
    } catch (error) {
      alert('Failed to save settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <SettingsIcon className="h-6 w-6 mr-3 text-blue-600" />
                  Settings
                </h1>
                <p className="text-gray-600 mt-1">Manage your account preferences and privacy settings</p>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Notification Settings */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Bell className="h-5 w-5 mr-2 text-orange-600" />
                    Notifications
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Delivery Methods</h4>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <div className="flex items-center">
                            <MailIcon className="h-4 w-4 mr-2 text-gray-600" />
                            <span className="text-gray-700">Email notifications</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifications.email}
                            onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Smartphone className="h-4 w-4 mr-2 text-gray-600" />
                            <span className="text-gray-700">Push notifications</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={notifications.push}
                            onChange={(e) => setNotifications({...notifications, push: e.target.checked})}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-gray-700">SMS notifications</span>
                          <input
                            type="checkbox"
                            checked={notifications.sms}
                            onChange={(e) => setNotifications({...notifications, sms: e.target.checked})}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Content Types</h4>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <span className="text-gray-700">Assignment updates</span>
                          <input
                            type="checkbox"
                            checked={notifications.assignments}
                            onChange={(e) => setNotifications({...notifications, assignments: e.target.checked})}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-gray-700">Grade notifications</span>
                          <input
                            type="checkbox"
                            checked={notifications.grades}
                            onChange={(e) => setNotifications({...notifications, grades: e.target.checked})}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-gray-700">School announcements</span>
                          <input
                            type="checkbox"
                            checked={notifications.announcements}
                            onChange={(e) => setNotifications({...notifications, announcements: e.target.checked})}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Privacy Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-green-600" />
                    Privacy & Security
                  </h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-3">
                      <label className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-700 font-medium">Profile Visibility</span>
                          <p className="text-sm text-gray-500">Make your profile visible to other users</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacy.profileVisible}
                          onChange={(e) => setPrivacy({...privacy, profileVisible: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                      <label className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-700 font-medium">Online Status</span>
                          <p className="text-sm text-gray-500">Show when you're online</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacy.showOnlineStatus}
                          onChange={(e) => setPrivacy({...privacy, showOnlineStatus: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                      <label className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-700 font-medium">Direct Messages</span>
                          <p className="text-sm text-gray-500">Allow others to send you messages</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacy.allowMessages}
                          onChange={(e) => setPrivacy({...privacy, allowMessages: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preferences and Account */}
              <div className="space-y-6">
                {/* Display Preferences */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Moon className="h-5 w-5 mr-2 text-purple-600" />
                    Display & Language
                  </h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <label className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">Dark Mode</span>
                      <input
                        type="checkbox"
                        checked={preferences.darkMode}
                        onChange={(e) => setPreferences({...preferences, darkMode: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={preferences.language}
                        onChange={(e) => setPreferences({...preferences, language: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={preferences.timezone}
                        onChange={(e) => setPreferences({...preferences, timezone: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="UTC-8">Pacific Time (UTC-8)</option>
                        <option value="UTC-5">Eastern Time (UTC-5)</option>
                        <option value="UTC+0">Greenwich Mean Time (UTC+0)</option>
                        <option value="UTC+1">Central European Time (UTC+1)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Account Actions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
                  
                  <div className="space-y-3">
                    <button className="w-full text-left p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-blue-900">Change Password</span>
                          <p className="text-sm text-blue-700">Update your account password</p>
                        </div>
                        <Eye className="h-5 w-5 text-blue-600" />
                      </div>
                    </button>
                    
                    <button className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900">Download My Data</span>
                          <p className="text-sm text-gray-600">Export your account information</p>
                        </div>
                        <Globe className="h-5 w-5 text-gray-600" />
                      </div>
                    </button>
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-red-900">Sign Out</span>
                          <p className="text-sm text-red-700">Sign out of your account</p>
                        </div>
                        <LogOut className="h-5 w-5 text-red-600" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Account Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Account Information</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>User ID: {user?.id}</p>
                    <p>Role: {user?.userType} ({user?.originalRole})</p>
                    <p>School: {user?.schoolId}</p>
                    <p>Account Status: Active</p>
                    {user?.isDemoMode && <p>Mode: Demo Mode Enabled</p>}
                  </div>
                </div>

                {/* API Information */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">API Information</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>Connected to Oracle Cloud</p>
                    <p>Token: {user ? 'Active' : 'Inactive'}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      All data is synchronized with your school's database
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;