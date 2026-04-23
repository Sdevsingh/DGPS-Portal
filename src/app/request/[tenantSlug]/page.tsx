"use client";

import { useState, useCallback, useMemo, useReducer, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import * as Select from "@radix-ui/react-select";

// ─── Country codes ────────────────────────────────────────────────────────────

const COUNTRY_CODES = [
  { code: "+61", label: "🇦🇺 +61", country: "Australia", placeholder: "04xx xxx xxx" },
  { code: "+1",  label: "🇺🇸 +1",  country: "USA/Canada", placeholder: "(555) 000-0000" },
  { code: "+44", label: "🇬🇧 +44", country: "United Kingdom", placeholder: "07xxx xxxxxx" },
  { code: "+64", label: "🇳🇿 +64", country: "New Zealand", placeholder: "021 xxx xxxx" },
  { code: "+91", label: "🇮🇳 +91", country: "India", placeholder: "98xxx xxxxx" },
  { code: "+65", label: "🇸🇬 +65", country: "Singapore", placeholder: "8xxx xxxx" },
  { code: "+971",label: "🇦🇪 +971",country: "UAE", placeholder: "05x xxx xxxx" },
  { code: "+60", label: "🇲🇾 +60", country: "Malaysia", placeholder: "01x-xxx xxxx" },
  { code: "+852",label: "🇭🇰 +852",country: "Hong Kong", placeholder: "9xxx xxxx" },
  { code: "+86", label: "🇨🇳 +86", country: "China", placeholder: "138 xxxx xxxx" },
];

function validatePhone(code: string, number: string): boolean {
  const d = number.replace(/\D/g, "");
  if (!d) return false;
  switch (code) {
    case "+61":  return d.length >= 8 && d.length <= 10;
    case "+1":   return d.length === 10;
    case "+44":  return d.length >= 10 && d.length <= 11;
    case "+64":  return d.length >= 8 && d.length <= 9;
    default:     return d.length >= 7 && d.length <= 15;
  }
}

// ─── Password strength ────────────────────────────────────────────────────────

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
      1: { label: "Weak",   color: "text-red-500",    bg: "bg-red-400" },
      2: { label: "Fair",   color: "text-orange-500", bg: "bg-orange-400" },
      3: { label: "Good",   color: "text-yellow-600", bg: "bg-yellow-400" },
      4: { label: "Strong", color: "text-green-600",  bg: "bg-green-500" },
    };
    return { score: score as StrengthLevel["score"], ...(levels[score] ?? levels[1]) };
  }, [password]);
}

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
  streetAddress: string;
  suburb: string;
  state: string;
  postcode: string;
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
  name: "", email: "", countryCode: "+61", phoneNumber: "",
  streetAddress: "", suburb: "", state: "VIC", postcode: "",
  description: "", category: "Plumbing",
  inspectionRequired: false, password: "", confirmPassword: "", _honeypot: "",
};

// ─── PasswordField ────────────────────────────────────────────────────────────

function PasswordField({ label, value, onChange, placeholder, autoComplete, error }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string; error?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className={`w-full px-4 py-3 pr-11 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
            error ? "border-red-400 focus:ring-red-400 bg-red-50" : "border-gray-200 focus:ring-blue-500 focus:border-blue-400"
          }`}
        />
        <button type="button" onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1">
          {visible ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

function StrengthBar({ password }: { password: string }) {
  const s = usePasswordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= s.score ? s.bg : "bg-gray-100"}`} />
        ))}
      </div>
      {s.label && (
        <p className={`text-xs ${s.color}`}>
          {s.label}
          {s.score < 3 && <span className="text-gray-400"> — try adding numbers, symbols, or uppercase</span>}
        </p>
      )}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[{ n: 1, label: "Job Details" }, { n: 2, label: "Your Account" }].map(({ n, label }) => (
        <div key={n} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              n < step ? "bg-green-500 text-white" : n === step ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
            }`}>
              {n < step ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : n}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${n === step ? "text-blue-600" : "text-gray-400"}`}>{label}</span>
          </div>
          {n < 2 && <div className={`w-8 h-px transition-colors duration-300 ${step > 1 ? "bg-green-400" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );
}

