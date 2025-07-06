import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, GraduationCap, Users, BookOpen, Shield, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from './AuthContext';

export default function SchoolLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("teacher");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [error, setError] = useState("");

  const { login, isLoading } = useAuth(); // Using isLoading from your AuthContext

  const handleSubmit = async () => {
    // Clear any previous errors
    setError("");
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      // Call your login function and wait for the response
      const result = await login(email, password, userType, isDemoMode);
      
      // Check if login was successful
      if (!result.success) {
        // Display the specific error message from your API
        setError(result.error || "Login failed. Please check your credentials.");
      }
      // If successful, routing will happen automatically via App.js
    } catch (error) {
      // Handle any unexpected errors
      console.error('Login error:', error);
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // Clear error when user starts typing
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

        {/* Features */}
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
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center space-x-2 text-indigo-600">
              <GraduationCap className="h-8 w-8" />
              <span className="text-2xl font-bold">SchoolMaster Hub</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to access your dashboard</p>
            </div>

            {/* Test Credentials */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">Test Credentials:</p>
              <p className="text-xs text-blue-700">Email: amoahkingsford1@gmail.com</p>
              <p className="text-xs text-blue-700">Password: abcd</p>
              <p className="text-xs text-blue-600 mt-1">API Role: TE (Teacher)</p>
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-800">
                  🔒 <strong>Security:</strong> Your credentials must match the selected role.
                </p>
              </div>
            </div>

            {/* Demo Mode Toggle */}
            <div className="mb-4">
              <label className="flex items-center justify-center p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={isDemoMode}
                  onChange={(e) => setIsDemoMode(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  🧪 <strong>Demo Mode</strong> - Allow role mismatches for testing
                </span>
              </label>
              {isDemoMode && (
                <p className="text-xs text-orange-600 mt-1 text-center">
                  ⚠️ Demo mode enabled - Role validation disabled
                </p>
              )}
            </div>

            {/* Enhanced Error Message Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-800 font-medium">Login Failed</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  {error.includes('role') && !isDemoMode && (
                    <p className="text-xs text-red-600 mt-2">
                      💡 Tip: Enable Demo Mode above to test with different roles
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setError("")}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* User Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Login as:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleUserTypeChange("teacher")}
                  disabled={isLoading}
                  className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all relative ${
                    userType === "teacher"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  👨‍🏫 Teacher
                  {userType === "teacher" && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleUserTypeChange("admin")}
                  disabled={isLoading}
                  className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all relative ${
                    userType === "admin"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  👨‍💼 Admin
                  {userType === "admin" && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleUserTypeChange("student")}
                  disabled={isLoading}
                  className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all relative ${
                    userType === "student"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  👨‍🎓 Student
                  {userType === "student" && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {isDemoMode ? (
                  "🧪 Demo mode: Can use teacher credentials with any role"
                ) : (
                  "🔒 Your credentials must match the selected role"
                )}
              </p>
            </div>

            <div className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className={`block w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder={`${userType}@school.edu`}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className={`block w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    disabled={isLoading}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="ml-2 text-sm text-gray-600">Keep me signed in</span>
                </label>
                <a href="#" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                  Forgot password?
                </a>
              </div>

              {/* Sign In Button */}
              <button
                onClick={handleSubmit}
                disabled={isLoading || !email || !password}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    {isDemoMode ? (
                      `🧪 Demo Sign In as ${userType.charAt(0).toUpperCase() + userType.slice(1)}`
                    ) : (
                      `Sign In as ${userType.charAt(0).toUpperCase() + userType.slice(1)}`
                    )}
                  </>
                )}
              </button>

              {/* Connection Status */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  🔒 Secure connection to Oracle Cloud
                </p>
              </div>
            </div>

            {/* Additional Options */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Need access to your school?
                </p>
                <button className="text-indigo-600 hover:text-indigo-500 font-medium text-sm">
                  Request Account Access
                </button>
              </div>
            </div>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Having trouble signing in?{" "}
                <a href="#" className="text-indigo-600 hover:text-indigo-500">
                  Contact IT Support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}