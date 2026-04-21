"use client";

import { useEffect, useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

function mapAuthError(errorCode?: string | null): string {
  if (!errorCode) return "";

  switch (errorCode) {
    case "CredentialsSignin":
      return "Invalid login details. Check your email/password. If this email exists in multiple companies, add the company slug.";
    case "SessionRequired":
      return "Your previous session expired. Please sign in again.";
    default:
      return "Sign in failed. Please try again.";
  }
}

async function resetAuthSession() {
  try {
    await fetch("/api/auth/session-reset", { method: "POST" });
  } catch {
    // Best-effort only. Login should still proceed even if this reset fails.
  }
}

async function fetchSessionWithRetry(retries = 4, delayMs = 150) {
  for (let i = 0; i < retries; i++) {
    const session = await fetch("/api/auth/session").then((r) => r.json());
    if (session?.user?.role) return session;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams?.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const error = formError || mapAuthError(authError);

  useEffect(() => {
    if (authError) {
      void resetAuthSession();
    }
  }, [authError]);

  // If already logged in, skip the form and honour the callbackUrl
  useEffect(() => {
    const callbackUrl = searchParams?.get("callbackUrl");
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((session) => {
        if (!session?.user?.role) return;
        const role = session.user.role;
        if (callbackUrl) {
          router.replace(callbackUrl);
        } else if (role === "client") {
          router.replace("/client");
        } else if (role === "technician") {
          router.replace("/technician");
        } else {
          router.replace("/dashboard");
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError("");
    await resetAuthSession();
    const res = await signIn("credentials", {
      email,
      password,
      tenantSlug: tenantSlug.trim(),
      redirect: false,
    });
    if (res?.error) {
      setFormError(mapAuthError(res.error));
      setLoading(false);
    } else {
      // Give NextAuth a brief moment to persist the new session cookie.
      const session = await fetchSessionWithRetry();
      const role = session?.user?.role;
      if (!role) {
        setFormError("Sign in succeeded but session could not be established. Please try once more.");
        setLoading(false);
        return;
      }
      const callbackUrl = searchParams?.get("callbackUrl");
      if (callbackUrl) {
        router.push(callbackUrl);
      } else if (role === "client") {
        router.push("/client");
      } else if (role === "technician") {
        router.push("/technician");
      } else {
        router.push("/dashboard");
      }
    }
  }

  async function handleForgot(e: React.SyntheticEvent) {
    e.preventDefault();
    setForgotLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail }),
    });
    setForgotLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setFormError(data.error ?? "Failed to send reset email. Please try again.");
      return;
    }
    setForgotSent(true);
  }

  return (
    <div className="min-h-screen flex bg-gray-950">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col justify-between p-12">
        <motion.div
          className="relative inline-flex cursor-pointer"
          whileHover="hover"
          initial="rest"
          animate="rest"
        >
          {/* Outer radial glow */}
          <motion.div
            className="absolute -inset-6 rounded-[28px] pointer-events-none"
            variants={{
              rest: { opacity: 0, scale: 0.9 },
              hover: { opacity: 1, scale: 1 },
            }}
            style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.28) 0%, rgba(147,197,253,0.12) 50%, transparent 75%)" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
          {/* Frosted-glass logo pill */}
          <motion.div
            className="relative flex items-center gap-3 rounded-2xl px-4 py-2.5 border border-white/25"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
            variants={{
              rest: { scale: 1, boxShadow: "0 2px 12px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.15)" },
              hover: { scale: 1.04, boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 0 0 2px rgba(255,255,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25)" },
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <img
              src="/Logo.jpeg"
              alt="Domain Group Property Services"
              className="h-9 w-auto object-contain rounded-lg"
              style={{ mixBlendMode: "multiply" }}
            />
          </motion.div>
        </motion.div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Property<br />maintenance,<br />simplified.
          </h1>
          <p className="text-blue-200 text-lg">
            Manage jobs, quotes, and client communication — all in one place.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { icon: "💬", text: "Real-time job chat" },
              { icon: "📋", text: "Quote approvals with GST" },
              { icon: "🔧", text: "Technician field app" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-blue-100 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-300 text-sm">© 2026 Domain Group Property Services</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-gray-950 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)" }} />

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center rounded-2xl px-5 py-3 border border-gray-800 bg-gray-900">
              <img src="/Logo.jpeg" alt="Domain Group Property Services" className="h-9 w-auto object-contain" />
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-blue-400 text-xs font-medium tracking-wide">Secure portal</span>
            </div>
            <h2 className="text-4xl font-bold text-white tracking-tight mb-2">Welcome back</h2>
            <p className="text-gray-500 text-sm">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-gray-900/80 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/50 text-sm transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgot((v) => !v)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-gray-900/80 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/50 text-sm transition-all"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Company Slug <span className="text-gray-700 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-900/80 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/50 text-sm transition-all"
                placeholder="e.g. metro-maintenance or dgps"
              />
              <p className="text-[11px] text-gray-600 mt-1.5">
                Only required if the same email is used in more than one company.
              </p>
            </div>

            {showForgot && (
              <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                <p className="text-sm font-semibold text-blue-300 mb-1">Reset your password</p>
                {forgotSent ? (
                  <p className="text-xs text-green-400 leading-relaxed">
                    If the email is registered, you&apos;ll receive a reset link shortly. Check your inbox.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={forgotEmail}
                      onChange={(e) => { setForgotEmail(e.target.value); setFormError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && forgotEmail && handleForgot(e)}
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleForgot}
                      disabled={forgotLoading || !forgotEmail}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      {forgotLoading ? "Sending…" : "Send reset link"}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #2563eb 0%, #4338ca 100%)", boxShadow: "0 4px 24px rgba(37,99,235,0.35)" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.25" strokeWidth="2.5" />
                      <path stroke="white" strokeWidth="2.5" strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Signing in...
                  </span>
                ) : "Sign in"}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-800/60 text-center">
            <p className="text-xs text-gray-600">
              New client?{" "}
              <Link
                href="/request/dgps"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Submit a job request →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginPageInner />
    </Suspense>
  );
}
