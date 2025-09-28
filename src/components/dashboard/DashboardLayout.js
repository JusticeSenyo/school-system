// components/dashboard/DashboardLayout.js
import React, { useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../../AuthContext";
import { LogOut, Search, Sun, Moon, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { roleBasedMenus } from "../../constants/roleBasedMenus";

const DashboardLayout = ({ title = "Dashboard", subtitle = "", children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // controls mobile sidebar
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const role = String(user?.userType || "guest").toLowerCase();
  const menusForRole = roleBasedMenus[role] || [];

  const menuIndex = useMemo(() => {
    const flatten = (items = []) =>
      items.flatMap((item) => [
        ...(item.path ? [{ label: item.label, path: item.path }] : []),
        ...(item.children ? flatten(item.children) : []),
      ]);
    return flatten(menusForRole);
  }, [menusForRole]);

  const handleSearch = (e) => {
    e?.preventDefault?.();
    const q = query.trim().toLowerCase();
    if (!q) return;

    const scored = menuIndex
      .map((m) => {
        const l = String(m.label || "").toLowerCase();
        let score = 0;
        if (l === q) score = 100;
        else if (l.startsWith(q)) score = 80;
        else if (l.includes(q)) score = 60;
        return { ...m, score };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score);

    const fallback =
      q.includes("student") ? "/dashboard/manage-students" :
        q.includes("staff") ? "/dashboard/manage-staff" :
          q.includes("class") ? "/dashboard/classes" :
            q.includes("exam") ? "/dashboard/manage-exam" :
              q.includes("fees") ? "/dashboard/manage-fees" :
                q.includes("attend") ? "/dashboard/attendance" :
                  "/dashboard";

    const target = scored[0]?.path || fallback;
    navigate(target);
    setQuery("");
  };

  const handleLogout = async () => {
    try {
      await Promise.resolve(logout?.());
    } finally {
      const schoolId =
        user?.schoolId ?? user?.school_id ?? user?.school?.id ?? "";
      window.location.href = `http://app.schoolmasterhub.net/login/?p_school_id=${encodeURIComponent(
        schoolId ?? ""
      )}`;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar - mobile (slides in/out) */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white dark:bg-gray-900 shadow-lg transition-transform duration-300 xl:hidden
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Menu</h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <Sidebar isCollapsed={false} />
      </div>

      {/* Sidebar - desktop (always visible) */}
      <div className="hidden xl:block w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
        <Sidebar isCollapsed={false} />
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">

              {/* Left section */}
              <div className="flex items-center space-x-4">
                {/* Hamburger only on mobile */}
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg xl:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>

                {/* Title + Subtitle */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                  <h1 className="text-[14px] sm:text-xl md:text-2xlfont-semibold truncate break-words whitespace-normal ">{title}</h1>
                  {subtitle && (
                    <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                      {subtitle}
                    </span>
                  )}
                </div>
              </div>

              {/* Right section */}
              <div className="flex items-center space-x-3">
                {/* Search bar (hidden on mobile, smaller on tablet) */}
                <form
                  onSubmit={handleSearch}
                  className="relative hidden sm:block"
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search pages…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 
  w-32 sm:w-40 md:w-56 lg:w-64"
                  />
                </form>

                {/* Theme toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </button>

                {/* User info */}
                <div className="flex items-center space-x-2 flex-wrap">
                  {/* Hide text on very small screens */}
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium truncate max-w-[100px]">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                      {user?.userType || "Role"}
                    </p>
                  </div>

                  <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>


        <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
