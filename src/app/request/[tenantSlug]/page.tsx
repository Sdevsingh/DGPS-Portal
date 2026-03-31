"use client";

import { useState, useCallback, useMemo, useReducer, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// ─── Password strength hook ─────────────────────────────────────────────────

type StrengthLevel = { score: 0 | 1 | 2 | 3 | 4; label: string; color: string; bg: string };

function usePasswordStrength(password: string): StrengthLevel {
  return useMemo(() => {
    if (!password) return { score: 0, label: "", color: "", bg: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score = Math.min(4, score + 1);
    const levels: Record<number, Omit<StrengthLevel, "score">> = {
      1: { label: "Weak", color: "text-red-500", bg: "bg-red-400" },
      2: { label: "Fair", color: "text-orange-500", bg: "bg-orange-400" },
      3: { label: "Good", color: "text-yellow-600", bg: "bg-yellow-400" },
      4: { label: "Strong", color: "text-green-600", bg: "bg-green-500" },
    };
    return { score: score as StrengthLevel["score"], ...(levels[score] ?? levels[1]) };
  }, [password]);
}

// ─── Form state ──────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  email: string;
  phone: string;
  propertyAddress: string;
  description: string;
  category: string;
  inspectionRequired: boolean;
  password: string;
  confirmPassword: string;
  _honeypot: string;
};

type FormAction = { field: keyof FormState; value: string | boolean };

function formReducer(state: FormState, action: FormAction): FormState {
  return { ...state, [action.field]: action.value };
}

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  propertyAddress: "",
  description: "",
  category: "Plumbing",
  inspectionRequired: false,
  password: "",
  confirmPassword: "",
  _honeypot: "",
};

