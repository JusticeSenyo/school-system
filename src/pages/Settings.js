// src/pages/Settings.js
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Save,
  Download,
  LogOut,
  Eye,
  EyeOff,
  KeyRound,
  Moon,
  Building2,
  Mail as MailIcon,
  Shield,
  UserRound,
  CalendarClock,
  Package,
  Banknote,
  Image as ImageIcon,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { putToOCI, buildPublicUrl } from "../config/storage";

/* ------------ ORDS base ------------ */
const HOST =
  "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/* ------------ Live endpoints ------------ */
const STAFF_LIST_API = `${HOST}/staff/get/staff/`;       // ?p_school_id[&p_role]
const SCHOOLS_LIST_API = `${HOST}/academic/get/school/`; // returns all schools incl logo/signature
const RESET_PASSWORD_API = `${HOST}/staff/reset_password/`; // GET ?p_user_id=&p_password=
const UPDATE_SCHOOL_API = `${HOST}/academic/update/school/`; // expects p_school_id, p_logo_url, p_signature_url
const PACKAGES_API = `${HOST}/academic/get/packages/`;
const SUBSCRIPTION_UPDATE_API = `${HOST}/academic/update/subscription/`; // GET
const TRANSACTIONS_API = `${HOST}/academic/get/transactions/`; // ?p_school_id=

/* ------------ External login (redirect after logout) ------------ */
const LOGIN_BASE = "https://app.schoolmasterhub.net//login/";

/* ------------ Paystack PUBLIC key (compile-time first, then runtime) ------------ */
const COMPILED_PS_PUBLIC =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY) ||
  process.env.REACT_APP_PAYSTACK_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
  "";

/* ------------ Support email for Premium requests ------------ */
const SUPPORT_EMAIL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPPORT_EMAIL) ||
  process.env.REACT_APP_SUPPORT_EMAIL ||
  "info@schoolmasterhub.net";

/* ------------ Role helpers & misc ------------ */
const roleLabelFrom = (raw) => {
  const v = String(raw || "").trim().toUpperCase();
  if (v === "AD" || v.includes("ADMIN")) return "Administrator";
  if (v === "HT" || v.includes("HEAD")) return "Head Teacher";
  if (v === "AC" || v.includes("ACCOUNT")) return "Accountant";
  if (v === "TE"  || v.includes("TEACH")) return "Teacher";
  return raw || "—";
};
const isAdminFrom = (raw) => /(^|\b)(AD|ADMIN|ADMINISTRATOR)(\b|$)/i.test(String(raw || ""));
const isHeadFrom  = (raw) => /(^|\b)(HT|HEAD ?TEACH(ER)?)(\b|$)/i.test(String(raw || ""));

const normalizePkgName = (s) => {
  const v = String(s || "").trim();
  if (/premiu?im/i.test(v)) return "Premium";
  if (/standard/i.test(v)) return "Standard";
  if (/basic/i.test(v)) return "Basic";
  return v || "—";
};
const pkgRank = (nameOrNum) => {
  const n = Number(nameOrNum);
  if (!Number.isNaN(n) && [1,2,3].includes(n)) return n;
  const v = normalizePkgName(nameOrNum);
  return v === "Basic" ? 1 : v === "Standard" ? 2 : v === "Premium" ? 3 : 0;
};

/* ------------ Discounts & limits ------------ */
const DISCOUNT_TIERS = { 3: 0.05, 6: 0.10, 12: 0.17 };
const MAX_MONTHS = 12;

/* ------------ Currency helpers ------------ */
const toSubunit = (amount) => Math.round(Number(amount || 0) * 100);
const channelsForCurrency = (cur) => {
  const c = String(cur || "").toUpperCase();
  if (c === "GHS") return ["card", "mobile_money", "bank_transfer"];
  if (c === "NGN") return ["card", "bank", "ussd", "qr", "bank_transfer"];
  return ["card"];
};

/* ------------ LocalStorage keys ------------ */
const LS_REF_KEY = "smh_ps_pending_ref";
const LS_META_KEY = "smh_ps_pending_meta";

