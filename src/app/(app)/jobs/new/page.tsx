"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function NewJobPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && session.user.role !== "operations_manager") {
      router.replace("/jobs");
    }
  }, [session, router]);

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    agentName: "",
    agentContact: "",
    agentEmail: "",
    propertyAddress: "",
    description: "",
    category: "Plumbing",
    priority: "medium",
    source: "manual",
    inspectionRequired: "false",
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const [submitError, setSubmitError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const job = await res.json();
        router.push(`/jobs/${job.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error ?? "Failed to create job. Please try again.");
      }
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/jobs" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Job</h1>
      </div>

      {submitError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {submitError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Property Address *</label>
            <input required value={form.propertyAddress} onChange={(e) => set("propertyAddress", e.target.value)}
              className={inputCls} placeholder="123 Smith St, Sydney NSW 2000" />
          </div>
          <div>
            <label className={labelCls}>Company Name *</label>
            <input required value={form.companyName} onChange={(e) => set("companyName", e.target.value)}
              className={inputCls} placeholder="Property manager company" />
          </div>
          <div>
            <label className={labelCls}>Agent Name</label>
            <input value={form.agentName} onChange={(e) => set("agentName", e.target.value)}
              className={inputCls} placeholder="Agent full name" />
          </div>
          <div>
            <label className={labelCls}>Agent Contact</label>
            <input value={form.agentContact} onChange={(e) => set("agentContact", e.target.value)}
              className={inputCls} placeholder="04xx xxx xxx" />
          </div>
          <div>
            <label className={labelCls}>Client Email</label>
            <input type="email" value={form.agentEmail} onChange={(e) => set("agentEmail", e.target.value)}
              className={inputCls} placeholder="client@email.com (links to client portal)" />
          </div>
          <div>
            <label className={labelCls}>Category *</label>
            <select required value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
              <option>Plumbing</option>
              <option>Electrical</option>
              <option>Roofing</option>
              <option>HVAC</option>
              <option>General Maintenance</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Priority</label>
            <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={inputCls}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Source</label>
            <select value={form.source} onChange={(e) => set("source", e.target.value)} className={inputCls}>
              <option value="manual">Manual</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Description *</label>
            <textarea required rows={4} value={form.description} onChange={(e) => set("description", e.target.value)}
              className={inputCls + " resize-none"} placeholder="Describe the job in detail..." />
          </div>

          {/* Inspection Required toggle */}
          <div className="col-span-2">
            <button
              type="button"
              role="switch"
              aria-checked={form.inspectionRequired === "true"}
              onClick={() => set("inspectionRequired", form.inspectionRequired === "true" ? "false" : "true")}
              className={`w-full flex items-center justify-between px-4 py-3 border rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                form.inspectionRequired === "true"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 bg-white hover:border-blue-300"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-gray-700">Inspection Required?</p>
                <p className="text-xs text-gray-400 mt-0.5">Team will inspect before quoting</p>
              </div>
              <span
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.inspectionRequired === "true" ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.inspectionRequired === "true" ? "translate-x-[1.375rem]" : "translate-x-0.5"}`} />
              </span>
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/jobs" className="flex-1 py-3 text-center border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors">
            {loading ? "Creating..." : "Create Job"}
          </button>
        </div>
      </form>
    </div>
  );
}
