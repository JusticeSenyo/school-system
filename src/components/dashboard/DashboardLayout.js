// src/components/dashboard/DashboardLayout.js
import React, { useMemo, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../../AuthContext";
import { LogOut, Search, Sun, Moon, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { roleBasedMenus } from "../../constants/roleBasedMenus";

// 👇 Add the tour component (path is correct for this file location)
import OnboardingTourDriver from "../OnboardingTourDriver";

const DashboardLayout = ({ title = "Dashboard", subtitle = "", children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // mobile overlay
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // desktop mini/full
  const [query, setQuery] = useState("");
  const [runTour, setRunTour] = useState(false); // ⬅️ run first-login tour
  const navigate = useNavigate();

  // 🔒 Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  // 🎯 First-time login tour (per user)
  useEffect(() => {
    const uid =
      user?.user_id ?? user?.id ?? user?.USER_ID ?? user?.email ?? "anon";
    const TOUR_KEY = `smh:tour:v1:${uid}`;
    const seen = localStorage.getItem(TOUR_KEY);
    if (!seen) {
      const t = setTimeout(() => setRunTour(true), 300); // delay so DOM is ready
      localStorage.setItem(TOUR_KEY, "1");
      return () => clearTimeout(t);
    }
  }, [user]);

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
      const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? "";
      window.location.href = `http://app.schoolmasterhub.net/login/?p_school_id=${encodeURIComponent(schoolId ?? "")}`;
    }
  };

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  const rawSchoolName = user?.schoolName || user?.school?.name || user?.school_name || "Your School";
  const displaySchoolName = String(rawSchoolName).toUpperCase();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">

      {/* 📌 Mobile overlay sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white dark:bg-gray-900 shadow-lg transition-transform duration-300 xl:hidden
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        data-tour="sidebar"
      >
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <h1
              className="text-xl font-bold text-indigo-600 dark:text-white truncate max-w-full tracking-wide"
              title={displaySchoolName}
            >
              {displaySchoolName}
            </h1>
            <button onClick={() => setIsSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <Sidebar
            isCollapsed={false}
            onExpand={() => { }}
            role={role}
            menus={menusForRole}
          />
        </div>
      </div>

      {/* 🔲 Dark overlay under sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 xl:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 📌 Desktop sidebar */}
      <div className="hidden xl:flex">
        <div className="fixed top-0 left-0 h-screen z-30" data-tour="sidebar">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onExpand={() => setIsSidebarCollapsed(false)}
            role={role}
            menus={menusForRole}
          />
        </div>
      </div>

      {/* 📌 Main content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? "xl:ml-20" : "xl:ml-64"
          }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            {/* Mobile menu button */}
            <button
              data-tour="sidebar-toggle"
              onClick={() => setIsSidebarOpen(true)}
              className="xl:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu size={20} />
            </button>

            {/* Desktop collapse button */}
            <button
              data-tour="sidebar-toggle"
              onClick={toggleSidebar}
              className="hidden xl:inline-flex p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu size={20} />
            </button>

            <div className="flex flex-col">
              <h1 className="text-[14px] sm:text-xl md:text-2xl font-semibold truncate break-words whitespace-normal">
                {title}
              </h1>
              {subtitle && (
                <p className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <form onSubmit={handleSearch} className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                data-tour="search"
                type="text"
                placeholder="Search pages…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 
                w-32 sm:w-40 md:w-56 lg:w-64"
              />
            </form>

            <button
              data-tour="theme-toggle"
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User info */}
            <div className="flex items-center space-x-2 flex-wrap" data-tour="user-menu">
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
                data-tour="logout"
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-auto" data-tour="content">
          {children}
        </main>
      </div>

      {/* 🎉 First-login walk-through */}
      <OnboardingTourDriver run={runTour} onClose={() => setRunTour(false)} />
    </div>
  );
};

export default DashboardLayout;
