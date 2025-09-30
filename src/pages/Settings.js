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

/* ------------ External login (redirect after logout) ------------ */
const LOGIN_BASE = "https://app.schoolmasterhub.net//login/";
const BILLING_BASE = "https://app.schoolmasterhub.net/billing/";

/* ------------ Role helpers ------------ */
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

  // Basic ids
  const schoolId =
    user?.schoolId ?? user?.school_id ?? user?.school?.id ?? user?.SCHOOL_ID ?? null;
  const userId =
    user?.id ?? user?.userId ?? user?.USER_ID ?? user?.staff_id ?? user?.STAFF_ID ?? null;

  // Local UI
  const [banner, setBanner] = useState({ kind: "", msg: "" });
  const [loading, setLoading] = useState(false);

  // Live profile bits
  const [fullName, setFullName] = useState(user?.full_name || user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [roleRaw, setRoleRaw] = useState(user?.role || user?.userType || "");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [schoolName, setSchoolName] = useState(user?.school?.name || user?.school_name || "");

  // Plan (admin only)
  const [plan, setPlan] = useState({
    package: user?.school?.package ?? null,
    currency: user?.school?.currency ?? "",
    expiry: user?.school?.expiry ?? "",
    status: user?.school?.status ?? "",
  });

  // === Branding (logo & signature) ===
  const [logoUrl, setLogoUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const [sigBusy, setSigBusy] = useState(false);
  const [logoMsg, setLogoMsg] = useState("");
  const [sigMsg, setSigMsg] = useState("");
  const logoInputRef = useRef(null);
  const sigInputRef = useRef(null);

  // Change Password modal
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState({ next: "", show: false });
  const canChangePwd = (pwd.next || "").length >= 8;

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

  // Fetch school (plan + branding) + staff (self) from live APIs
  useEffect(() => {
    (async () => {
      try {
        // School list (includes package, status, expiry, currency, MAY include logo/signature)
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
          }
        }

        // Current staff profile
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
      } catch {
        // keep fallbacks
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, userId, token]);

  /* ---------- Actions ---------- */
  const submitPassword = async () => {
    if (!canChangePwd || !userId) return;
    setLoading(true);
    setBanner({ kind: "", msg: "" });
    try {
      // GET per your procedure
      const qp = new URLSearchParams({
        p_user_id: String(userId),
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

  // Keep your custom logout redirect with ?p_school_id=<id>
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
  const pkgNum = Number(plan.package ?? 0);
  const pkgName =
    pkgNum === 1 ? "Basic" : pkgNum === 2 ? "Standard" : pkgNum === 3 ? "Premium" : String(plan.package ?? "—");

  // === Branding helpers ===
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

  // One robust updater to avoid nulling the other column
  const updateSchoolBrandingRobust = async ({ logo, signature }) => {
    const params = {
      p_school_id: String(schoolId),
      p_logo_url: String(logo ?? logoUrl ?? ""),
      p_signature_url: String(signature ?? signatureUrl ?? ""),
    };

    const encodeForm = (obj) =>
      Object.entries(obj)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");

    // 1) POST form-urlencoded
    try {
      const r = await fetch(UPDATE_SCHOOL_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
        body: encodeForm(params),
      });
      if (r.ok) return true;
    } catch {}

    // 2) GET fallback
    try {
      const qp = new URLSearchParams(params).toString();
      const r = await fetch(`${UPDATE_SCHOOL_API}?${qp}`, { method: "GET", headers });
      if (r.ok) return true;
    } catch {}

    // 3) POST JSON fallback
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
                      : "bg-red-50 text-red-800 border border-red-200"
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
                        <span className={`text-sm inline-flex items-center gap-1 ${/success|updated/i.test(logoMsg) ? "text-emerald-700" : "text-rose-700"}`}>
                          {/updated|success/i.test(logoMsg) ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
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
                      Headteacher Signature (HT)
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
                        <span className={`text-sm inline-flex items-center gap-1 ${/success|updated/i.test(sigMsg) ? "text-emerald-700" : "text-rose-700"}`}>
                          {/updated|success/i.test(sigMsg) ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
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
                      {pkgName}
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
                    <div className="text-base font-semibold">{plan.expiry ? String(plan.expiry).slice(0, 10) : "—"}</div>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2">
                      <Banknote className="h-4 w-4" /> Currency
                    </div>
                    <div className="text-base font-semibold">{plan.currency || "—"}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() =>
                      window.open(`${BILLING_BASE}?p_school_id=${encodeURIComponent(schoolId ?? "")}`, "_blank")
                    }
                    className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Upgrade / Extend Plan
                  </button>
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
                    <p className="text-sm text-blue-700 dark:text-blue-300">Update your account password</p>
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">Export your account information</p>
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

        {/* Change Password Modal */}
        {pwdOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <KeyRound className="h-5 w-5" /> Change Password
                </h3>
                <button
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setPwdOpen(false)}
                  aria-label="Close"
                >
                  <EyeOff className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password
                  </label>
                  <input
                    type={pwd.show ? "text" : "password"}
                    value={pwd.next}
                    onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900"
                    placeholder="Minimum 8 characters"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Your backend sets <code>PASSWORD_HASH</code> to this value.
                  </p>
                </div>

                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pwd.show}
                    onChange={(e) => setPwd({ ...pwd, show: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show password</span>
                </label>
              </div>

              <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setPwdOpen(false)}
                  className="px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPassword}
                  disabled={!canChangePwd || loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Saving…" : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