// ─── Hero Panel ───────────────────────────────────────────────────────────────

const SERVICES = [
  { icon: "🔧", label: "Plumbing Repair & Maintenance" },
  { icon: "⚡", label: "Electrical Maintenance" },
  { icon: "🧹", label: "Commercial & Residential Cleaning" },
  { icon: "💧", label: "High Pressure Cleaning" },
  { icon: "🔨", label: "Carpentry & General Repairs" },
  { icon: "🎨", label: "Painting & Plastering" },
  { icon: "🌿", label: "Garden & Landscaping" },
  { icon: "🏠", label: "Inspections & Renovations" },
];

function DGPSHeroPanel() {
  return (
    <div className="hidden lg:flex lg:w-[42%] shrink-0 bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 flex-col justify-between p-10 min-h-screen sticky top-0 overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 opacity-10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500 opacity-10 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-white rounded-xl px-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Maintenr.png" alt="Maintenr" className="h-10 w-auto object-contain" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white leading-snug mb-3">
          Request a service<br />
          <span className="text-blue-300">from our team.</span>
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Property maintenance specialists. Background-checked, certified tradespeople available 24/7.
        </p>

        <div className="space-y-2.5">
          {SERVICES.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-base w-6 shrink-0">{s.icon}</span>
              <span className="text-slate-300 text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative space-y-4">
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
          <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide mb-2">Contact Us</p>
          <div className="space-y-1.5 text-sm text-slate-300">
            <p>🌐 maintenr.com.au</p>
            <p>🕐 Available 24/7</p>
          </div>
        </div>
        <p className="text-slate-600 text-xs">© 2026 Maintenr</p>
      </div>
    </div>
  );
}

// ─── Phone field ──────────────────────────────────────────────────────────────

function PhoneField({ countryCode, phoneNumber, onCountryChange, onNumberChange }: {
  countryCode: string;
  phoneNumber: string;
  onCountryChange: (v: string) => void;
  onNumberChange: (v: string) => void;
}) {
  const phoneValid = validatePhone(countryCode, phoneNumber);
  const country = COUNTRY_CODES.find((c) => c.code === countryCode);
  const hasError = phoneNumber.length > 0 && !phoneValid;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={(e) => onCountryChange(e.target.value)}
          className="w-32 px-3 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer text-gray-900"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <input
          required
          value={phoneNumber}
          onChange={(e) => onNumberChange(e.target.value)}
          placeholder={country?.placeholder ?? "Phone number"}
          className={`flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
            hasError
              ? "border-red-300 focus:ring-red-400 bg-red-50"
              : "border-gray-200 focus:ring-blue-500 focus:border-blue-400"
          }`}
        />
      </div>
      {hasError && (
        <p className="mt-1 text-xs text-red-500">
          Please enter a valid {country?.country} phone number
        </p>
      )}
    </div>
  );
}

// ─── Service select ───────────────────────────────────────────────────────────

const CATEGORIES = [
  "Plumbing", "Electrical", "Cleaning", "High Pressure Cleaning",
  "Carpentry", "Painting & Plastering", "Garden & Landscaping",
  "Inspection", "Roofing", "HVAC", "General Maintenance", "Other",
];

// ─── Shared field styles ──────────────────────────────────────────────────────