// ─── PasswordField component ─────────────────────────────────────────────────

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  const toggle = useCallback(() => setVisible((v) => !v), []);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className={`w-full px-4 py-3 pr-11 border rounded-xl text-base focus:outline-none focus:ring-2 transition-colors ${
            error ? "border-red-400 focus:ring-red-400 bg-red-50" : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Strength bar ─────────────────────────────────────────────────────────────

function StrengthBar({ password }: { password: string }) {
  const strength = usePasswordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= strength.score ? strength.bg : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      {strength.label && (
        <p className={`text-xs font-medium ${strength.color}`}>
          {strength.label} password
          {strength.score < 3 && (
            <span className="text-gray-400 font-normal"> — try adding numbers, symbols, or uppercase</span>
          )}
        </p>
      )}
    </div>
  );
}

// ─── Progress indicator ───────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
              s < step
                ? "bg-green-500 text-white"
                : s === step
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            {s < step ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : s}
          </div>
          {s < 2 && (
            <div className={`w-12 h-0.5 transition-colors duration-300 ${step > s ? "bg-green-400" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2;
type Direction = "forward" | "back";

type SuccessResult = { jobNumber: string; jobId: string; clientEmail: string };

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PublicRequestPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [direction, setDirection] = useState<Direction>("forward");
  const [animating, setAnimating] = useState(false);

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [returningClient, setReturningClient] = useState(false);

  const [pageStep, setPageStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SuccessResult | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [form, dispatch] = useReducer(formReducer, INITIAL_FORM);
  const containerRef = useRef<HTMLDivElement>(null);

  const set = useCallback(
    (field: keyof FormState, value: string | boolean) => dispatch({ field, value }),
    []
  );

  const strength = usePasswordStrength(form.password);
  const passwordMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;
  const passwordTooShort = form.password.length > 0 && form.password.length < 8;

  const step1Valid = !!(form.name && form.email && form.phone && form.propertyAddress && form.description);
  const step2Valid = returningClient || (form.password.length >= 8 && form.password === form.confirmPassword);

  // ─── Slide transition ──────────────────────────────────────────────────────

  function slideToStep(target: WizardStep, dir: Direction) {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setWizardStep(target);
      setAnimating(false);
    }, 280);
  }

  // ─── Step 1 → Step 2 ───────────────────────────────────────────────────────

  async function goToStep2() {
    if (!step1Valid) return;
    // Check if email already registered
    setCheckingEmail(true);
    try {
      const res = await fetch(
        `/api/public/check-email?email=${encodeURIComponent(form.email)}&slug=${encodeURIComponent(tenantSlug)}`
      );
      if (res.ok) {
        const data = await res.json();
        setReturningClient(!!data.exists);
      }
    } finally {
      setCheckingEmail(false);
    }
    slideToStep(2, "forward");
  }

  // ─── Final submit ─────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form._honeypot) return;
    if (!step2Valid) return;

    setLoading(true);
    setError("");
    try {
      let photoUrl = "";
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          photoUrl = uploadData.url;
        }
      }

      const res = await fetch("/api/public/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          name: form.name,
          email: form.email,
          phone: form.phone,
          propertyAddress: form.propertyAddress,
          description: form.description,
          category: form.category,
          inspectionRequired: form.inspectionRequired,
          password: returningClient ? undefined : form.password,
          photoUrl,
          _honeypot: form._honeypot,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult({ jobNumber: data.jobNumber, jobId: data.jobId, clientEmail: data.clientEmail });
      setPageStep("success");
    } finally {
      setLoading(false);
    }
  }

  // ─── Success screen ───────────────────────────────────────────────────────

  if (pageStep === "success" && result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Request Submitted!</h1>
          <p className="text-gray-500 text-center mb-6 text-sm">
            Our team will review your request and send you a quote shortly.
          </p>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center mb-4 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Your Reference Number</p>
            <p className="text-4xl font-extrabold text-blue-600 tracking-tight">{result.jobNumber}</p>
            <p className="text-xs text-gray-400 mt-2">Use this to track your request.</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-semibold text-blue-900 text-sm">Your account is ready</p>
            </div>
            <p className="text-xs text-blue-700">
              Log in with{" "}
              <span className="font-mono font-semibold">{result.clientEmail}</span>
              {returningClient
                ? " — your job has been linked to your existing account."
                : " and the password you just created to track your job."}
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Track your job →
            </Link>
            <button
              onClick={() => { setPageStep("form"); setResult(null); setWizardStep(1); }}
              className="w-full py-3 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              Submit another request
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Wizard ───────────────────────────────────────────────────────────────

  const inputCls = "w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  const slideClass = animating
    ? direction === "forward"
      ? "opacity-0 -translate-x-4"
      : "opacity-0 translate-x-4"
    : "opacity-100 translate-x-0";

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Request a Service</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {wizardStep === 1
              ? "Tell us about the job and we'll get you a quote."
              : "Almost done — just secure your account."}
          </p>
        </div>

        <StepIndicator step={wizardStep} />

        {/* Card with animated content */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Honeypot (hidden, outside animation) */}
          <input
            type="text"
            name="_honeypot"
            value={form._honeypot}
            onChange={(e) => set("_honeypot", e.target.value)}
            style={{ display: "none" }}
            tabIndex={-1}
            autoComplete="off"
          />

          <div
            ref={containerRef}
            className={`transition-all duration-[280ms] ease-in-out ${slideClass}`}
          >
            {/* ── STEP 1: Job details ── */}
            {wizardStep === 1 && (
              <div className="p-6 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                    Step 1 of 2 — Your Request
                  </p>
                </div>

                <div>
                  <label className={labelCls}>Your Name *</label>
                  <input required value={form.name} onChange={(e) => set("name", e.target.value)}
                    className={inputCls} placeholder="John Smith" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Email *</label>
                    <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                      className={inputCls} placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className={labelCls}>Phone *</label>
                    <input required value={form.phone} onChange={(e) => set("phone", e.target.value)}
                      className={inputCls} placeholder="04xx xxx xxx" />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Property Address *</label>
                  <input required value={form.propertyAddress} onChange={(e) => set("propertyAddress", e.target.value)}
                    className={inputCls} placeholder="123 Smith St, Sydney NSW 2000" />
                </div>

                <div>
                  <label className={labelCls}>Service Type</label>
                  <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                    <option>Plumbing</option>
                    <option>Electrical</option>
                    <option>Roofing</option>
                    <option>HVAC</option>
                    <option>General Maintenance</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Describe the Problem *</label>
                  <textarea required rows={4} value={form.description} onChange={(e) => set("description", e.target.value)}
                    className={inputCls + " resize-none"} placeholder="e.g. The kitchen tap is leaking..." />
                </div>

                <div>
                  <label className={labelCls}>Attach a Photo (optional)</label>
                  <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 transition-colors">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-500 truncate">
                      {photoFile ? photoFile.name : "Tap to add photo (jpg, png, pdf — max 10MB)"}
                    </span>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Inspection Required?</p>
                    <p className="text-xs text-gray-500 mt-0.5">Our team will inspect before quoting</p>
                  </div>
                  <button type="button" onClick={() => set("inspectionRequired", !form.inspectionRequired)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.inspectionRequired ? "bg-blue-600" : "bg-gray-300"}`}
                    aria-checked={form.inspectionRequired} role="switch">
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.inspectionRequired ? "translate-x-7" : "translate-x-1"}`} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={goToStep2}
                  disabled={!step1Valid || checkingEmail}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-base transition-colors flex items-center justify-center gap-2"
                >
                  {checkingEmail ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Checking…
                    </>
                  ) : (
                    <>Next: Create Account →</>
                  )}
                </button>
              </div>
            )}

            {/* ── STEP 2: Account ── */}
            {wizardStep === 2 && (
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => slideToStep(1, "back")}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Step 2 of 2 — Secure Your Account
                  </p>
                </div>

                {returningClient ? (
                  /* ── Returning client ── */
                  <div className="py-4 space-y-4">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">Welcome back!</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Your new job request will be linked to your existing account automatically.
                          No password needed.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── New client password ── */
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <p className="text-xs text-blue-700">
                        Create a password to track this job, approve quotes, and chat with our team.
                      </p>
                    </div>

                    <div>
                      <PasswordField
                        label="Choose a Password *"
                        value={form.password}
                        onChange={(v) => set("password", v)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        error={passwordTooShort ? "Password must be at least 8 characters" : undefined}
                      />
                      <StrengthBar password={form.password} />
                    </div>

                    <PasswordField
                      label="Confirm Password *"
                      value={form.confirmPassword}
                      onChange={(v) => set("confirmPassword", v)}
                      placeholder="Type it again"
                      autoComplete="new-password"
                      error={passwordMismatch ? "Passwords don't match" : undefined}
                    />
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <button
                    type="submit"
                    disabled={loading || !step2Valid}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-base transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Submitting…
                      </>
                    ) : (
                      "Submit Request ✓"
                    )}
                  </button>
                </form>

                <p className="text-xs text-gray-400 text-center">
                  By submitting, you agree to be contacted about your service request.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-500 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
