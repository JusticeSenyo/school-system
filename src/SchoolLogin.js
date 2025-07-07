import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, Mail, Lock, GraduationCap, Users, BookOpen,
  Shield, Loader2, AlertCircle
} from "lucide-react";
import { useAuth } from './AuthContext';

export default function SchoolLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("teacher");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [error, setError] = useState("");

  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      const result = await login(email, password, userType, isDemoMode);
      if (!result.success) {
        setError(result.error || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error('Login error:', error);
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError("");
  };

  const handleUserTypeChange = (newUserType) => {
    setUserType(newUserType);
    if (error) setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 p-12 flex-col justify-between text-white">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <GraduationCap className="h-10 w-10" />
            <h1 className="text-3xl font-bold">SchoolMaster Hub</h1>
          </div>
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Empowering Education Through Technology
          </h2>
          <p className="text-xl text-blue-100 mb-12">
            Streamline your school management with our comprehensive platform designed for modern educational institutions.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Student Management</h3>
              <p className="text-blue-100 text-sm">Comprehensive student profiles and tracking</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Academic Planning</h3>
              <p className="text-blue-100 text-sm">Curriculum management and lesson planning</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Secure & Reliable</h3>
              <p className="text-blue-100 text-sm">Enterprise-grade security for student data</p>
            </div>
          </div>
        </div>

        <div className="text-sm text-blue-200">
          © 2025 SchoolMaster Hub. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center space-x-2 text-indigo-600">
              <GraduationCap className="h-8 w-8" />
              <span className="text-2xl font-bold">SchoolMaster Hub</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to access your dashboard</p>
            </div>

            {/* User Type Selector */}
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-700 mb-2 font-medium">Login as:</p>
              <div className="flex justify-center gap-3">
                {['admin', 'teacher', 'student'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleUserTypeChange(type)}
                    className={`px-4 py-1 rounded-full border text-sm font-medium transition ${
                      userType === type
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="pl-10 pr-4 py-2 w-full border rounded-lg"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="pl-10 pr-12 py-2 w-full border rounded-lg"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin mr-2 h-4 w-4" /> Logging in...
                </span>
              ) : (
                `Sign in as ${userType.charAt(0).toUpperCase() + userType.slice(1)}`
              )}
            </button>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Sign Up Button */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?
              </p>
              <button
                onClick={() => navigate('/signup')}
                className="mt-2 inline-block text-indigo-600 hover:text-indigo-500 font-semibold text-sm"
              >
                Sign Up for Free Trial
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
