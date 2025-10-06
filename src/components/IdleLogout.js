import React, { useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEYS = {
  lastActive: 'idle:lastActive',
  idleLogout: 'idle:logout',
};

export default function IdleLogout({ idleMs = 15 * 60 * 1000 }) {
  const { isAuthenticated, isLoading, isInitializing, logout } = useAuth();
  const navigate = useNavigate();

  const timerRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const schedule = () => {
    clearTimer();
    const last = Number(localStorage.getItem(STORAGE_KEYS.lastActive)) || Date.now();
    const nextIn = Math.max(0, last + idleMs - Date.now());
    timerRef.current = setTimeout(handleIdle, nextIn);
  };

  const markActive = () => {
    try { localStorage.setItem(STORAGE_KEYS.lastActive, String(Date.now())); } catch {}
    schedule();
  };

  const handleIdle = () => {
    // double-check inactivity across tabs
    const last = Number(localStorage.getItem(STORAGE_KEYS.lastActive)) || 0;
    if (Date.now() - last >= idleMs) {
      try { localStorage.setItem(STORAGE_KEYS.idleLogout, String(Date.now())); } catch {}
      Promise.resolve(logout?.()).finally(() => navigate('/login', { replace: true }));
    } else {
      schedule();
    }
  };

  useEffect(() => {
    if (isLoading || isInitializing) return;
    if (!isAuthenticated) {
      clearTimer();
      return;
    }

    // init lastActive if missing
    if (!localStorage.getItem(STORAGE_KEYS.lastActive)) {
      try { localStorage.setItem(STORAGE_KEYS.lastActive, String(Date.now())); } catch {}
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((ev) => window.addEventListener(ev, markActive, { passive: true }));

    // cross-tab: if another tab logs out due to idle, follow
    const onStorage = (e) => {
      if (e.key === STORAGE_KEYS.idleLogout) {
        Promise.resolve(logout?.()).finally(() => navigate('/login', { replace: true }));
      }
      if (e.key === STORAGE_KEYS.lastActive) {
        schedule();
      }
    };
    window.addEventListener('storage', onStorage);

    schedule();

    return () => {
      clearTimer();
      activityEvents.forEach((ev) => window.removeEventListener(ev, markActive));
      window.removeEventListener('storage', onStorage);
    };
  }, [isAuthenticated, isLoading, isInitializing]); // eslint-disable-line

  return null;
}
