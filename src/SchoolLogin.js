import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, Mail, Lock, GraduationCap, Users, BookOpen,
  Shield, Loader2, AlertCircle, Sun, Moon
} from "lucide-react";
import { useAuth } from './AuthContext';
import { useTheme } from './contexts/ThemeContext';

export default function SchoolLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("teacher");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [error, setError] = useState("");

  const { login, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex relative text-gray-900 dark:text-gray-100">

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-50 p-2 rounded-full shadow bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
        title="Toggle Theme"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

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
          {[{
            Icon: Users, title: "Student Management", desc: "Comprehensive student profiles and tracking"
          }, {
            Icon: BookOpen, title: "Academic Planning", desc: "Curriculum management and lesson planning"
          }, {
            Icon: Shield, title: "Secure & Reliable", desc: "Enterprise-grade security for student data"
          }].map(({ Icon, title, desc }, idx) => (
            <div className="flex items-center space-x-4" key={idx}>
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-blue-100 text-sm">{desc}</p>
              </div>
            </div>
          ))}
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

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h2>
              <p className="text-gray-600 dark:text-gray-400">Sign in to access your dashboard</p>
            </div>

            {/* User Type Selector */}
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">Login as:</p>
              <div className="flex justify-center gap-3 flex-wrap">
                {['admin', 'teacher', 'accountant'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleUserTypeChange(type)}
                    className={`px-4 py-1 rounded-full border text-sm font-medium transition ${
                      userType === type
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="pl-10 pr-4 py-2 w-full border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="pl-10 pr-12 py-2 w-full border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
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
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-800/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Signup Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?
              </p>
              <button
                onClick={() => navigate('/signup')}
                className="mt-2 inline-block text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-sm"
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