/* ------------ Date helpers ------------ */
const parseISODate = (d) => {
  if (!d) return null;
  const s = String(d).slice(0, 10);
  const [y, m, dd] = s.split("-").map(Number);
  if (!y || !m || !dd) return null;
  return new Date(Date.UTC(y, m - 1, dd));
};
const addMonthsUTC = (date, months) => {
  if (!date) return null;
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};
const formatISO = (d) =>
  d ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}` : "—";
const formatDateOnly = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/* ------------ Paystack inline script helper (same page) ------------ */
function ensurePaystackScript() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop && typeof window.PaystackPop.setup === "function") {
      resolve(true);
      return;
    }
    const id = "paystack-inline-js";
    if (document.getElementById(id)) {
      const check = () => {
        if (window.PaystackPop) resolve(true);
        else setTimeout(check, 300);
      };
      check();
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error("Failed to load Paystack script."));
    document.body.appendChild(s);
  });
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const headers = useMemo(
    () => ({
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  // ===== NEW: Runtime Paystack key fallback =====
  const [psKey, setPsKey] = useState(COMPILED_PS_PUBLIC || "");
  const [psKeyLoaded, setPsKeyLoaded] = useState(!!COMPILED_PS_PUBLIC);

  useEffect(() => {
    // If not baked in at build time, fetch it from serverless at runtime.
    if (!COMPILED_PS_PUBLIC) {
      fetch("/api/paystack/public")
        .then((r) => r.json())
        .then((j) => setPsKey(j?.key || ""))
        .catch(() => setPsKey(""))
        .finally(() => setPsKeyLoaded(true));
    } else {
      setPsKeyLoaded(true);
    }
  }, []);

  // IDs
  const schoolId =
    user?.schoolId ?? user?.school_id ?? user?.school?.id ?? user?.SCHOOL_ID ?? null;
  const userId =
    user?.id ?? user?.userId ?? user?.USER_ID ?? user?.staff_id ?? user?.STAFF_ID ?? null;

  // UI
  const [banner, setBanner] = useState({ kind: "", msg: "" });
  const [loading, setLoading] = useState(false);

  // Profile/plan
  const [fullName, setFullName] = useState(user?.full_name || user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [roleRaw, setRoleRaw] = useState(user?.role || user?.userType || "");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [schoolName, setSchoolName] = useState(user?.school?.name || user?.school_name || "");

  const [plan, setPlan] = useState({
    package: user?.school?.package ?? null,
    currency: user?.school?.currency ?? "",
    expiry: user?.school?.expiry ?? "",
    status: user?.school?.status ?? "",
  });

  // Branding
  const [logoUrl, setLogoUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const [sigBusy, setSigBusy] = useState(false);
  const [logoMsg, setLogoMsg] = useState("");
  const [sigMsg, setSigMsg] = useState("");
  const logoInputRef = useRef(null);
  const sigInputRef = useRef(null);

  // Password modal
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState({ next: "", show: false });
  const canChangePwd = (pwd.next || "").length >= 8;

  // ===== Billing modal =====
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);

  // Packages / pricing
  const [pkgOptions, setPkgOptions] = useState([]); // ["Basic","Standard","Premium"]
  const [priceByPkg, setPriceByPkg] = useState({}); // { Basic: 100, ... }

  // Selections
  const [billing, setBilling] = useState({
    targetPackage: Number(user?.school?.package ?? 1) || 1,
    months: 12,
  });

  // Payment/request flow states
  const [pendingRef, setPendingRef] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [billingResult, setBillingResult] = useState(null);

  // Premium request states
  const [premiumRequested, setPremiumRequested] = useState(false);
  const [premiumError, setPremiumError] = useState("");

  // Currency from auth (authoritative)
  const accountCurrency =
    plan.currency ||
    user?.school?.currency ||
    user?.CURRENCY ||
    "GHS";

  // Helpers
  const jarr = async (url) => {
    const r = await fetch(url, { headers, cache: "no-store" });
    const t = (await r.text()).trim();
    if (!t) return [];
    try {
      const d = JSON.parse(t);
      return Array.isArray(d) ? d : Array.isArray(d.items) ? d.items : [];
    } catch {
      return [];
    }
  };

  // Fetch plan & staff
  useEffect(() => {
    (async () => {
      try {
        const schools = await jarr(SCHOOLS_LIST_API);
        if (schools?.length && schoolId != null) {
          const s = schools.find(
            (x) => String(x.school_id ?? x.SCHOOL_ID) === String(schoolId)
          );
          if (s) {
            setSchoolName(s.school_name ?? s.SCHOOL_NAME ?? schoolName);
            setPlan({
              package: s.package ?? s.PACKAGE ?? null,
              currency: s.currency ?? s.CURRENCY ?? "",
              expiry: s.expiry ?? s.EXPIRY ?? "",
              status: s.status ?? s.STATUS ?? "",
            });
            setLogoUrl(s.logo_url ?? s.LOGO_URL ?? "");
            setSignatureUrl(s.signature_url ?? s.SIGNATURE_URL ?? "");
            setBilling((b) => ({
              ...b,
              targetPackage: Number(s.package ?? s.PACKAGE ?? 1) || 1,
            }));
          }
        }
        if (schoolId) {
          const staff = await jarr(`${STAFF_LIST_API}?p_school_id=${encodeURIComponent(schoolId)}`);
          const me = staff.find((m) => String(m.user_id ?? m.USER_ID) === String(userId));
          if (me) {
            setFullName(me.full_name ?? me.FULL_NAME ?? fullName);
            setEmail(me.email ?? me.EMAIL ?? email);
            const roleVal = me.role ?? me.ROLE ?? roleRaw;
            setRoleRaw(roleVal);
            const av =
              me.image_url ??
              me.IMAGE_URL ??
              me.avatar_url ??
              me.AVATAR_URL ??
              "";
            setAvatarUrl(av);
          }
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, userId, token]);

  // Load package pricing when opening modal
  const loadPackages = async () => {
    try {
      const items = await jarr(PACKAGES_API);
      const filtered = (items || [])
        .map((x) => ({
          name: normalizePkgName(x.package_name ?? x.PACKAGE_NAME),
          currency: String(x.currency ?? x.CURRENCY ?? "").toUpperCase(),
          amount: Number(x.amount ?? x.AMOUNT ?? 0),
        }))
        .filter((x) => x.currency === String(accountCurrency).toUpperCase())
        .filter((x) => ["Basic", "Standard", "Premium"].includes(x.name));

      const map = {};
      for (const row of filtered) {
        if (!(row.name in map)) map[row.name] = row.amount;
        else map[row.name] = Math.min(map[row.name], row.amount);
      }
      setPriceByPkg(map);
      setPkgOptions(["Basic", "Standard", "Premium"].filter((n) => n in map));
      setBilling((b) => {
        const currentRank = pkgRank(b.targetPackage);
        const valid = ["Basic","Standard","Premium"].filter((n)=>n in map).map(pkgRank);
        const maxRank = Math.max(...valid);
        const newRank = Math.min(currentRank || 1, maxRank);
        const cappedMonths = Math.min(b.months || 1, MAX_MONTHS);
        return { ...b, targetPackage: newRank, months: cappedMonths };
      });
    } catch {
      setPriceByPkg({});
      setPkgOptions([]);
    }
  };

  /* ---------- Password ---------- */
  const submitPassword = async () => {
    const userIdVal =
      user?.id ?? user?.userId ?? user?.USER_ID ?? user?.staff_id ?? user?.STAFF_ID ?? null;

    if (!canChangePwd || !userIdVal) return;
    setLoading(true);
    setBanner({ kind: "", msg: "" });
    try {
      const qp = new URLSearchParams({
        p_user_id: String(userIdVal),
        p_password: String(pwd.next),
      });
      const url = `${RESET_PASSWORD_API}?${qp.toString()}`;
      const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setBanner({ kind: "success", msg: "Password updated successfully." });
      setPwd({ next: "", show: false });
      setPwdOpen(false);
    } catch (e) {
      setBanner({ kind: "error", msg: e?.message || "Password change failed." });
    } finally {
      setLoading(false);
      setTimeout(() => setBanner({ kind: "", msg: "" }), 4000);
    }
  };

  /* ---------- Download ---------- */
  const handleDownloadData = async () => {
    try {
      const payload = {
        profile: {
          id: userId,
          role: roleLabelFrom(roleRaw),
          fullName,
          email,
          schoolId,
          schoolName,
        },
        plan,
        branding: {
          logo_url: logoUrl || null,
          signature_url: signatureUrl || null,
        },
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `schoolmasterhub_mydata_${userId || "user"}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBanner({ kind: "success", msg: "Your data file has been generated." });
      setTimeout(() => setBanner({ kind: "", msg: "" }), 3000);
    } catch {
      setBanner({ kind: "error", msg: "Unable to prepare data for download." });
      setTimeout(() => setBanner({ kind: "", msg: "" }), 3000);
    }
  };

  /* ---------- Logout ---------- */
  const handleLogout = async () => {
    const ok = window.confirm("Are you sure you want to sign out?");
    if (!ok) return;
    try {
      await Promise.resolve(logout?.());
    } finally {
      const sid = schoolId ?? "";
      window.location.href = `${LOGIN_BASE}?p_school_id=${encodeURIComponent(sid)}`;
    }
  };

  /* ---------- Derived ---------- */
  const isAdmin = isAdminFrom(roleRaw);
  const isHead  = isHeadFrom(roleRaw);
  const currentPkgRank = pkgRank(plan.package);
  const pkgNum = Number(plan.package ?? 0);
  const currentPkgName =
    pkgNum === 1 ? "Basic" : pkgNum === 2 ? "Standard" : pkgNum === 3 ? "Premium" : String(plan.package ?? "—");

  const isPremiumSelected =
    Number(billing.targetPackage) === 3 ||
    normalizePkgName(billing.targetPackage) === "Premium";

  // Branding helpers
  const extFromName = (name) => {
    const e = String(name || "").split(".").pop()?.toLowerCase();
    if (!e) return "jpg";
    if (["jpg","jpeg","png","webp","gif"].includes(e)) return e === "jpeg" ? "jpg" : e;
    return "jpg";
  };
  const bust = (url) => {
    if (!url) return "";
    try {
      const u = new URL(url, window.location.origin);
      u.searchParams.set("_", Date.now().toString());
      return u.toString();
    } catch {
      return `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`;
    }
  };

  // Update branding
  const encodeForm = (obj) =>
    Object.entries(obj)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");

  const updateSchoolBrandingRobust = async ({ logo, signature }) => {
    const params = {
      p_school_id: String(schoolId),
      p_logo_url: String(logo ?? logoUrl ?? ""),
      p_signature_url: String(signature ?? signatureUrl ?? ""),
    };
    try {
      const r = await fetch(UPDATE_SCHOOL_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
        body: encodeForm(params),
      });
      if (r.ok) return true;
    } catch {}
    try {
      const qp = new URLSearchParams(params).toString();
      const r = await fetch(`${UPDATE_SCHOOL_API}?${qp}`, { method: "GET", headers });
      if (r.ok) return true;
    } catch {}
    const r = await fetch(UPDATE_SCHOOL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(params),
    });
    if (!r.ok) {
      const t = await r.text().catch(()=> "");
      throw new Error((t || `HTTP ${r.status}`).slice(0, 600));
    }
    return true;
  };

  const uploadLogo = async (file) => {
    if (!file || !isAdmin || !schoolId) return;
    setLogoBusy(true); setLogoMsg("");
    try {
      const ext = extFromName(file.name);
      const key = `schools/${schoolId}/branding/logo.${ext}`;
      await putToOCI(file, key);
      const publicUrl = buildPublicUrl(key);
      await updateSchoolBrandingRobust({ logo: publicUrl, signature: undefined });
      setLogoUrl(publicUrl);
      setLogoMsg("Logo updated successfully.");
    } catch (e) {
      setLogoMsg(e?.message || "Failed to upload logo.");
    } finally {
      setLogoBusy(false);
      setTimeout(() => setLogoMsg(""), 3500);
    }
  };

  const uploadSignature = async (file) => {
    if (!file || !isHead || !schoolId) return;
    setSigBusy(true); setSigMsg("");
    try {
      const ext = extFromName(file.name);
      const key = `schools/${schoolId}/branding/signature-ht.${ext}`;
      await putToOCI(file, key);
      const publicUrl = buildPublicUrl(key);
      await updateSchoolBrandingRobust({ logo: undefined, signature: publicUrl });
      setSignatureUrl(publicUrl);
      setSigMsg("Signature updated successfully.");
    } catch (e) {
      setSigMsg(e?.message || "Failed to upload signature.");
    } finally {
      setSigBusy(false);
      setTimeout(() => setSigMsg(""), 3500);
    }
  };

  // ===== Expiry & pricing =====
  const currentExpiry = parseISODate(plan.expiry);
  const nowUTC = new Date();

  const targetPkgName =
    billing.targetPackage === 1 ? "Basic" :
    billing.targetPackage === 2 ? "Standard" :
    billing.targetPackage === 3 ? "Premium" : "—";

  const monthlyPrice = Number(priceByPkg?.[targetPkgName] ?? 0);
  const months = Math.min(Number(billing.months) || 1, MAX_MONTHS);
  const subtotal = monthlyPrice * months;
  const discountRate = DISCOUNT_TIERS[months] || 0;
  const discount = subtotal * discountRate;
  const totalAmount = Math.max(0, subtotal - discount);

  const action = pkgRank(billing.targetPackage) > currentPkgRank ? "UPGRADE" : "EXTEND";
  const effectiveBase =
    action === "EXTEND"
      ? (currentExpiry && currentExpiry > nowUTC ? currentExpiry : nowUTC)
      : nowUTC;
  const previewExpiry = addMonthsUTC(effectiveBase, months);
  const previewExpiryISO = formatISO(previewExpiry);

  // ===== Paystack (inline) + fallback via Vercel API =====
  const buildReference = () =>
    `SCH-${schoolId || "NA"}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`.replace(/[^a-zA-Z0-9.\-=]/g,"");

  const persistPending = (ref, meta) => {
    try { localStorage.setItem(LS_REF_KEY, ref); } catch {}
    try { localStorage.setItem(LS_META_KEY, JSON.stringify(meta)); } catch {}
    setPendingRef(ref);
  };
  const clearPending = () => {
    try { localStorage.removeItem(LS_REF_KEY); } catch {}
    try { localStorage.removeItem(LS_META_KEY); } catch {}
    setPendingRef(null);
    setPollCount(0);
    setVerifying(false);
  };
  const readPendingMeta = () => {
    try {
      const s = localStorage.getItem(LS_META_KEY);
      if (!s) return null;
      return JSON.parse(s);
    } catch { return null; }
  };

  // ---- Premium request email helpers (NO mailto) ----
  const buildPremiumEmail = () => {
    const subject = `Premium Upgrade Request - ${schoolName || "School"} (ID: ${schoolId})`;
    const lines = [
      `Hello Team,`,
      ``,
      `A Premium upgrade has been requested via Settings.`,
      ``,
      `Requester: ${fullName || "Unknown"} <${email || "no-email"}>`,
      `School: ${schoolName || "—"} (ID: ${schoolId})`,
      `Current Package: ${currentPkgName}`,
      `Requested Package: Premium`,
      `Duration: ${months} month(s)`,
      `Currency: ${String(accountCurrency).toUpperCase()}`,
      monthlyPrice ? `Current Premium Monthly Price (for ref): ${String(accountCurrency).toUpperCase()} ${Number(monthlyPrice).toLocaleString()}` : null,
      `Projected New Expiry: ${previewExpiryISO}`,
      ``,
      `Please reach out to the requester to complete Premium onboarding and billing.`,
      ``,
      `— Automated message from School Master Hub`,
    ].filter(Boolean).join("\n");
    return { subject, body: lines };
  };

  const requestPremiumUpgrade = async () => {
    if (!schoolId) {
      setPremiumError("Missing school ID.");
      return;
    }
    if (!email) {
      setPremiumError("Missing requester email.");
      return;
    }

    setPremiumError("");
    setBillingBusy(true);

    const { subject, body } = buildPremiumEmail();

    try {
      // Use your backend mail endpoint (no mailto fallback)
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: [SUPPORT_EMAIL, email].filter(Boolean),
          subject,
          message: body,
          fromName: schoolName || "School Master Hub",
        }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Failed to send Premium request email.");
      }

      setPremiumRequested(true);
      setBanner({ kind: "success", msg: "Premium request sent. We’ll contact you to onboard." });
      setTimeout(() => setBanner({ kind: "", msg: "" }), 6000);
    } catch (e) {
      setPremiumError(e?.message || "Unable to send Premium request.");
    } finally {
      setBillingBusy(false);
    }
  };

  const startPaystackPayment = async () => {
    if (isPremiumSelected) {
      // Guard: Premium never uses Paystack directly
      setPremiumError("Premium requires assisted onboarding. Please use the Request button.");
      return;
    }

    if (!schoolId) {
      setBanner({ kind: "error", msg: "Missing school ID." });
      return;
    }
    if (!email) {
      setBanner({ kind: "error", msg: "Missing user email for Paystack." });
      return;
    }
    if (!totalAmount || totalAmount <= 0) {
      setBanner({ kind: "error", msg: "Invalid amount." });
      return;
    }

    const publicKey = psKey;
    if (!psKeyLoaded) {
      setBanner({ kind: "error", msg: "Loading billing… please try again in a moment." });
      return;
    }
    if (!publicKey) {
      setBanner({ kind: "error", msg: "Missing Paystack public key (env)." });
      return;
    }

    setBillingBusy(true);
    try {
      const reference = buildReference();
      const currency = String(accountCurrency).toUpperCase();
      const amountSubunit = toSubunit(totalAmount);

      const meta = {
        school_id: schoolId,
        action,
        months,
        package: billing.targetPackage,
        package_name: targetPkgName,
        subtotal,
        discount_rate: discountRate,
        discount_amount: discount,
        total: totalAmount,            // base units for DB
        next_expiry: previewExpiryISO,
        requested_by: userId || null,  // numeric preferred
      };
      persistPending(reference, meta);

      // Try inline popup
      await ensurePaystackScript();
      if (!window.PaystackPop || typeof window.PaystackPop.setup !== "function") {
        throw new Error("Inline popup unavailable.");
      }

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email,
        amount: amountSubunit,                 // subunits
        currency,
        ref: reference,
        channels: channelsForCurrency(currency),
        metadata: meta,
        callback: async () => {
          setBillingOpen(false); // close modal on success
          setBanner({ kind: "success", msg: "Payment submitted. Verifying…" });
          await verifyNow(reference);
        },
        onClose: () => {
          setBanner({ kind: "error", msg: "Payment was not completed." });
        },
      });

      handler.openIframe(); // SAME PAGE
    } catch (e) {
      // Fallback: same-tab redirect via our serverless init (secret stays server-side)
      try {
        const callback_url = `${window.location.origin}/settings?pscb=1`;
        const payload = {
          email,
          amount: String(toSubunit(totalAmount)),
          currency: String(accountCurrency).toUpperCase(),
          channels: channelsForCurrency(String(accountCurrency).toUpperCase()),
          reference: localStorage.getItem(LS_REF_KEY) || buildReference(),
          callback_url,
          metadata: readPendingMeta() || {},
        };
        const initRes = await fetch("/api/paystack/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const initJson = await initRes.json();
        if (!initJson?.status) {
          throw new Error(initJson?.message || "Failed to initialize payment.");
        }
        const authUrl = initJson?.data?.authorization_url;
        if (!authUrl) throw new Error("No authorization URL returned by Paystack.");
        setBillingOpen(false);
        window.location.href = authUrl; // same tab
      } catch (e2) {
        setBanner({ kind: "error", msg: e2?.message || e?.message || "Unable to start payment." });
        setTimeout(() => setBanner({ kind: "", msg: "" }), 5000);
        setVerifying(false);
        clearPending();
      }
    } finally {
      setBillingBusy(false);
    }
  };

  const sendReceiptEmail = async ({ reference, amount, currency, months, package_name, next_expiry, paid_at }) => {
    try {
      const lines = [
        `Hi ${fullName || "there"},`,
        ``,
        `Payment received successfully.`,
        ``,
        `Reference: ${reference}`,
        `Amount: ${currency} ${Number(amount || 0).toLocaleString()}`,
        `Package: ${package_name}`,
        `Duration: ${months} month(s)`,
        `New Expiry: ${next_expiry}`,
        `Paid At: ${String(paid_at).replace("T"," ").replace("Z","")}`,
        ``,
        `Thank you for using School Master Hub.`,
      ].join("\n");

      // Keep existing receipt endpoint (adjust if your backend expects /send-mail here too)
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: [email],
          subject: "Payment Receipt - School Master Hub",
          message: lines,
          fromName: schoolName || "School Master Hub",
        }),
      });
    } catch {
      // Silently ignore email errors on the client
    }
  };

  // ===== [TXNS] Transactions state & helpers =====
  const [txns, setTxns] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");

  const downloadBlob = (data, filename, mime) => {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toCSV = (rows) => {
    if (!rows?.length)
      return "school_id,amount,currency,no_months,status,paystack_ref,next_expiry,paid_at,created_at\n";
    const headers = [
      "school_id",
      "amount",
      "currency",
      "no_months",
      "status",
      "paystack_ref",
      "next_expiry",
      "paid_at",
      "created_at",
    ];
    const esc = (v) => {
      const s = String(v ?? "");
      return /[\",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
    return lines.join("\n");
  };

  const downloadTxReport = (format = "csv") => {
    if (!txns?.length) {
      setBanner({ kind: "error", msg: "No transactions to download." });
      setTimeout(() => setBanner({ kind: "", msg: "" }), 2500);
      return;
    }
    const fnBase = `smh_transactions_${schoolId}_${new Date()
      .toISOString()
      .slice(0, 10)}`;
    if (format === "json") {
      downloadBlob(JSON.stringify(txns, null, 2), `${fnBase}.json`, "application/json");
    } else {
      downloadBlob(toCSV(txns), `${fnBase}.csv`, "text/csv");
    }
    setBanner({ kind: "success", msg: `Report downloaded (${format.toUpperCase()}).` });
    setTimeout(() => setBanner({ kind: "", msg: "" }), 2500);
  };

  // ===== Payment verification =====
  const verifyNow = async (forcedRef) => {
    const ref = forcedRef || localStorage.getItem(LS_REF_KEY);
    if (!ref) {
      setBanner({ kind: "error", msg: "No pending payment reference found." });
      setTimeout(() => setBanner({ kind: "", msg: "" }), 4000);
      return;
    }
    setVerifying(true);
    try {
      // Verify via our serverless function (secret stays server-side)
      const vRes = await fetch(`/api/paystack/verify?ref=${encodeURIComponent(ref)}`);
      const vJson = await vRes.json();
      if (!vJson?.status) throw new Error(vJson?.message || "Verification failed.");
      const data = vJson.data;
      const status = data?.status;
      if (status !== "success") {
        setBanner({ kind: "error", msg: `Payment not successful (${status || "unknown"})` });
        setTimeout(() => setBanner({ kind: "", msg: "" }), 6000);
        return;
      }

      const paystack_txn_id = data?.id;
      const paid_at = data?.paid_at || data?.paidAt || new Date().toISOString();
      const message = data?.gateway_response || data?.message || "";
      const paystack_ref = data?.reference || ref;

      // Get meta (prefer Paystack's metadata, else local)
      let meta = {};
      if (data?.metadata) {
        if (typeof data.metadata === "string") {
          try {
            meta = JSON.parse(data.metadata);
          } catch {}
        } else if (typeof data.metadata === "object") meta = data.metadata;
      }
      if (!meta || !meta.school_id) {
        const localMeta = readPendingMeta();
        if (localMeta) meta = localMeta;
      }

      const mMonths = Math.min(Number(meta?.months) ||  months, MAX_MONTHS);
      const mPackage = Number(meta?.package) || billing.targetPackage;
      const mPackageName =
        meta?.package_name ||
        (mPackage === 1
          ? "Basic"
          : mPackage === 2
          ? "Standard"
          : mPackage === 3
          ? "Premium"
          : "—");
      const mTotal = Number(meta?.total) || totalAmount; // base units for DB
      const mNextExpiry = meta?.next_expiry || previewExpiryISO;
      const requestedByNumber = Number(userId || meta?.requested_by || 0) || null;

      // Persist to DB via GET (as per PL/SQL)
      const dbPayload = {
        p_school_id: String(schoolId),
        p_package: String(mPackage),
        p_no_months: String(mMonths),
        p_amount: String(mTotal), // base currency units
        p_currency: String(accountCurrency).toUpperCase(),
        p_paystack_ref: String(paystack_ref),
        p_paystack_txn_id: String(paystack_txn_id || ""),
        p_status: "Paid",
        p_message: String(message || "Paid"),
        p_requested_by: requestedByNumber != null ? String(requestedByNumber) : "",
        p_paid_at: formatDateOnly(paid_at), // YYYY-MM-DD
        p_next_expiry: mNextExpiry,         // YYYY-MM-DD
      };
      const qp = new URLSearchParams(dbPayload).toString();
      const resp = await fetch(`${SUBSCRIPTION_UPDATE_API}?${qp}`, {
        method: "GET",
        headers,
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(errText || "Failed to update subscription in DB (GET).");
      }

      // Refresh plan (ignore errors)
      try {
        const schools = await jarr(SCHOOLS_LIST_API);
        if (schools?.length && schoolId) {
          const s = schools.find(
            (x) => String(x.school_id ?? x.SCHOOL_ID) === String(schoolId)
          );
          if (s) {
            setPlan({
              package: s.package ?? s.PACKAGE ?? null,
              currency: s.currency ?? s.CURRENCY ?? "",
              expiry: s.expiry ?? s.EXPIRY ?? "",
              status: s.status ?? s.STATUS ?? "",
            });
          }
        }
      } catch {}

      // Success result + email
      const result = {
        status: "success",
        reference: paystack_ref,
        amount: mTotal,
        currency: String(accountCurrency).toUpperCase(),
        months: mMonths,
        package_name: mPackageName,
        next_expiry: mNextExpiry,
        paid_at,
      };
      setBillingResult(result);
      setVerifying(false);
      setBanner({ kind: "success", msg: "Payment verified and subscription updated." });

      // Fire-and-forget email
      sendReceiptEmail(result);

      clearPending();

      // Refresh transactions list after success
      try {
        if (schoolId) {
          const url = `${TRANSACTIONS_API}?p_school_id=${encodeURIComponent(schoolId)}`;
          const arr = await jarr(url);
          const norm = (arr || []).map((x) => ({
            school_id: x.school_id ?? x.SCHOOL_ID ?? null,
            amount: Number(x.amount ?? x.AMOUNT ?? 0),
            currency: String(x.currency ?? x.CURRENCY ?? "").toUpperCase(),
            paystack_ref: x.paystack_ref ?? x.PAYSTACK_REF ?? "",
            paystack_txn_id: x.paystack_txn_id ?? x.PAYSTACK_TXN_ID ?? "",
            status: x.status ?? x.STATUS ?? "",
            message: x.message ?? x.MESSAGE ?? "",
            requested_by: x.requested_by ?? x.REQUESTED_BY ?? null,
            paid_at: x.paid_at ?? x.PAID_AT ?? "",
            created_at: x.created_at ?? x.CREATED_AT ?? "",
            next_expiry: x.next_expiry ?? x.NEXT_EXPIRY ?? "",
            no_months: Number(x.no_months ?? x.NO_MONTHS ?? 0),
          }));
          norm.sort(
            (a, b) =>
              String(b.created_at).localeCompare(String(a.created_at)) ||
              String(b.paid_at).localeCompare(String(a.paid_at))
          );
          setTxns(norm);
        }
      } catch {}

      setTimeout(() => setBanner({ kind: "", msg: "" }), 6000);
    } catch (e) {
      setBanner({ kind: "error", msg: e?.message || "Payment verification failed." });
      setTimeout(() => setBanner({ kind: "", msg: "" }), 6000);
    }
  };

  // Poll verification while in "waiting" state (every 6s up to ~5 mins)
  useEffect(() => {
    if (!verifying || !pendingRef) return;
    if (pollCount > 50) return; // ~5 min at 6s
    const t = setTimeout(async () => {
      setPollCount((c) => c + 1);
      await verifyNow();
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifying, pendingRef, pollCount]);

  // On load, resume any pending payment
  useEffect(() => {
    const ref = localStorage.getItem(LS_REF_KEY);
    if (ref) {
      setPendingRef(ref);
      setBillingOpen(true);
      setVerifying(true);
    }
  }, []);

  // [TXNS] Fetch transactions for this school (initial load / auth change)
  const [txLoading2, setTxLoading2] = useState(false); // keep original names intact
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      setTxLoading(true);
      setTxError("");
      try {
        const url = `${TRANSACTIONS_API}?p_school_id=${encodeURIComponent(schoolId)}`;
        const arr = await jarr(url);
        const norm = (arr || []).map((x) => ({
          school_id: x.school_id ?? x.SCHOOL_ID ?? null,
          amount: Number(x.amount ?? x.AMOUNT ?? 0),
          currency: String(x.currency ?? x.CURRENCY ?? "").toUpperCase(),
          paystack_ref: x.paystack_ref ?? x.PAYSTACK_REF ?? "",
          paystack_txn_id: x.paystack_txn_id ?? x.PAYSTACK_TXN_ID ?? "",
          status: x.status ?? x.STATUS ?? "",
          message: x.message ?? x.MESSAGE ?? "",
          requested_by: x.requested_by ?? x.REQUESTED_BY ?? null,
          paid_at: x.paid_at ?? x.PAID_AT ?? "",
          created_at: x.created_at ?? x.CREATED_AT ?? "",
          next_expiry: x.next_expiry ?? x.NEXT_EXPIRY ?? "",
          no_months: Number(x.no_months ?? x.NO_MONTHS ?? 0),
        }));
        norm.sort(
          (a, b) =>
            String(b.created_at).localeCompare(String(a.created_at)) ||
            String(b.paid_at).localeCompare(String(a.paid_at))
        );
        setTxns(norm);
      } catch (e) {
        setTxError(e?.message || "Failed to load transactions.");
      } finally {
        setTxLoading(false);
      }
    })();
  }, [schoolId, token]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </button>

          <button
            onClick={() => {
              setBanner({ kind: "success", msg: "Settings are up to date." });
              setTimeout(() => setBanner({ kind: "", msg: "" }), 2200);
            }}
            className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </button>
        </div>

        {/* Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <SettingsIcon className="h-6 w-6 mr-3 text-blue-600" />
                  Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account basics</p>
              </div>
              {banner.msg && (
                <div
                  className={`px-3 py-2 rounded-lg text-sm ${
                    banner.kind === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : banner.kind === "error"
                      ? "bg-red-50 text-red-800 border border-red-200"
                      : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                  }`}
                >
                  {banner.msg}
                </div>
              )}
            </div>
          </div>

          {/* Profile summary */}
          <div className="p-6">
            <div className="flex gap-4 items-center">
              <div className="h-16 w-16 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : (
                  <UserRound className="h-7 w-7 text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {fullName || "User"}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <MailIcon className="h-4 w-4" />
                  <span>{email || "—"}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>{roleLabelFrom(roleRaw)}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{schoolName || schoolId || "—"}</span>
                </div>
              </div>
            </div>

            {/* Quick preference: Dark mode only */}
            <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <label className="flex items-center justify-between">
                <span className="text-gray-800 dark:text-gray-200 font-medium flex items-center gap-2">
                  <Moon className="h-5 w-5 text-purple-600" />
                  Dark Mode
                </span>
                <input
                  type="checkbox"
                  checked={theme === "dark"}
                  onChange={() => toggleTheme()}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>

            {/* ===== Dev hint for public key ===== */}
            {!psKey && psKeyLoaded && (
              <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-sm">
                <div className="font-medium">Paystack key not found.</div>
                <div className="mt-1">
                  Set <code>VITE_PAYSTACK_PUBLIC_KEY</code> or <code>REACT_APP_PAYSTACK_PUBLIC_KEY</code> in Vercel env and redeploy,
                  or ensure <code>/api/paystack/public</code> returns a value.
                </div>
              </div>
            )}

            {/* === Branding (logo & signature) === */}
            <div className="mt-6 grid gap-4">
              {isAdmin && (
                <section className="rounded-lg p-4 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      School Logo (Admin)
                    </h3>
                  </div>

                  <div className="mt-3 flex items-center gap-4">
                    <div className="h-16 w-16 rounded bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center overflow-hidden">
                      {logoUrl ? (
                        <img src={bust(logoUrl)} alt="Logo" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-500 px-2">No logo</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => uploadLogo(e.target.files?.[0])}
                      />
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoBusy}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                        type="button"
                      >
                        {logoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {logoBusy ? "Uploading…" : "Upload Logo"}
                      </button>
                      {logoMsg && (
                        <span
                          className={`text-sm inline-flex items-center gap-1 ${
                            /success|updated/i.test(logoMsg) ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {/updated|success/i.test(logoMsg) ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          {logoMsg}
                        </span>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {isHead && (
                <section className="rounded-lg p-4 border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-100 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Headteacher Signature
                    </h3>
                  </div>

                  <div className="mt-3 flex items-center gap-4">
                    <div className="h-16 w-28 rounded bg-white dark:bg-gray-900 border border-sky-200 dark:border-sky-800 flex items-center justify-center overflow-hidden">
                      {signatureUrl ? (
                        <img src={bust(signatureUrl)} alt="Signature" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-500 px-2">No signature</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        ref={sigInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => uploadSignature(e.target.files?.[0])}
                      />
                      <button
                        onClick={() => sigInputRef.current?.click()}
                        disabled={sigBusy}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
                        type="button"
                      >
                        {sigBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {sigBusy ? "Uploading…" : "Upload Signature"}
                      </button>
                      {sigMsg && (
                        <span
                          className={`text-sm inline-flex items-center gap-1 ${
                            /success|updated/i.test(sigMsg) ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {/updated|success/i.test(sigMsg) ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          {sigMsg}
                        </span>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* ADMIN-ONLY: Plan & Billing */}
            {isAdmin && (
              <section className="mt-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Plan & Billing (Admin)
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Package</div>
                    <div className="text-base font-semibold">
                      {currentPkgName}
                      {plan.currency ? (
                        <span className="text-xs font-normal text-gray-500 ml-2">({plan.currency})</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Status</div>
                    <div className="text-base font-semibold">{String(plan.status || "—")}</div>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" /> Expiry
                    </div>
                    <div className="text-base font-semibold">
                      {plan.expiry ? String(plan.expiry).slice(0, 10) : "—"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2">
                      <Banknote className="h-4 w-4" /> Currency
                    </div>
                    <div className="text-base font-semibold">{accountCurrency || "—"}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await loadPackages();
                      setBillingResult(null);
                      setVerifying(false);
                      setPremiumRequested(false);
                      setPremiumError("");
                      setPollCount(0);
                      setBillingOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Upgrade / Extend Plan
                  </button>
                </div>
              </section>
            )}

            {/* [TXNS] Subscription Transactions */}
            {isAdmin && (
              <section className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Subscription Transactions
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadTxReport("csv")}
                      className="px-3 py-1.5 rounded-lg border bg-white dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                    >
                      Download CSV
                    </button>
                    <button
                      onClick={() => downloadTxReport("json")}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
                    >
                      Download JSON
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  {txLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading transactions…
                    </div>
                  ) : txError ? (
                    <div className="flex items-center gap-2 text-sm text-rose-700">
                      <AlertCircle className="h-4 w-4" />
                      {txError}
                    </div>
                  ) : txns.length === 0 ? (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      No transactions yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-xs uppercase text-gray-500">
                          <tr className="text-left">
                            <th className="py-2 pr-4">Paid&nbsp;At</th>
                            <th className="py-2 pr-4">Amount</th>
                            <th className="py-2 pr-4">Months</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Reference</th>
                            <th className="py-2 pr-4">Next&nbsp;Expiry</th>
                            <th className="py-2 pr-4">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                          {txns.slice(0, 20).map((t, idx) => (
                            <tr key={`${t.paystack_ref}-${idx}`} className="align-top">
                              <td className="py-2 pr-4">
                                {String(t.paid_at || "").slice(0, 10)}
                              </td>
                              <td className="py-2 pr-4 font-medium">
                                {t.currency} {Number(t.amount || 0).toLocaleString()}
                              </td>
                              <td className="py-2 pr-4">{t.no_months || 0}</td>
                              <td className="py-2 pr-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs ${
                                    /paid|success/i.test(t.status)
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : /fail|declin|abandon/i.test(t.status)
                                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                                      : "bg-gray-50 text-gray-700 border border-gray-200"
                                  }`}
                                >
                                  {t.status || "—"}
                                </span>
                              </td>
                              <td className="py-2 pr-4">
                                <code className="text-xs break-all">
                                  {t.paystack_ref || "—"}
                                </code>
                              </td>
                              <td className="py-2 pr-4">
                                {String(t.next_expiry || "").slice(0, 10) || "—"}
                              </td>
                              <td className="py-2 pr-4">
                                {String(t.created_at || "")
                                  .replace("T", " ")
                                  .replace("Z", "")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {txns.length > 20 && (
                        <div className="text-xs text-gray-500 mt-2">
                          Showing the latest 20 of {txns.length}. Use Download to get the full report.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Actions */}
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => setPwdOpen(true)}
                className="w-full text-left p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      <KeyRound className="h-5 w-5" />
                      Change Password
                    </span>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Update your account password
                    </p>
                  </div>
                  <Eye className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
              </button>

              <button
                onClick={handleDownloadData}
                className="w-full text-left p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Download My Data
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Export your account information
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="sm:col-span-2 w-full text-left p-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-red-200 dark:border-red-800"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-red-900 dark:text-red-100 flex items-center gap-2">
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Billing Modal */}
        {billingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Package className="h-5 w-5" />{" "}
                  {billingResult?.status === "success"
                    ? "Payment Successful"
                    : premiumRequested
                    ? "Premium Request Sent"
                    : verifying
                    ? "Waiting for Payment"
                    : "Plan Change"}
                </h3>
                <button
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    setBillingOpen(false);
                    setBillingResult(null);
                    setVerifying(false);
                    setPremiumRequested(false);
                    setPremiumError("");
                  }}
                  aria-label="Close"
                >
                  <EyeOff className="h-4 w-4" />
                </button>
              </div>

              {/* Premium request success view */}
              {premiumRequested ? (
                <div className="p-6">
                  <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 mt-0.5" />
                    <div>
                      <div className="font-semibold text-emerald-800 dark:text-emerald-200">
                        Thanks! Your Premium upgrade request was sent.
                      </div>
                      <div className="text-sm text-emerald-900/80 dark:text-emerald-200/80 mt-1">
                        Our team will reach out to complete onboarding and billing.
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 text-sm space-y-1.5">
                    <Row label="Requester" value={`${fullName || "—"} (${email || "—"})`} />
                    <Row label="School" value={`${schoolName || "—"} `} />
                    <Row label="Requested Package" value="Premium" />
                    <Row label="Duration" value={`${months} month(s)`} />
                    <Row label="Currency" value={String(accountCurrency).toUpperCase()} />
                    <Row label="Projected New Expiry" value={previewExpiryISO} />
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={() => {
                        setBillingOpen(false);
                        setPremiumRequested(false);
                      }}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : billingResult?.status === "success" ? (
                // Thank You view (Paystack success)
                <div className="p-6">
                  <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 mt-0.5" />
                    <div>
                      <div className="font-semibold text-emerald-800 dark:text-emerald-200">
                        Thank you! Your payment was successful.
                      </div>
                      <div className="text-sm text-emerald-900/80 dark:text-emerald-200/80 mt-1">
                        Your subscription has been updated. Details are below.
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 text-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span>Reference</span>
                      <span className="font-medium">{billingResult.reference}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Amount</span>
                      <span className="font-medium">
                        {billingResult.currency}{" "}
                        {Number(billingResult.amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Package</span>
                      <span className="font-medium">{billingResult.package_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Duration</span>
                      <span className="font-medium">{billingResult.months} month(s)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>New Expiry</span>
                      <span className="font-medium">{billingResult.next_expiry}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Paid At</span>
                      <span className="font-medium">
                        {String(billingResult.paid_at).replace("T", " ").replace("Z", "")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={() => {
                        setBillingOpen(false);
                        setBillingResult(null);
                      }}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : verifying ? (
                // Waiting / Verify view
                <>
                  <div className="p-6">
                    <div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                      <div className="flex items-start gap-3">
                        <Loader2 className="h-5 w-5 mt-0.5 animate-spin" />
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <div className="font-medium">Complete your payment in the popup</div>
                          <div className="mt-1">
                            Once you’re done, click{" "}
                            <span className="font-semibold">Verify Now</span> below.
                            We’ll also check automatically every few seconds.
                          </div>
                          {pendingRef && (
                            <div className="mt-2 text-xs text-gray-500">
                              Reference: {pendingRef}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 text-sm space-y-1.5">
                      <Row label="Currency" value={String(accountCurrency).toUpperCase()} />
                      <Row label="Package" value={targetPkgName} />
                      <Row label="Duration" value={`${months} month(s)`} />
                      <Row
                        label="Subtotal"
                        value={`${String(accountCurrency).toUpperCase()} ${Number(subtotal || 0).toLocaleString()}`}
                      />
                      {discountRate > 0 && (
                        <Row
                          label={`Discount (${Math.round(discountRate * 100)}%)`}
                          value={`- ${String(accountCurrency).toUpperCase()} ${Number(discount || 0).toLocaleString()}`}
                        />
                      )}
                      <div className="flex items-center justify-between border-t dark:border-gray-700 pt-2">
                        <span>Total</span>
                        <span className="font-semibold">
                          {String(accountCurrency).toUpperCase()}{" "}
                          {Number(totalAmount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t dark:border-gray-700 flex items-center justify-between">
                        <span>Next Expiry</span>
                        <span className="font-semibold">{previewExpiryISO}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => verifyNow()}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Verify Now
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                // Selection & summary view
                <>
                  <div className="p-5 space-y-5">
                    {/* Premium info banner */}
                    {isPremiumSelected && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        Premium requires assisted onboarding. We’ll send a request email to our team (and a copy to you). No payment will be taken now.
                      </div>
                    )}

                    {/* Inline error for Premium path */}
                    {isPremiumSelected && premiumError && (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                        {premiumError}
                      </div>
                    )}

                    {/* LOVs */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Package</label>
                        <select
                          className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
                          value={billing.targetPackage}
                          onChange={(e) =>
                            setBilling((b) => ({
                              ...b,
                              targetPackage: Number(e.target.value),
                            }))
                          }
                        >
                          {pkgOptions.includes("Basic") && <option value={1}>Basic (1)</option>}
                          {pkgOptions.includes("Standard") && (
                            <option value={2}>Standard (2)</option>
                          )}
                          {pkgOptions.includes("Premium") && (
                            <option value={3}>Premium (3)</option>
                          )}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Current: {currentPkgName}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Duration (months)</label>
                        <select
                          className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
                          value={Math.min(billing.months, MAX_MONTHS)}
                          onChange={(e) => {
                            const m = Math.min(Number(e.target.value) || 1, MAX_MONTHS);
                            setBilling((b) => ({ ...b, months: m }));
                          }}
                        >
                          {[1, 3, 6, 12].map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                        <Row
                          label="Detected Action"
                          value={pkgRank(billing.targetPackage) > currentPkgRank ? "UPGRADE" : "EXTEND"}
                          emphasize
                        />
                        <Row label="Currency" value={String(accountCurrency).toUpperCase()} />
                        <Row
                          label="Monthly Price"
                          value={`${String(accountCurrency).toUpperCase()} ${Number(monthlyPrice || 0).toLocaleString()}`}
                        />
                        <Row label="Duration" value={`${months} month(s)`} />
                        {!isPremiumSelected && (
                          <>
                            <Row
                              label="Subtotal"
                              value={`${String(accountCurrency).toUpperCase()} ${Number(subtotal || 0).toLocaleString()}`}
                            />
                            {discountRate > 0 && (
                              <Row
                                label={`Discount (${Math.round(discountRate * 100)}%)`}
                                value={`- ${String(accountCurrency).toUpperCase()} ${Number(discount || 0).toLocaleString()}`}
                              />
                            )}
                            <div className="flex items-center justify-between border-t dark:border-gray-700 pt-2">
                              <span>Total</span>
                              <span className="font-semibold">
                                {String(accountCurrency).toUpperCase()}{" "}
                                {Number(totalAmount || 0).toLocaleString()}
                              </span>
                            </div>
                          </>
                        )}
                        <div className="mt-2 pt-2 border-t dark:border-gray-700 flex items-center justify-between">
                          <span>
                            {pkgRank(billing.targetPackage) > currentPkgRank
                              ? "Next Expiry"
                              : "New Expiry"}
                          </span>
                          <span className="font-semibold">{previewExpiryISO}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">
                      {isPremiumSelected
                        ? "No payment will be taken online for Premium. We’ll contact you to finalize onboarding and billing."
                        : "We'll use a secure Paystack popup on this page. If your browser blocks it, we'll redirect in this same tab."}
                    </p>
                  </div>

                  <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setBillingOpen(false);
                        setBillingResult(null);
                        setPremiumRequested(false);
                        setPremiumError("");
                      }}
                      className="px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={isPremiumSelected ? requestPremiumUpgrade : startPaystackPayment}
                      disabled={billingBusy}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {billingBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {billingBusy
                        ? (isPremiumSelected ? "Sending…" : "Starting…")
                        : (isPremiumSelected ? "Request Premium Upgrade" : "Proceed to Billing")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Small UI helper for rows */
function Row({ label, value, emphasize }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={emphasize ? "font-semibold text-indigo-700" : "font-semibold"}>
        {value}
      </span>
    </div>
  );
}
