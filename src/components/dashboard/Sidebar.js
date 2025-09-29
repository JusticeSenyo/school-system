// src/components/dashboard/Sidebar.js
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronRight, LogOut, Home, Users, GraduationCap, BookOpen,
  Settings, MessageSquare, ClipboardList, FileText, FileCheck, CalendarCheck,
  Layers, Flag, CalendarRange, UserCog, ListPlus
} from "lucide-react";
import { useAuth } from "../../AuthContext";
import { roleBasedMenus } from "../../constants/roleBasedMenus";
import { useTeacherAccess } from "../../contexts/TeacherAccessContext";

/* -------------------- Icons -------------------- */
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
  "Manage Class Teacher": <UserCog size={18} />,
  "Manage Subjects": <BookOpen size={18} />,
  "Assign Subjects": <ListPlus size={18} />,
  "Manage Classes": <Layers size={18} />,
  Terms: <Flag size={18} />,
  "Academic Years": <CalendarRange size={18} />,

  Examination: <FileCheck size={18} />,
  "Manage Exam Report": <FileCheck size={18} />,
  "Print Exam Report": <FileText size={18} />,
  "Enter Scores": <FileCheck size={18} />,

  Settings: <Settings size={18} />,
};

function iconFor(label) {
  if (iconMap[label]) return iconMap[label];
  const L = (label || "").toLowerCase();
  if (L.includes("term")) return <Flag size={18} />;
  if (L.includes("year")) return <CalendarRange size={18} />;
  if (L.includes("class teacher")) return <UserCog size={18} />;
  if (L.includes("class")) return <Layers size={18} />;
  if (L.includes("subject")) return <BookOpen size={18} />;
  return <Users size={18} />;
}

/* -------------------- Helpers -------------------- */
const normalizeRole = (role) => {
  if (!role) return "";
  const r = String(role).toLowerCase().trim();
  if (r === "ht" || r === "headteacher" || r === "head teacher") return "headteacher";
  if (r === "ad" || r === "admin" || r === "administrator") return "admin";
  if (r === "tr" || r === "teacher") return "teacher";
  if (r === "ac" || r === "accountant") return "accountant";
  if (r === "owner" || r === "schoolowner" || r === "school owner") return "owner";
  return r;
};

const prettyAcademicLabel = (raw) => {
  switch (raw) {
    case "Manage Classes": return "Classes";
    case "Manage Class Teacher": return "Class Teachers";
    case "Manage Subjects": return "Subjects";
    default: return raw;
  }
};

function useMenusAugmentedByAcademics(baseMenus) {
  const safe = Array.isArray(baseMenus) ? baseMenus : [];
  const menus = safe.map(it =>
    it?.children ? { ...it, children: [...it.children] } : { ...it }
  );

  const idx = menus.findIndex(m => m.label === "Academics" && Array.isArray(m.children));
  if (idx >= 0) {
    const children = menus[idx].children || [];

    if (!children.some(c => /term/i.test(c.label))) {
      children.splice(1, 0, { label: "Terms", path: "/dashboard/academic-terms" });
    }
    if (!children.some(c => /year/i.test(c.label))) {
      children.splice(2, 0, { label: "Academic Years", path: "/dashboard/academic-years" });
    }

    menus[idx].children = children.map(c => ({ ...c, label: prettyAcademicLabel(c.label) }));
  }
  return menus;
}

