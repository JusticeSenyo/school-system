// src/components/OnboardingTourDriver.jsx
import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

/**
 * Robust, Academics-first onboarding tour.
 * - Adds steps ONLY for elements that exist (prevents glitches).
 * - Tries to ensure the sidebar and "Academics" are visible before starting.
 * - Order: Academic Years → Terms → Classes → Subjects → Assign Subjects → Class Teacher
 * - Then general UI: Search, Theme, Profile, Logout, Content
 */
export default function OnboardingTourDriver({ run, onClose }) {
  useEffect(() => {
    if (!run) return;

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const exists = (sel) => !!document.querySelector(sel);

    const ensureAcademicsOpen = async () => {
      // Poke sidebar toggles (both mobile & desktop variants) so nav renders
      const toggles = document.querySelectorAll('[data-tour="sidebar-toggle"]');
      if (!document.querySelector('a[href="/dashboard/academic-years"]')) {
        toggles.forEach((btn) => btn?.click?.());
        await wait(150);
      }

      // If the Academics group is collapsible, try to reveal it
      const anchors = [
        'a[href="/dashboard/academic-years"]',
        'a[href="/dashboard/academic-terms"]',
        'a[href="/dashboard/classes"]',
        'a[href="/dashboard/manage-subjects"]',
        'a[href="/dashboard/assign-subjects"]',
        'a[href="/dashboard/class-teacher"]',
      ];
      const firstAcademics = anchors
        .map((s) => document.querySelector(s))
        .find(Boolean);

      if (!firstAcademics) return; // Role might not have Academics

      let node = firstAcademics;
      for (let i = 0; i < 5 && node; i += 1) {
        const isHidden = firstAcademics.offsetParent === null;
        const toggler =
          node.parentElement?.querySelector?.('button,[role="button"]') ||
          node.previousElementSibling;
        if (isHidden && toggler?.click) {
          toggler.click();
          await wait(120);
        }
        node = node.parentElement;
      }

      firstAcademics?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      await wait(120);
    };

    const stepIf = (element, title, description) =>
      exists(element) ? { element, popover: { title, description } } : null;

    const buildSteps = () => {
      const steps = [];

      // Intro (floating)
      steps.push({
        popover: {
          title: "Welcome 👋",
          description:
            "Let’s set up your Academics first. We’ll start with Academic Years, then Terms, Classes, and Subjects.",
        },
      });

      // Academics-first flow
      const academics = [
        [
          'a[href="/dashboard/academic-years"]',
          "Academic Years",
          "Create your school’s academic years before anything else.",
        ],
        [
          'a[href="/dashboard/academic-terms"]',
          "Academic Terms",
          "Add the terms/semesters under each academic year.",
        ],
        [
          'a[href="/dashboard/classes"]',
          "Manage Classes",
          "Set up the classes (e.g., Primary 1, JHS 2) that students will belong to.",
        ],
        [
          'a[href="/dashboard/manage-subjects"]',
          "Manage Subjects",
          "Create subjects taught in your school (e.g., Mathematics, English).",
        ],
        [
          'a[href="/dashboard/assign-subjects"]',
          "Assign Subjects",
          "Assign the created subjects to the appropriate classes.",
        ],
        [
          'a[href="/dashboard/class-teacher"]',
          "Class Teacher",
          "Assign class teachers to each class for better tracking.",
        ],
      ];
      for (const [sel, t, d] of academics) {
        const s = stepIf(sel, t, d);
        if (s) steps.push(s);
      }

      // General UI bits (added only if present)
      const general = [
        [
          '[data-tour="search"]',
          "Quick Search",
          "Type a keyword (e.g. “fees”, “students”) to jump around quickly.",
        ],
        [
          '[data-tour="theme-toggle"]',
          "Theme",
          "Switch between light and dark mode anytime.",
        ],
        [
          '[data-tour="user-menu"]',
          "Your profile",
          "See your name and role. Open Profile/Settings from here.",
        ],
        ['[data-tour="logout"]', "Sign out", "Log out of your session securely."],
        ['[data-tour="content"]', "Workspace", "This is where page content appears."],
      ];
      for (const [sel, t, d] of general) {
        const s = stepIf(sel, t, d);
        if (s) steps.push(s);
      }

      // Outro (floating)
      steps.push({
        popover: {
          title: "All set!",
          description:
            "Start with Academic Years and Terms, then move on to Classes and Subjects. You can re-run this tour from Help anytime.",
        },
      });

      return steps.filter(Boolean);
    };

    let d;
    (async () => {
      await ensureAcademicsOpen();
      await wait(50);
      const steps = buildSteps();

      d = driver({
        steps,
        showProgress: true,
        allowClose: true,
        overlayOpacity: 0.5,
        stagePadding: 6,
        animate: true,
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Finish",
        onDestroy: () => onClose?.(),
      });

      d.drive();
    })();

    return () => {
      try {
        d?.destroy();
      } catch {}
    };
  }, [run, onClose]);

  return null;
}