const inputCls = "w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all placeholder:text-gray-400 bg-white text-gray-900";
const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: () => void; label: string; hint: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-4 border border-gray-200 rounded-xl bg-white gap-4">
      <div className="min-w-0">
        <p className="font-medium text-gray-900 text-sm">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        style={{ minWidth: "2.75rem" }}
        className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${checked ? "bg-blue-600" : "bg-gray-200"}`}
      >
        <span
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: checked ? "translateX(1.25rem)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

// ─── Address fields ───────────────────────────────────────────────────────────

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

function StateSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all bg-white text-gray-900 cursor-pointer">
        <Select.Value />
        <Select.Icon>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" sideOffset={4} className="z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[120px]">
          <Select.Viewport className="p-1">
            {AU_STATES.map((s) => (
              <Select.Item key={s} value={s} className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 rounded-lg cursor-pointer outline-none data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 data-[state=checked]:font-semibold data-[state=checked]:text-blue-700">
                <Select.ItemText>{s}</Select.ItemText>
                <Select.ItemIndicator>
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function AddressFields({ form, set }: { form: FormState; set: (field: keyof FormState, value: string) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Street Address *</label>
        <input
          required
          value={form.streetAddress}
          onChange={(e) => set("streetAddress", e.target.value)}
          className={inputCls}
          placeholder="e.g. 42 Harbour View Drive"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Suburb *</label>
          <input
            required
            value={form.suburb}
            onChange={(e) => set("suburb", e.target.value)}
            className={inputCls}
            placeholder="e.g. Pyrmont"
          />
        </div>
        <div>
          <label className={labelCls}>State *</label>
          <StateSelect value={form.state} onChange={(v) => set("state", v)} />
        </div>
        <div>
          <label className={labelCls}>Postcode *</label>
          <input
            required
            maxLength={4}
            value={form.postcode}
            onChange={(e) => set("postcode", e.target.value.replace(/\D/g, ""))}
            className={inputCls}
            placeholder="3000"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Photo upload ─────────────────────────────────────────────────────────────

function PhotoUpload({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div>
      <label className={labelCls}>Attach a Photo (optional)</label>
      <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 transition-colors group">
        <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm text-gray-400 truncate">
          {file ? file.name : "Add photo (jpg, png, pdf — max 10MB)"}
        </span>
        <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}

// ─── Submit button ────────────────────────────────────────────────────────────

function SubmitButton({ loading, disabled, label }: { loading: boolean; disabled: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Submitting…
        </>
      ) : label}
    </button>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ result, returningClient, isLoggedIn, onReset }: {
  result: { jobNumber: string; jobId: string; clientEmail: string };
  returningClient: boolean;
  isLoggedIn: boolean;
  onReset: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto">
      <div className="flex justify-center mb-6">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
        >
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Request Submitted!</h1>
      <p className="text-gray-500 text-center mb-6 text-sm">Our team will review your request and send a quote shortly.</p>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 text-center mb-4">
        <p className="text-xs text-blue-400 uppercase tracking-widest mb-1">Your Reference Number</p>
        <p className="text-5xl font-black text-blue-600 tracking-tight">{result.jobNumber}</p>
        <p className="text-xs text-gray-400 mt-2">Keep this to track your request.</p>
      </div>

      {!isLoggedIn && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-1">
            {returningClient ? "Linked to your existing account" : "Your account is ready"}
          </p>
          <p className="text-sm text-gray-700">
            Sign in with{" "}
            <span className="font-mono font-semibold text-blue-600">{result.clientEmail}</span>
            {returningClient
              ? " using your existing password."
              : " and the password you just created."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <Link
          href={isLoggedIn ? "/client" : "/login"}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]"
        >
          {isLoggedIn ? "View My Jobs →" : "Track your job →"}
        </Link>
        <button onClick={onReset} className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Submit another request
        </button>
      </div>
    </motion.div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SuccessResult = { jobNumber: string; jobId: string; clientEmail: string };

// ─── Animation variants ───────────────────────────────────────────────────────

const stepVariants = {
  enter: (dir: "forward" | "back") => ({ x: dir === "forward" ? 30 : -30, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: "forward" | "back") => ({ x: dir === "forward" ? -30 : 30, opacity: 0 }),
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PublicRequestPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const { data: session, status: sessionStatus } = useSession();

  // Is this a logged-in client? (skip account creation step entirely)
  const isLoggedInClient = sessionStatus !== "loading" && session?.user?.role === "client";

  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [returningClient, setReturningClient] = useState(false);
  const [pageStep, setPageStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SuccessResult | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, dispatch] = useReducer(formReducer, INITIAL_FORM);
  const [slugValid, setSlugValid] = useState<boolean | null>(null);

  const set = useCallback((field: keyof FormState, value: string | boolean) => dispatch({ field, value }), []);

  // Validate tenantSlug exists
  useEffect(() => {
    async function checkSlug() {
      try {
        const res = await fetch(`/api/public/check-tenant?slug=${encodeURIComponent(tenantSlug)}`);
        setSlugValid(res.ok);
      } catch {
        setSlugValid(false);
      }
    }
    checkSlug();
  }, [tenantSlug]);

  // Pre-fill from session when it loads
  useEffect(() => {
    if (session?.user?.name) dispatch({ field: "name", value: session.user.name });
    if (session?.user?.email) dispatch({ field: "email", value: session.user.email });
  }, [session?.user?.name, session?.user?.email]);

  const phoneValid = validatePhone(form.countryCode, form.phoneNumber);
  const passwordMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;
  const passwordTooShort = form.password.length > 0 && form.password.length < 8;

  const fullAddress = [form.streetAddress, form.suburb, form.state, form.postcode].filter(Boolean).join(", ");
  const step1Valid = !!(form.name && form.email && phoneValid && form.streetAddress && form.suburb && form.postcode && form.description);
  const step2Valid = returningClient || isLoggedInClient || (form.password.length >= 8 && form.password === form.confirmPassword);

  // ─── Navigate to step 2 ──────────────────────────────────────────────────

  async function goToStep2() {
    if (!step1Valid) return;
    setCheckingEmail(true);
    try {
      const res = await fetch(`/api/public/check-email?email=${encodeURIComponent(form.email)}&slug=${encodeURIComponent(tenantSlug)}`);
      if (res.ok) {
        const data = await res.json();
        setReturningClient(!!data.exists);
      }
    } finally {
      setCheckingEmail(false);
    }
    setDirection("forward");
    setWizardStep(2);
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form._honeypot) return;
    if (!step1Valid) return;
    if (!isLoggedInClient && !step2Valid) return;

    setLoading(true);
    setError("");
    try {
      let photoUrl = "";
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (uploadRes.ok) photoUrl = (await uploadRes.json()).url;
      }

      const fullPhone = `${form.countryCode} ${form.phoneNumber}`;

      const res = await fetch("/api/public/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          name: form.name,
          email: form.email,
          phone: fullPhone,
          propertyAddress: fullAddress,
          description: form.description,
          category: form.category,
          inspectionRequired: form.inspectionRequired,
          password: (returningClient || isLoggedInClient) ? undefined : form.password,
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

  function resetForm() {
    setPageStep("form");
    setResult(null);
    setWizardStep(1);
    setDirection("forward");
    setReturningClient(false);
    setError("");
  }

  // ─── Success ──────────────────────────────────────────────────────────────

  if (slugValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (slugValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Company not found</h1>
          <p className="text-sm text-gray-500 mt-2">
            This link is invalid or the company no longer exists. Please check the URL or contact the company directly.
          </p>
        </div>
      </div>
    );
  }

  if (pageStep === "success" && result) {
    return (
      <div className="min-h-screen flex bg-white">
        <DGPSHeroPanel />
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <SuccessScreen result={result} returningClient={returningClient} isLoggedIn={isLoggedInClient} onReset={resetForm} />
        </div>
      </div>
    );
  }

  // ─── Logged-in client: single-step form ──────────────────────────────────

  if (isLoggedInClient) {
    return (
      <div className="min-h-screen flex bg-white">
        <DGPSHeroPanel />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-6 py-10">
            <div className="mb-6">
              <Link href="/client" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-3">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                My Jobs
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Submit a New Job Request</h1>
              <p className="text-gray-500 text-sm mt-1">
                Logged in as{" "}
                <span className="font-semibold text-blue-600">{session?.user?.name}</span>
              </p>
            </div>

            <input type="text" name="_honeypot" value={form._honeypot} onChange={(e) => set("_honeypot", e.target.value)} style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

            <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Your Name *</label>
                  <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Your name" />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={form.email} readOnly className={inputCls + " bg-gray-50 text-gray-500 cursor-default"} />
                </div>
              </div>

              <PhoneField
                countryCode={form.countryCode}
                phoneNumber={form.phoneNumber}
                onCountryChange={(v) => set("countryCode", v)}
                onNumberChange={(v) => set("phoneNumber", v)}
              />

              <AddressFields form={form} set={set} />

              <div>
                <label className={labelCls}>Service Type</label>
                <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Describe the Problem *</label>
                <textarea required rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputCls + " resize-none"} placeholder="e.g. Burst pipe under kitchen sink, needs urgent repair..." />
              </div>

              <Toggle
                checked={form.inspectionRequired}
                onChange={() => set("inspectionRequired", !form.inspectionRequired)}
                label="Inspection Required?"
                hint="Our team will inspect before quoting"
              />

              <PhotoUpload file={photoFile} onChange={setPhotoFile} />

              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

              <SubmitButton loading={loading} disabled={!form.streetAddress || !form.suburb || !form.postcode || !form.description} label="Submit Job Request" />
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─── Visitor: 2-step wizard ───────────────────────────────────────────────

  return (
    <div className="min-h-screen flex bg-white">
      <DGPSHeroPanel />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-10">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl mb-3">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="font-bold text-xl text-gray-900">Maintenr</h2>
          </div>

          <div className="mb-5">
            <h2 className="text-2xl font-bold text-gray-900">
              {wizardStep === 1 ? "Request a Service" : "Secure Your Account"}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {wizardStep === 1
                ? "Fill in your details and we'll get you a quote."
                : "Almost done — create your job-tracking account."}
            </p>
          </div>

          <StepIndicator step={wizardStep} />

          <input type="text" name="_honeypot" value={form._honeypot} onChange={(e) => set("_honeypot", e.target.value)} style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>

              {/* Step 1: Job Details */}
              {wizardStep === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="p-6 space-y-5"
                >
                  <div>
                    <label className={labelCls}>Full Name *</label>
                    <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="John Smith" />
                  </div>

                  <div>
                    <label className={labelCls}>Email Address *</label>
                    <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} placeholder="john@example.com" />
                  </div>

                  <PhoneField
                    countryCode={form.countryCode}
                    phoneNumber={form.phoneNumber}
                    onCountryChange={(v) => set("countryCode", v)}
                    onNumberChange={(v) => set("phoneNumber", v)}
                  />

                  <AddressFields form={form} set={set} />

                  <div>
                    <label className={labelCls}>Service Type</label>
                    <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Describe the Problem *</label>
                    <textarea required rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputCls + " resize-none"} placeholder="e.g. Burst pipe under kitchen sink, needs urgent repair..." />
                  </div>

                  <Toggle
                    checked={form.inspectionRequired}
                    onChange={() => set("inspectionRequired", !form.inspectionRequired)}
                    label="Inspection Required?"
                    hint="Our team will inspect before quoting"
                  />

                  <PhotoUpload file={photoFile} onChange={setPhotoFile} />

                  <button
                    type="button"
                    onClick={goToStep2}
                    disabled={!step1Valid || checkingEmail}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {checkingEmail ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Checking…
                      </>
                    ) : "Next: Create Account →"}
                  </button>
                </motion.div>
              )}

              {/* Step 2: Account */}
              {wizardStep === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="p-6"
                >
                  <button
                    type="button"
                    onClick={() => { setDirection("back"); setWizardStep(1); }}
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {returningClient ? (
                      <div className="py-4 space-y-4">
                        <div className="flex flex-col items-center text-center gap-3">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-lg">Welcome back!</p>
                            <p className="text-sm text-gray-500 mt-1 max-w-xs">
                              Your new job request will be linked to your existing account automatically. No password needed.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                          <svg className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <p className="text-xs text-blue-700">Create a password to track this job, approve quotes, and chat with our team.</p>
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
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
                    )}

                    <SubmitButton loading={loading} disabled={!step2Valid} label="Submit Request ✓" />

                    <p className="text-xs text-gray-400 text-center">
                      By submitting, you agree to be contacted about your service request.
                    </p>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