/* -------------------- Component -------------------- */
const Sidebar = ({ isCollapsed, onExpand, role: roleProp, menus: menusProp }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isClassTeacher } = useTeacherAccess();

  const role = useMemo(
    () => normalizeRole(roleProp || user?.userType),
    [roleProp, user?.userType]
  );

  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? "";
  const [hasAccountant, setHasAccountant] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!schoolId) { setHasAccountant(false); return; }

    (async () => {
      try {
        const url = `https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools/staff/get/staff/?p_school_id=${encodeURIComponent(schoolId)}&p_role=AC`;
        const r = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
        const t = (await r.text()).trim();
        let list = [];
        if (t) {
          try { list = JSON.parse(t); } catch { list = []; }
          if (!Array.isArray(list)) list = Array.isArray(list.items) ? list.items : [];
        }

        let exists = false;
        for (const s of list) {
          const roleCode = (s.role ?? s.ROLE ?? "").toString().trim().toUpperCase();
          const roleName = (s.role_name ?? s.ROLE_NAME ?? "").toString().trim().toLowerCase();
          if (roleCode === "AC" || roleName.includes("accountant")) { exists = true; break; }
        }

        if (isMounted) setHasAccountant(exists);
      } catch { if (isMounted) setHasAccountant(true); }
    })();

    return () => { isMounted = false; };
  }, [schoolId]);

  const baseMenusRaw = Array.isArray(menusProp)
    ? menusProp
    : Array.isArray(roleBasedMenus[role])
      ? roleBasedMenus[role]
      : [];

  const baseMenus = useMemo(() => {
    if (role !== "teacher") return baseMenusRaw;

    if (!isClassTeacher) return baseMenusRaw;

    const cloned = baseMenusRaw.map(m => (m.children ? { ...m, children: [...m.children] } : { ...m }));
    const exIdx = cloned.findIndex(m => m.label === "Examination" && Array.isArray(m.children));
    if (exIdx >= 0) {
      const ex = cloned[exIdx].children;
      const need = [
        { label: "Manage Attendance", path: "/dashboard/manage-attendance" },
        { label: "Manage Exam Report", path: "/dashboard/manage-exam" },
      ];
      need.forEach(n => { if (!ex.some(e => e.path === n.path)) ex.push(n); });
      cloned[exIdx].children = ex;
    }
    return cloned;
  }, [baseMenusRaw, isClassTeacher, role]);

  const menus = useMenusAugmentedByAcademics(baseMenus);

  const groupWithActive = useMemo(() => {
    const idx = menus.findIndex(
      m => Array.isArray(m.children) && m.children.some(c => c.path && location.pathname.startsWith(c.path))
    );
    return idx >= 0 ? menus[idx].label : null;
  }, [menus, location.pathname]);

  const [open, setOpen] = useState(() => (groupWithActive ? { [groupWithActive]: true } : {}));
  const toggle = (label) => setOpen(prev => ({ ...prev, [label]: !prev[label] }));
  const ensureExpanded = () => { if (isCollapsed && typeof onExpand === "function") onExpand(); };

  const handleLogout = async () => {
    try { await Promise.resolve(logout?.()); }
    finally {
      const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? "";
      window.location.href = `http://app.schoolmasterhub.net/login/?p_school_id=${encodeURIComponent(schoolId || "")}`;
    }
  };

  const rawSchoolName = user?.schoolName || user?.school?.name || user?.school_name || "Your School";
  const displaySchoolName = String(rawSchoolName).toUpperCase();

  return (
    <aside
      className={`bg-white dark:bg-gray-800 border-r dark:border-gray-700 p-4 transition-all duration-300
        ${isCollapsed ? "w-20" : "w-64"} min-h-screen flex flex-col`}
    >
      {/* Logo / Title */}
      {!isCollapsed ? (
        <div className="flex items-center justify-center mb-6">
          <h1 className="text-xl font-bold text-indigo-600 dark:text-white truncate max-w-full tracking-wide" title={displaySchoolName}>
            {displaySchoolName}
          </h1>
        </div>
      ) : (
        <div className="flex items-center justify-center mb-6">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white grid place-items-center font-semibold" title={displaySchoolName}>
            {displaySchoolName.slice(0, 2)}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-2 overflow-y-auto">
        {Array.isArray(menus) && menus.length > 0 ? (
          menus.map((item) =>
            Array.isArray(item.children) && item.children.length ? (
              <div key={item.label}>
                <button
                  onClick={() => {
                    if (isCollapsed) { ensureExpanded(); setOpen(prev => ({ ...prev, [item.label]: true })); }
                    else toggle(item.label);
                  }}
                  title={isCollapsed ? item.label : ""}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition font-medium ${item.children.some((child) => location.pathname.startsWith(child.path))
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  aria-expanded={!!open[item.label]}
                >
                  <div className="flex items-center space-x-2">
                    {iconFor(item.label)}
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                  {!isCollapsed && (open[item.label] ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                </button>

                {open[item.label] &&
                  item.children.map((child) => {
                    const label = item.label === "Academics" ? prettyAcademicLabel(child.label) : child.label;

                    const restrictManageFees =
                      role === "admin" &&
                      (hasAccountant !== false) &&
                      item.label === "Fees" &&
                      label === "Manage Fees";

                    if (restrictManageFees) {
                      return (
                        <div
                          key={child.path || label}
                          className="relative group ml-8 px-3 py-1.5 text-sm rounded-md
                                     text-gray-500 dark:text-gray-400 opacity-80 cursor-not-allowed
                                     flex items-center space-x-2"
                          title="Login as accountant to use this feature"
                        >
                          {iconFor(label)}
                          {!isCollapsed && <span>{label}</span>}
                          <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2
                                            whitespace-nowrap text-xs px-2 py-1 rounded-md shadow
                                            bg-gray-900 text-white opacity-0 group-hover:opacity-100 transition">
                            Login as accountant to use this feature
                          </span>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={child.path || label}
                        to={child.path}
                        onClick={ensureExpanded}
                        title={isCollapsed ? label : ""}
                        className={`flex items-center space-x-2 ml-8 px-3 py-1.5 text-sm rounded-md transition ${location.pathname === child.path
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-800 dark:text-white"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                          }`}
                      >
                        {iconFor(label)}
                        {!isCollapsed && <span>{label}</span>}
                      </Link>
                    );
                  })}
              </div>
            ) : (
              <Link
                key={item.path || item.label}
                to={item.path}
                onClick={ensureExpanded}
                title={isCollapsed ? item.label : ""}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md font-medium transition ${location.pathname === item.path
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
              >
                {iconFor(item.label)}
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            )
          )
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
            No menu available for your role.
          </div>
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
