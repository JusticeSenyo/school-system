import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Home,
  Users,
  BookOpen,
  Settings,
  MessageSquare,
  ClipboardList,
  FileText,
  FileCheck,
  CalendarCheck,
} from "lucide-react";
import { useAuth } from "../../AuthContext";
import { roleBasedMenus } from "../../constants/roleBasedMenus";

const iconMap = {
  Dashboard: <Home size={18} />,
  Communication: <MessageSquare size={18} />,
  "Manage Staff": <Users size={18} />,
  "Manage Students": <Users size={18} />,
  Attendance: <ClipboardList size={18} />,
  "Attendance Report": <ClipboardList size={18} />,
  "Manage Attendance": <CalendarCheck size={18} />,
  Fees: <FileText size={18} />,
  "Fees Report": <FileText size={18} />,
  "Print Bill": <FileCheck size={18} />,
  Academics: <BookOpen size={18} />,
  "Manage Class Teacher": <Users size={18} />,
  "Manage Subjects": <BookOpen size={18} />,
  "Manage Classes": <BookOpen size={18} />,
  Examination: <FileCheck size={18} />,
  "Manage Exam Report": <FileCheck size={18} />,
  "Print Exam Report": <FileText size={18} />,
  Settings: <Settings size={18} />,
};

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsedItems, setCollapsedItems] = useState({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = (label) => {
    setCollapsedItems((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const role = user?.userType || "guest";
  const menus = roleBasedMenus[role] || [];

  return (
    <aside
      className={`bg-white dark:bg-gray-800 border-r dark:border-gray-700 p-4 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      } min-h-screen flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {!isCollapsed && (
          <h1 className="text-lg font-bold text-indigo-600 dark:text-white">
            SchoolMaster Hub
          </h1>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {menus.map((item) =>
          item.children ? (
            <div key={item.label}>
              <button
                onClick={() => toggleCollapse(item.label)}
                title={isCollapsed ? item.label : ""}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium text-left transition ${
                  item.children.some((child) => location.pathname.startsWith(child.path))
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center space-x-2">
                  {iconMap[item.label]}
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
                    title={isCollapsed ? child.label : ""}
                    className={`flex items-center space-x-2 ml-8 px-3 py-1.5 text-sm rounded-md transition ${
                      location.pathname === child.path
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-800 dark:text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {iconMap[child.label]}
                    {!isCollapsed && <span>{child.label}</span>}
                  </Link>
                ))}
            </div>
          ) : (
            <Link
              key={item.label}
              to={item.path}
              title={isCollapsed ? item.label : ""}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md font-medium transition ${
                location.pathname === item.path
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {iconMap[item.label]}
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          )
        )}
      </nav>

      {/* Logout */}
      <div className="mt-auto">
        <button
          onClick={logout}
          title="Logout"
          className="flex items-center space-x-2 text-red-500 hover:text-red-600 dark:hover:text-red-400"
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
