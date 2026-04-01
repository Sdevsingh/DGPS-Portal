"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      // Fetch session to check role
      const session = await fetch("/api/auth/session").then((r) => r.json());
      const role = session?.user?.role;
      if (role === "client") {
        router.push("/client");
      } else if (role === "technician") {
        router.push("/technician");
      } else {
        router.push("/dashboard");
      }
    }
  }

  async function handleForgot(e: React.FormEvent) {
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
      setError(data.error ?? "Failed to send reset email. Please try again.");
      return;
    }
    setForgotSent(true);
  }

  return (
    <div className="min-h-screen flex bg-gray-950">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg">Domain Group Property Services</span>
        </div>

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
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-950">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-white font-bold text-xl">Domain Group</h2>
            <p className="text-gray-500 text-sm mt-1">Operations Platform</p>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-gray-400 text-sm mb-8">Sign in to your account to continue</p>

          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-300">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgot((v) => !v)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="••••••••"
              />
            </div>

            {showForgot && (
              <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-xl">
                <p className="text-sm font-semibold text-blue-300 mb-1">Reset your password</p>
                {forgotSent ? (
                  <p className="text-xs text-green-400 leading-relaxed">
                    If that email is registered, you&apos;ll receive a reset link shortly. Check your inbox.
                  </p>
                ) : (
                  <form onSubmit={handleForgot} className="mt-2 space-y-2">
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      {forgotLoading ? "Sending…" : "Send reset link"}
                    </button>
                  </form>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors mt-2"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <p className="text-xs font-semibold text-gray-400 mb-2">Demo accounts — password: password123</p>
            <div className="space-y-1">
              {[
                { email: "admin@dgps.com.au", role: "Super Admin" },
                { email: "ops@dgps.com.au", role: "Ops Manager" },
                { email: "tech@dgps.com.au", role: "Technician" },
                { email: "client@dgps.com.au", role: "Client" },
              ].map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => { setEmail(a.email); setPassword("password123"); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <span className="text-xs text-gray-300 font-medium">{a.email}</span>
                  <span className="text-xs text-gray-600 ml-2">— {a.role}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-600">
              New client?{" "}
              <a
                href="/request/dgps"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Submit a job request →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
