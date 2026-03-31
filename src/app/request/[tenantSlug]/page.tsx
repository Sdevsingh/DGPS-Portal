"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Step = "form" | "success";

export default function PublicRequestPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    jobNumber: string;
    jobId: string;
    clientEmail: string;
    clientPassword: string;
  } | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    propertyAddress: "",
    description: "",
    category: "Plumbing",
    inspectionRequired: false,
    _honeypot: "", // spam trap
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form._honeypot) return; // bot detected
    setLoading(true);
    setError("");

    try {
      let photoUrl = "";

      // Upload photo first if provided
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
        body: JSON.stringify({ ...form, tenantSlug, photoUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setResult({
        jobNumber: data.jobNumber,
        jobId: data.jobId,
        clientEmail: data.clientEmail ?? "",
        clientPassword: data.clientPassword ?? "",
      });
      setStep("success");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setStep("form");
    setForm({
      name: "",
      email: "",
      phone: "",
      propertyAddress: "",
      description: "",
      category: "Plumbing",
      inspectionRequired: false,
      _honeypot: "",
    });
    setPhotoFile(null);
    setResult(null);
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Checkmark animation */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Request Submitted!</h1>
          <p className="text-gray-500 text-center mb-6 text-sm">
            Our team will review your request and send you a quote shortly.
          </p>

          {/* Job reference */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center mb-4 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Your Reference Number</p>
            <p className="text-4xl font-extrabold text-blue-600 tracking-tight">{result?.jobNumber}</p>
            <p className="text-xs text-gray-400 mt-2">Keep this — you can use it to track your request.</p>
          </div>

          {/* Login credentials (only shown if account was newly created) */}
          {result?.clientPassword && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <p className="font-semibold text-amber-900 text-sm">Your login details — save these!</p>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                We&apos;ve created an account so you can track your job and chat with our team.
              </p>
              <div className="space-y-2">
                <div className="bg-white rounded-xl border border-amber-200 px-4 py-2.5">
                  <p className="text-xs text-amber-500 mb-0.5">Email</p>
                  <p className="font-mono text-sm font-semibold text-gray-800">{result.clientEmail}</p>
                </div>
                <div className="bg-white rounded-xl border border-amber-200 px-4 py-2.5">
                  <p className="text-xs text-amber-500 mb-0.5">Temporary Password</p>
                  <p className="font-mono text-sm font-semibold text-gray-800 tracking-widest">{result.clientPassword}</p>
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-3">
                Screenshot this or write it down. You can change your password after logging in.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Track your job
            </Link>
            <button
              onClick={resetForm}
              className="w-full py-3 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              Submit another request
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Request a Service</h1>
          <p className="text-gray-500 mt-1 text-sm">Fill in the details below and we&apos;ll get back to you with a quote.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot — hidden from real users */}
            <input
              type="text"
              name="_honeypot"
              value={form._honeypot}
              onChange={(e) => set("_honeypot", e.target.value)}
              style={{ display: "none" }}
              tabIndex={-1}
              autoComplete="off"
            />

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
                className={inputCls + " resize-none"} placeholder="e.g. The kitchen tap is leaking and water is pooling under the sink..." />
            </div>

            {/* Photo upload */}
            <div>
              <label className={labelCls}>Attach a Photo (optional)</label>
              <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-500">
                  {photoFile ? photoFile.name : "Tap to add photo (jpg, png, pdf — max 10MB)"}
                </span>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            {/* Inspection toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900 text-sm">Inspection Required?</p>
                <p className="text-xs text-gray-500 mt-0.5">Our team will inspect before quoting</p>
              </div>
              <button
                type="button"
                onClick={() => set("inspectionRequired", !form.inspectionRequired)}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.inspectionRequired ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.inspectionRequired ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl text-base transition-colors">
              {loading ? "Submitting..." : "Submit Request"}
            </button>

            <p className="text-xs text-gray-400 text-center">
              By submitting, you agree to be contacted about your service request.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
