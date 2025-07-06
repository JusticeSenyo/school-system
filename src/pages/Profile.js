// pages/Profile.js - Fixed for your AuthContext
import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { 
  User, Mail, Phone, MapPin, Calendar, Edit3, Save, X, 
  Camera, GraduationCap, Award, BookOpen, Users 
} from 'lucide-react';

const Profile = () => {
  const { user, apiCall } = useAuth(); // Using your AuthContext structure
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    bio: user?.bio || ''
  });

  // Since your AuthContext doesn't have updateProfile, we'll create one using apiCall
  const updateProfile = async (data) => {
    try {
      // Using your apiCall function to update profile
      const response = await apiCall('/profile/update', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      
      if (response.success) {
        return { success: true };
      } else {
        throw new Error(response.error || 'Update failed');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Mock file upload - replace with your actual upload logic
      console.log('Uploading avatar:', file);
      alert('Avatar upload functionality will be implemented with your API');
    } catch (error) {
      alert('Failed to upload avatar');
    }
  };

  const getRoleIcon = (userType) => {
    switch (userType) {
      case 'teacher': return <BookOpen className="h-5 w-5" />;
      case 'admin': return <Users className="h-5 w-5" />;
      case 'student': return <GraduationCap className="h-5 w-5" />;
      default: return <User className="h-5 w-5" />;
    }
  };

  const getRoleColor = (userType) => {
    switch (userType) {
      case 'teacher': return 'bg-blue-100 text-blue-700';
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'student': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Helper to get first and last name from fullName
  const getNameParts = (fullName) => {
    const parts = (fullName || '').split(' ');
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || ''
    };
  };

  const nameParts = getNameParts(user?.fullName);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                    {user?.avatar && user.avatar !== '👤' ? (
                      <span className="text-4xl">{user.avatar}</span>
                    ) : (
                      <span className="text-3xl font-bold text-white">
                        {nameParts.firstName?.[0]}{nameParts.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition-colors">
                      <Camera className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* User Info */}
                <div className="text-white">
                  <h1 className="text-2xl font-bold mb-2">
                    {user?.fullName || user?.name}
                  </h1>
                  <div className="flex items-center space-x-3 mb-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user?.userType)}`}>
                      {getRoleIcon(user?.userType)}
                      <span className="ml-2 capitalize">{user?.userType}</span>
                    </span>
                    <span className="text-blue-100 text-sm">ID: {user?.id || 'N/A'}</span>
                    {user?.isRoleMismatch && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Demo Mode
                      </span>
                    )}
                  </div>
                  <p className="text-blue-100">{user?.email}</p>
                  {user?.schoolId && (
                    <p className="text-blue-200 text-sm">School: {user.schoolId}</p>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium disabled:opacity-50 flex items-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors font-medium flex items-center"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 inline mr-1" />
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{user?.fullName || user?.name || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{user?.email || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{user?.phone || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Address
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your address..."
                    />
                  ) : (
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{user?.address || 'Not provided'}</p>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio / About
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      rows={6}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg min-h-[6rem]">
                      {user?.bio || 'No bio provided'}
                    </p>
                  )}
                </div>

                {/* Account Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3">Account Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700">Role (API):</span>
                      <span className="text-blue-900 font-medium">{user?.originalRole || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700">Dashboard:</span>
                      <span className="text-blue-900 font-medium capitalize">{user?.userType}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700">School ID:</span>
                      <span className="text-blue-900 font-medium">{user?.schoolId || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700">Status:</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                    {user?.isDemoMode && (
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700">Mode:</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                          Demo Mode
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Permissions */}
                {user?.permissions && user.permissions.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-3">Permissions</h4>
                    <div className="flex flex-wrap gap-2">
                      {user.permissions.map((permission, index) => (
                        <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {permission.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;