// src/pages/Settings.js
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  ArrowLeft, Settings as SettingsIcon, Bell, Shield, Moon, Globe,
  LogOut, Save, Eye, EyeOff, Smartphone, Mail as MailIcon, KeyRound, Download,
} from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout, apiCall } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // hydrate from user profile if available
  const initial = useMemo(() => ({
    notifications: user?.settings?.notifications ?? {
      email: true, push: false, sms: false, assignments: true, grades: true, announcements: true,
    },
    privacy: user?.settings?.privacy ?? {
      profileVisible: true, showOnlineStatus: false, allowMessages: true,
    },
    preferences: user?.settings?.preferences ?? {
      darkMode: theme === 'dark',
      language: 'en',
      timezone: 'UTC+0', // Africa/Accra ~ UTC+0
    },
  }), [user, theme]);

  const [notifications, setNotifications] = useState(initial.notifications);
  const [privacy, setPrivacy] = useState(initial.privacy);
  const [preferences, setPreferences] = useState(initial.preferences);

  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState({ kind: '', msg: '' });

  // Change Password modal
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState({ current: '', next: '', show: false });
  const canChangePwd = pwd.current.length >= 6 && pwd.next.length >= 8;

  useEffect(() => {
    // keep UI toggle in sync if theme changes elsewhere
    setPreferences(p => ({ ...p, darkMode: theme === 'dark' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const handleSaveSettings = async () => {
    setLoading(true);
    setBanner({ kind: '', msg: '' });
    try {
      const payload = { notifications, privacy, preferences: { ...preferences } };

      // ensure theme context reflects user choice immediately
      if ((preferences.darkMode && theme !== 'dark') || (!preferences.darkMode && theme === 'dark')) {
        toggleTheme();
      }

      const response = await apiCall('/profile/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response?.success) {
        setBanner({ kind: 'success', msg: 'Settings saved successfully.' });
      } else {
        throw new Error(response?.error || 'Failed to save settings.');
      }
    } catch (err) {
      setBanner({ kind: 'error', msg: err.message || 'Failed to save settings.' });
    } finally {
      setLoading(false);
      setTimeout(() => setBanner({ kind: '', msg: '' }), 4000);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
    }
  };

  const handleDownloadData = async () => {
    try {
      // You can replace this with an API export endpoint
      const payload = {
        profile: {
          id: user?.id, role: user?.userType, schoolId: user?.schoolId, email: user?.email,
        },
        settings: { notifications, privacy, preferences },
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schoolmasterhub_mydata_${user?.id || 'user'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBanner({ kind: 'success', msg: 'Your data file has been generated.' });
      setTimeout(() => setBanner({ kind: '', msg: '' }), 3000);
    } catch (e) {
      setBanner({ kind: 'error', msg: 'Unable to prepare data for download.' });
      setTimeout(() => setBanner({ kind: '', msg: '' }), 3000);
    }
  };

  const openPwd = () => setPwdOpen(true);
  const closePwd = () => { setPwdOpen(false); setPwd({ current: '', next: '', show: false }); };

  const submitPassword = async () => {
    if (!canChangePwd) return;
    setLoading(true);
    try {
      const res = await apiCall('/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.next }),
      });
      if (res?.success) {
        setBanner({ kind: 'success', msg: 'Password updated successfully.' });
        closePwd();
      } else {
        throw new Error(res?.error || 'Password change failed.');
      }
    } catch (e) {
      setBanner({ kind: 'error', msg: e.message || 'Password change failed.' });
    } finally {
      setLoading(false);
      setTimeout(() => setBanner({ kind: '', msg: '' }), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 inline-flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving…' : 'Save All'}
          </button>
        </div>

        {/* Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <SettingsIcon className="h-6 w-6 mr-3 text-blue-600" />
                  Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage your account preferences and privacy settings
                </p>
              </div>
              {banner.msg && (
                <div
                  className={`px-3 py-2 rounded-lg text-sm ${
                    banner.kind === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {banner.msg}
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Notification Settings */}
              <div className="space-y-6">
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <Bell className="h-5 w-5 mr-2 text-orange-600" />
                    Notifications
                  </h3>

                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Delivery Methods</h4>
                      <ToggleRow
                        icon={<MailIcon className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-300" />}
                        label="Email notifications"
                        checked={notifications.email}
                        onChange={(v) => setNotifications({ ...notifications, email: v })}
                      />
                      <ToggleRow
                        icon={<Smartphone className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-300" />}
                        label="Push notifications"
                        checked={notifications.push}
                        onChange={(v) => setNotifications({ ...notifications, push: v })}
                      />
                      <ToggleRow
                        label="SMS notifications"
                        checked={notifications.sms}
                        onChange={(v) => setNotifications({ ...notifications, sms: v })}
                      />
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Content Types</h4>
                      <ToggleRow
                        label="Assignment updates"
                        checked={notifications.assignments}
                        onChange={(v) => setNotifications({ ...notifications, assignments: v })}
                      />
                      <ToggleRow
                        label="Grade notifications"
                        checked={notifications.grades}
                        onChange={(v) => setNotifications({ ...notifications, grades: v })}
                      />
                      <ToggleRow
                        label="School announcements"
                        checked={notifications.announcements}
                        onChange={(v) => setNotifications({ ...notifications, announcements: v })}
                      />
                    </div>
                  </div>
                </section>

                {/* Privacy Settings */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-green-600" />
                    Privacy & Security
                  </h3>

                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                    <ToggleRow
                      label="Profile Visibility"
                      description="Make your profile visible to other users"
                      checked={privacy.profileVisible}
                      onChange={(v) => setPrivacy({ ...privacy, profileVisible: v })}
                    />
                    <ToggleRow
                      label="Online Status"
                      description="Show when you're online"
                      checked={privacy.showOnlineStatus}
                      onChange={(v) => setPrivacy({ ...privacy, showOnlineStatus: v })}
                    />
                    <ToggleRow
                      label="Direct Messages"
                      description="Allow others to send you messages"
                      checked={privacy.allowMessages}
                      onChange={(v) => setPrivacy({ ...privacy, allowMessages: v })}
                    />
                  </div>
                </section>
              </div>

              {/* Preferences and Account */}
              <div className="space-y-6">
                {/* Display Preferences */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <Moon className="h-5 w-5 mr-2 text-purple-600" />
                    Display & Language
                  </h3>

                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-4">
                    <ToggleRow
                      label="Dark Mode"
                      checked={preferences.darkMode}
                      onChange={(v) => {
                        setPreferences({ ...preferences, darkMode: v });
                        // toggle immediately for better UX
                        if ((v && theme !== 'dark') || (!v && theme === 'dark')) toggleTheme();
                      }}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Language
                      </label>
                      <select
                        value={preferences.language}
                        onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                        className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="fr">French</option>
                        <option value="es">Spanish</option>
                        <option value="de">German</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timezone
                      </label>
                      <select
                        value={preferences.timezone}
                        onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                        className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {/* include Ghana explicitly */}
                        <option value="UTC+0">Greenwich Mean Time (UTC+0) — Ghana</option>
                        <option value="UTC-8">Pacific Time (UTC-8)</option>
                        <option value="UTC-5">Eastern Time (UTC-5)</option>
                        <option value="UTC+1">Central European Time (UTC+1)</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Account Actions */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Account Actions
                  </h3>

                  <div className="space-y-3">
                    <button
                      onClick={openPwd}
                      className="w-full text-left p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                            <KeyRound className="h-5 w-5" />
                            Change Password
                          </span>
                          <p className="text-sm text-blue-700 dark:text-blue-300">Update your account password</p>
                        </div>
                        <Eye className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                      </div>
                    </button>

                    <button
                      onClick={handleDownloadData}
                      className="w-full text-left p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Download className="h-5 w-5" />
                            Download My Data
                          </span>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Export your account information</p>
                        </div>
                        <Globe className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      </div>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left p-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-red-900 dark:text-red-100 flex items-center gap-2">
                            <LogOut className="h-5 w-5" />
                            Sign Out
                          </span>
                          <p className="text-sm text-red-700 dark:text-red-300">Sign out of your account</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </section>

                {/* Account Info */}
                <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Account Information</h4>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <p>User ID: {user?.id || '—'}</p>
                    <p>Role: {user?.userType}{user?.originalRole ? ` (${user?.originalRole})` : ''}</p>
                    <p>School: {user?.schoolId || '—'}</p>
                    <p>Account Status: Active</p>
                    {user?.isDemoMode && <p>Mode: Demo Mode Enabled</p>}
                  </div>
                </section>

                {/* API Information */}
                <section className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">API Information</h4>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <p>Connected to Oracle Cloud</p>
                    <p>Token: {user ? 'Active' : 'Inactive'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      All data is synchronized with your school's database.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Save on Mobile */}
        <div className="lg:hidden fixed bottom-4 right-4">
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="shadow-lg bg-blue-600 text-white px-5 py-3 rounded-full hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {pwdOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <KeyRound className="h-5 w-5" /> Change Password
              </h3>
              <button
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={closePwd}
                aria-label="Close"
              >
                <EyeOff className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Password
                </label>
                <input
                  type={pwd.show ? 'text' : 'password'}
                  value={pwd.current}
                  onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type={pwd.show ? 'text' : 'password'}
                  value={pwd.next}
                  onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900"
                  placeholder="Minimum 8 characters"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Use 8+ characters with a mix of letters, numbers, and symbols.
                </p>
              </div>

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pwd.show}
                  onChange={(e) => setPwd({ ...pwd, show: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show passwords</span>
              </label>
            </div>

            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={closePwd}
                className="px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={submitPassword}
                disabled={!canChangePwd || loading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* --- Small components --- */
const ToggleRow = ({ icon, label, description, checked, onChange }) => (
  <label className="flex items-start justify-between py-2">
    <div>
      <span className="text-gray-800 dark:text-gray-200 font-medium flex items-center">
        {icon || null}
        {label}
      </span>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
  </label>
);

export default Settings;
