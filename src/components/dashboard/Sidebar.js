// src/components/dashboard/Sidebar.js
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronRight, LogOut, Home, Users, GraduationCap, BookOpen,
  Settings, MessageSquare, ClipboardList, FileText, FileCheck, CalendarCheck,
} from "lucide-react";
import { useAuth } from "../../AuthContext";
import { roleBasedMenus } from "../../constants/roleBasedMenus";

const iconMap = {
  Dashboard: <Home size={18} />,
  Communication: <MessageSquare size={18} />,
  "Manage Staff": <Users size={18} />,
  "Manage Students": <GraduationCap size={18} />,
  Attendance: <ClipboardList size={18} />,
  "Attendance Report": <ClipboardList size={18} />,
  "Manage Attendance": <CalendarCheck size={18} />,
  Fees: <FileText size={18} />,
  "Fees Report": <FileText size={18} />,
  "Print Bill": <FileCheck size={18} />,
  Academics: <BookOpen size={18} />,
  "Manage Class Teacher": <Users size={18} />,
  "Manage Subjects": <BookOpen size={18} />,
  "Assign Subjects": <BookOpen size={18} />,
  "Manage Classes": <BookOpen size={18} />,
  Examination: <FileCheck size={18} />,
  "Manage Exam Report": <FileCheck size={18} />,
  "Print Exam Report": <FileText size={18} />,
  Settings: <Settings size={18} />,
};

const Sidebar = ({ isCollapsed, onExpand }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsedItems, setCollapsedItems] = useState({});

  const role = (user?.userType || "guest").toLowerCase();
  const menus = roleBasedMenus[role] || [];

  const rawSchoolName =
    user?.schoolName || user?.school?.name || user?.school_name || "Your School";
  const displaySchoolName = String(rawSchoolName).toUpperCase();

  const toggleCollapse = (label) => {
    setCollapsedItems((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const ensureExpanded = () => {
    if (isCollapsed && typeof onExpand === "function") onExpand();
  };

  const onGroupClick = (label) => {
    if (isCollapsed) {
      ensureExpanded();
      setCollapsedItems((prev) => ({ ...prev, [label]: true }));
      return;
    }
    toggleCollapse(label);
  };

  // 👇 Redirect to /login/?p_school_id={school_id} after session kill
  const handleLogout = async () => {
    try {
      await Promise.resolve(logout?.()); // kill session, clear storage, etc.
    } finally {
      const schoolId =
        user?.schoolId ?? user?.school_id ?? user?.school?.id ?? "";
      const url = `http://localhost:3000/login/?p_school_id=${encodeURIComponent(
        schoolId ?? ""
      )}`;
      window.location.href = url; // full redirect as requested
    }
  };

  return (
    <aside
      className={`bg-white dark:bg-gray-800 border-r dark:border-gray-700 p-4 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      } min-h-screen flex flex-col`}
    >
      {/* Logo / Title */}
      {!isCollapsed ? (
        <div className="flex items-center justify-center mb-6">
          <h1
            className="text-xl font-bold text-indigo-600 dark:text-white truncate max-w-full tracking-wide"
            title={displaySchoolName}
          >
            {displaySchoolName}
          </h1>
        </div>
      ) : (
        <div className="flex items-center justify-center mb-6">
          <div
            className="h-9 w-9 rounded-lg bg-indigo-600 text-white grid place-items-center font-semibold"
            title={displaySchoolName}
          >
            {displaySchoolName.slice(0, 2)}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-2 overflow-y-auto">
        {menus.map((item) =>
          item.children ? (
            <div key={item.label}>
              <button
                onClick={() => onGroupClick(item.label)}
                title={isCollapsed ? item.label : ""}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition font-medium ${
                  item.children.some((child) =>
                    location.pathname.startsWith(child.path)
                  )
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                aria-expanded={!!collapsedItems[item.label]}
              >
                <div className="flex items-center space-x-2">
                  {iconMap[item.label] || <Users size={18} />}
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {!isCollapsed &&
                  (collapsedItems[item.label] ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  ))}
              </button>

              {collapsedItems[item.label] &&
                item.children.map((child) => (
                  <Link
                    key={child.label}
                    to={child.path}
                    onClick={ensureExpanded}
                    title={isCollapsed ? child.label : ""}
                    className={`flex items-center space-x-2 ml-8 px-3 py-1.5 text-sm rounded-md transition ${
                      location.pathname === child.path
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-800 dark:text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {iconMap[child.label] || <Users size={16} />}
                    {!isCollapsed && <span>{child.label}</span>}
                  </Link>
                ))}
            </div>
          ) : (
            <Link
              key={item.label}
              to={item.path}
              onClick={ensureExpanded}
              title={isCollapsed ? item.label : ""}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md font-medium transition ${
                location.pathname === item.path
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {iconMap[item.label] || <Users size={18} />}
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          )
        )}
      </nav>

      {/* Logout */}
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleLogout}
          title="Logout"
          className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-900 dark:hover:text-red-400 transition"
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
