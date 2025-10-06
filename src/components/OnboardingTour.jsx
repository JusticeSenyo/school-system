// src/components/OnboardingTourDriver.jsx
import React, { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAuth } from '../AuthContext';

const TOUR_VERSION = 'v1';
const keyFor = (userId) => `tour:dashboard:${TOUR_VERSION}:${userId || 'anon'}`;

export function shouldRunDashboardTour(user) {
  const uid = user?.user_id || user?.id;
  try {
    return !localStorage.getItem(keyFor(uid));
  } catch {
    return true;
  }
}

export function resetDashboardTour(user) {
  const uid = user?.user_id || user?.id;
  try { localStorage.removeItem(keyFor(uid)); } catch {}
}

export default function OnboardingTourDriver({ run, onClose }) {
  const { user } = useAuth();
  const drvRef = useRef(null);

  useEffect(() => {
    if (!run) return;
    // Build steps using the data-tour hooks already in your layout
    drvRef.current = driver({
      showProgress: true,
      allowClose: true,
      overlayOpacity: 0.5,
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      steps: [
        {
          element: '[data-tour="sidebar"]',
          popover: {
            title: 'Sidebar',
            description: 'Use the sidebar to navigate through SchoolMasterHub.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="sidebar-toggle"]',
          popover: {
            title: 'Collapse sidebar',
            description: 'Click to collapse/expand the sidebar.',
          },
        },
        {
          element: '[data-tour="search"]',
          popover: {
            title: 'Search',
            description: 'Jump to any page by typing its name.',
          },
        },
        {
          element: '[data-tour="theme-toggle"]',
          popover: {
            title: 'Theme',
            description: 'Switch between light and dark mode.',
          },
        },
        {
          element: '[data-tour="user-menu"]',
          popover: {
            title: 'Your profile',
            description: 'See your name and role here.',
          },
        },
        {
          element: '[data-tour="logout"]',
          popover: {
            title: 'Logout',
            description: 'Sign out securely when you’re finished.',
          },
        },
        {
          element: '[data-tour="content"]',
          popover: {
            title: 'Main area',
            description: 'Page content appears here.',
          },
        },
      ],
      onDestroyStarted: () => {
        // mark completed
        try {
          localStorage.setItem(keyFor(user?.user_id || user?.id), 'done');
        } catch {}
        onClose?.();
      },
    });

    drvRef.current.drive();
    return () => {
      try { drvRef.current?.destroy(); } catch {}
    };
  }, [run, onClose, user]);

  return null;
}
