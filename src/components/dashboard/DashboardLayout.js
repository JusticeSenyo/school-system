// src/components/dashboard/DashboardLayout.js
import React, { useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../../AuthContext';
import { LogOut, Search as SearchIcon, Sun, Moon, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { roleBasedMenus } from '../../constants/roleBasedMenus';
import { useTeacherAccess } from '../../contexts/TeacherAccessContext';

const normalizeRole = (role) => {
  if (!role) return '';
  const r = String(role).toLowerCase().trim();
  if (r === 'ht' || r === 'headteacher' || r === 'head teacher') return 'headteacher';
  if (r === 'ad' || r === 'admin' || r === 'administrator') return 'admin';
  if (r === 'tr' || r === 'teacher') return 'teacher';
  if (r === 'ac' || r === 'accountant') return 'accountant';
  if (r === 'owner' || r === 'schoolowner' || r === 'school owner') return 'owner';
  return r;
};

const DashboardLayout = ({ title = 'Dashboard', subtitle = '', children }) => {
  const { user, logout } = useAuth();
  const { isClassTeacher } = useTeacherAccess();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const role = normalizeRole(user?.userType);

  // ----- Build menus safely (array) -----
  const baseMenus = Array.isArray(roleBasedMenus[role]) ? roleBasedMenus[role] : [];
  // For teacher, dynamic injection for class-teacher happens in Sidebar (so we just pass baseMenus).
  const menusForRole = baseMenus;

  // ----- Flatten menus for search (no flatMap; make defensive) -----
  const menuIndex = useMemo(() => {
    const flatten = (items) => {
      if (!Array.isArray(items)) return [];
      return items.reduce((acc, item) => {
        if (item && item.path) acc.push({ label: item.label, path: item.path });
        if (item && Array.isArray(item.children)) acc.push(...flatten(item.children));
        return acc;
      }, []);
    };
    return flatten(menusForRole);
  }, [menusForRole]);

  const handleSearch = (e) => {
    e?.preventDefault?.();
    const q = query.trim().toLowerCase();
    if (!q) return;

    // score by label
    const scored = menuIndex
      .map(m => {
        const l = String(m.label || '').toLowerCase();
        let score = 0;
        if (l === q) score = 100;
        else if (l.startsWith(q)) score = 80;
        else if (l.includes(q)) score = 60;
        return { ...m, score };
      })
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score);

    // role-aware fallbacks
    const roleFallbacks = {
      admin:       { exam: '/dashboard/print-exam-report' },
      headteacher: { exam: '/dashboard/manage-exam' },
      teacher:     { exam: '/dashboard/exams/enter-scores' },
      accountant:  { exam: '/dashboard/print-exam-report' },
      owner:       { exam: '/dashboard/print-exam-report' },
    };

    const intentFallback = (() => {
      if (q.includes('student')) return '/dashboard/manage-students';
      if (q.includes('staff'))   return '/dashboard/manage-staff';
      if (q.includes('class'))   return '/dashboard/classes';
      if (q.includes('fees'))    return '/dashboard/manage-fees';
      if (q.includes('attend'))  return role === 'teacher' && isClassTeacher
        ? '/dashboard/manage-attendance'
        : '/dashboard/attendance-report';
      if (q.includes('exam'))    return roleFallbacks[role]?.exam || '/dashboard';
      if (q.includes('report'))  return roleFallbacks[role]?.exam || '/dashboard';
      return '/dashboard';
    })();

    const target = scored[0]?.path || intentFallback;
    navigate(target);
    setQuery('');
  };

  const handleLogout = async () => {
    try {
      await Promise.resolve(logout?.());
    } finally {
      const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? '';
      window.location.href = `http://app.schoolmasterhub.net/login/?p_school_id=${encodeURIComponent(schoolId || '')}`;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar — pass role & menus explicitly */}
      <Sidebar
        isCollapsed={isCollapsed}
        onExpand={() => setIsCollapsed(false)}
        role={role}
        menus={menusForRole}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Title & Toggle */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="Toggle Sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <h1 className="text-xl font-semibold">{title}</h1>
                {subtitle && (
                  <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 rounded-full">
                    {subtitle}
                  </span>
                )}
              </div>

              {/* Right Header Items */}
              <div className="flex items-center space-x-4">
                {/* Search */}
                <form onSubmit={handleSearch} className="relative hidden md:block">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search pages…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-64"
                  />
                </form>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>

                {/* Profile */}
                <div className="flex items-center space-x-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {role || 'role'}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
