import React, { useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const ABSOLUTE_SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours
const STORAGE_KEYS = {
  expiresAt: 'auth:expiresAt',
  logout: 'auth:logout',
};

function decodeJwtExpMs(token) {
  try {
    if (!token || token.split('.').length < 2) return null;
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(base64));
    return json?.exp ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export default function SessionManager({
  absoluteMs = ABSOLUTE_SESSION_MS,
  onWillExpire, // optional callback (e.g., refresh token)
  warnBeforeMs = 60 * 1000,
}) {
  const { isAuthenticated, isLoading, isInitializing, token, logout } = useAuth();
  const navigate = useNavigate();

  const timerRef = useRef(null);
  const warnRef = useRef(null);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warnRef.current) clearTimeout(warnRef.current);
  };

  const performLogout = () => {
    try { localStorage.setItem(STORAGE_KEYS.logout, String(Date.now())); } catch {}
    Promise.resolve(logout?.()).finally(() => navigate('/login', { replace: true }));
  };

  const schedule = (expiresAt) => {
    clearTimers();
    const now = Date.now();
    const ms = Math.max(0, expiresAt - now);

    if (onWillExpire && ms > warnBeforeMs) {
      warnRef.current = setTimeout(() => {
        try { onWillExpire(); } catch {}
      }, ms - warnBeforeMs);
    }

    timerRef.current = setTimeout(performLogout, ms || 0);
  };

  useEffect(() => {
    if (isLoading || isInitializing) return;

    if (!isAuthenticated) {
      clearTimers();
      try { localStorage.removeItem(STORAGE_KEYS.expiresAt); } catch {}
      return;
    }

    // Earliest of (JWT exp, absolute cap)
    const jwtExpMs = decodeJwtExpMs(token);
    const now = Date.now();
    const absoluteCap = now + absoluteMs;
    const chosenExp = Math.min(jwtExpMs || Infinity, absoluteCap);

    try { localStorage.setItem(STORAGE_KEYS.expiresAt, String(chosenExp)); } catch {}
    schedule(chosenExp);

    // Cross-tab sync
    const onStorage = (e) => {
      if (e.key === STORAGE_KEYS.logout) performLogout();
      if (e.key === STORAGE_KEYS.expiresAt && e.newValue) {
        const fromOtherTab = Number(e.newValue) || chosenExp;
        schedule(fromOtherTab);
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearTimers();
      window.removeEventListener('storage', onStorage);
    };
  }, [isAuthenticated, isLoading, isInitializing, token, absoluteMs]); // eslint-disable-line

  return null;
}
