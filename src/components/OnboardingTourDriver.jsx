// src/components/OnboardingTourDriver.jsx
import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export default function OnboardingTourDriver({ run, onClose }) {
  useEffect(() => {
    if (!run) return;

    const d = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Finish',
      stagePadding: 6,
      overlayOpacity: 0.5,
      animate: true,
      onDestroy: () => onClose?.(),
      steps: [
        {
          element: '[data-tour="sidebar-toggle"]',
          popover: {
            title: 'Sidebar',
            description: 'Open/collapse the navigation menu to access pages.',
          },
        },
        {
          element: '[data-tour="sidebar"]',
          popover: {
            title: 'Navigation',
            description: 'All features you have access to are listed here.',
          },
        },
        {
          element: '[data-tour="search"]',
          popover: {
            title: 'Quick search',
            description: 'Jump to pages by typing a keyword (e.g. “fees”, “students”).',
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
            description: 'See your name and role. Open Profile/Settings from here.',
          },
        },
        {
          element: '[data-tour="logout"]',
          popover: {
            title: 'Sign out',
            description: 'Log out of your session securely.',
          },
        },
        {
          element: '[data-tour="content"]',
          popover: {
            title: 'Workspace',
            description: 'This is where each page’s content appears.',
          },
        },
      ],
    });

    d.drive();
    return () => d.destroy();
  }, [run, onClose]);

  return null;
}
