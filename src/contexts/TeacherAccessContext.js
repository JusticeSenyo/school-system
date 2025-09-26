// src/contexts/TeacherAccessContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext";

const HOST = "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";
const CT_URL = `${HOST}/academic/get/class_teacher/`;   // ?p_school_id[&p_user_id]
const ST_URL = `${HOST}/academic/get/subject_teacher/`; // ?p_school_id[&p_user_id]

const TeacherAccessContext = createContext(null);
export const useTeacherAccess = () => useContext(TeacherAccessContext);

export function TeacherAccessProvider({ children }) {
  const { user, token } = useAuth() || {};
  const schoolId = user?.schoolId ?? user?.school_id ?? user?.school?.id ?? null;
  const userId   = user?.id ?? user?.userId ?? user?.USER_ID ?? null;
  const headers  = useMemo(() => token ? { Authorization: `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" }, [token]);

  const [classesOfTeacher, setClasses] = useState(new Set());
  const [subjectsOfTeacher, setSubjects] = useState([]); // { classId, subjectId }

  useEffect(() => {
    if (!schoolId || !userId) return;
    const q = new URLSearchParams({ p_school_id: String(schoolId), p_user_id: String(userId) });
    const fetchJson = async (u) => {
      const r = await fetch(u, { headers, cache: "no-store" });
      const t = (await r.text()).trim();
      try { return JSON.parse(t); } catch { return []; }
    };
    (async () => {
      try {
        const ct = await fetchJson(`${CT_URL}?${q.toString()}`);
        const set = new Set(ct.map(x => Number(x.CLASS_ID ?? x.class_id)).filter(Boolean));
        setClasses(set);
      } catch { setClasses(new Set()); }

      try {
        const st = await fetchJson(`${ST_URL}?${q.toString()}`);
        const arr = st.map(x => ({
          classId: Number(x.CLASS_ID ?? x.class_id),
          subjectId: Number(x.SUBJECT_ID ?? x.subject_id),
        })).filter(x => x.classId && x.subjectId);
        setSubjects(arr);
      } catch { setSubjects([]); }
    })();
  }, [schoolId, userId, headers]);

  const isClassTeacher = classesOfTeacher.size > 0;

  return (
    <TeacherAccessContext.Provider value={{ isClassTeacher, classesOfTeacher, subjectsOfTeacher }}>
      {children}
    </TeacherAccessContext.Provider>
  );
}
