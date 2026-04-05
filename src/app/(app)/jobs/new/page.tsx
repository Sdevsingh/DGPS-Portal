"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const COUNTRY_CODES = [
  { code: "+61", label: "🇦🇺 +61", placeholder: "04xx xxx xxx" },
  { code: "+1",  label: "🇺🇸 +1",  placeholder: "(555) 000-0000" },
  { code: "+44", label: "🇬🇧 +44", placeholder: "07xxx xxxxxx" },
  { code: "+64", label: "🇳🇿 +64", placeholder: "021 xxx xxxx" },
  { code: "+91", label: "🇮🇳 +91", placeholder: "98xxx xxxxx" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
        checked ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function NewJobPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const role = session?.user?.role;
  const isClient = role === "client";

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (role !== "operations_manager" && role !== "client")) {
      router.replace(role === "technician" ? "/technician" : "/dashboard");
    }
  }, [session, status, role, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Shared fields ────────────────────────────────────────────────────────────
  const [propertyAddress, setPropertyAddress] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General Maintenance");
  const [inspectionRequired, setInspectionRequired] = useState(false);

  // ── Client-only fields ───────────────────────────────────────────────────────
  // agent_name       = the DGPS staff member raising this job
  // agent_contact    = their direct phone
  // agent_email      = their personal direct email (for direct contact — NOT the shared login email)
  // company_name     = end customer name (person who requested the service)
  // customer_contact = end customer's phone
  const [agentName, setAgentName]                     = useState("");
  const [agentEmail, setAgentEmail]                   = useState("");
  const [agentCountryCode, setAgentCountryCode]       = useState("+61");
  const [agentPhone, setAgentPhone]                   = useState("");
  const [customerName, setCustomerName]               = useState("");
  const [customerEmail, setCustomerEmail]             = useState("");
  const [customerCountryCode, setCustomerCountryCode] = useState("+61");
  const [customerPhone, setCustomerPhone]             = useState("");
  const [photoFile, setPhotoFile]                     = useState<File | null>(null);
  const fileInputRef                                  = useRef<HTMLInputElement>(null);

  // ── Ops manager-only fields ──────────────────────────────────────────────────
  const [opsForm, setOpsForm] = useState({
    customerName: "",
    customerContact: "",
    customerEmail: "",
    agentName: "",
    agentContact: "",
    agentEmail: "",
    priority: "medium",
    source: "manual",
  });

  function setOps(key: string, value: string) {
    setOpsForm((prev) => ({ ...prev, [key]: value }));
  }

  const selectedAgentCountry    = COUNTRY_CODES.find((c) => c.code === agentCountryCode)    ?? COUNTRY_CODES[0];
  const selectedCustomerCountry = COUNTRY_CODES.find((c) => c.code === customerCountryCode) ?? COUNTRY_CODES[0];

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSubmitError("");

    try {
      const payload = isClient
        ? {
            agentName:       agentName.trim(),
            agentEmail:      agentEmail.trim(),
            agentContact:    `${agentCountryCode} ${agentPhone.trim()}`,
            companyName:     customerName.trim(),
            customerEmail:   customerEmail.trim(),
            customerContact: `${customerCountryCode} ${customerPhone.trim()}`,
            propertyAddress: propertyAddress.trim(),
            category,
            description:     description.trim(),
            inspectionRequired: String(inspectionRequired),
          }
        : {
            companyName:     opsForm.customerName.trim(),
            customerContact: opsForm.customerContact.trim(),
            customerEmail:   opsForm.customerEmail.trim(),
            agentName:       opsForm.agentName.trim(),
            agentContact:    opsForm.agentContact.trim(),
            agentEmail:      opsForm.agentEmail.trim(),
            priority:        opsForm.priority,
            source:          opsForm.source,
            propertyAddress: propertyAddress.trim(),
            category,
            description:     description.trim(),
            inspectionRequired: String(inspectionRequired),
          };

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error ?? "Failed to create job. Please try again.");
        setLoading(false);
        return;
      }

      const job = await res.json();

      // Upload photo if one was selected (client only)
      if (isClient && photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        fd.append("jobId", job.id);
        await fetch("/api/upload", { method: "POST", body: fd });
      }

      router.push(isClient ? `/client/jobs/${job.id}` : `/jobs/${job.id}`);
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  const inputCls = "w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={isClient ? "/client" : "/jobs"} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isClient ? "Submit a New Job Request" : "New Job"}
        </h1>
      </div>

      {submitError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── CLIENT FORM ───────────────────────────────────────────────────── */}
        {isClient && (
          <>
            {/* Your Details — the DGPS agent raising this job */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Your Details</p>
                <p className="text-xs text-gray-400 mt-0.5">The agent raising this job request</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Agent Name */}
                <div>
                  <label className={labelCls}>Your Name *</label>
                  <input
                    required
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. John Smith"
                  />
                </div>

                {/* Agent Contact */}
                <div>
                  <label className={labelCls}>Your Contact Number *</label>
                  <div className="flex gap-2">
                    <select
                      value={agentCountryCode}
                      onChange={(e) => setAgentCountryCode(e.target.value)}
                      className="px-2.5 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shrink-0"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                    <input
                      required
                      type="tel"
                      value={agentPhone}
                      onChange={(e) => setAgentPhone(e.target.value)}
                      placeholder={selectedAgentCountry.placeholder}
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Agent Personal Email */}
                <div className="sm:col-span-2">
                  <label className={labelCls}>Your Email (for direct contact)</label>
                  <input
                    type="email"
                    value={agentEmail}
                    onChange={(e) => setAgentEmail(e.target.value)}
                    className={inputCls}
                    placeholder="john.smith@dgps.com.au"
                  />
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Customer Details</p>
                <p className="text-xs text-gray-400 mt-0.5">The individual or business that requested this service</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Name */}
                <div>
                  <label className={labelCls}>Customer / Individual Name *</label>
                  <input
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Mrs. Sarah Johnson or Acme Corp"
                  />
                </div>

                {/* Customer Phone */}
                <div>
                  <label className={labelCls}>Customer Contact Number</label>
                  <div className="flex gap-2">
                    <select
                      value={customerCountryCode}
                      onChange={(e) => setCustomerCountryCode(e.target.value)}
                      className="px-2.5 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shrink-0"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder={selectedCustomerCountry.placeholder}
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Customer Email */}
                <div className="sm:col-span-2">
                  <label className={labelCls}>Customer Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. sarah.johnson@email.com"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── OPS MANAGER FORM ──────────────────────────────────────────────── */}
        {!isClient && (
          <>
            {/* Agent Details */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Agent Details</p>
                <p className="text-xs text-gray-400 mt-0.5">The staff member raising this job</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Agent Name</label>
                  <input value={opsForm.agentName} onChange={(e) => setOps("agentName", e.target.value)}
                    className={inputCls} placeholder="e.g. John Smith" />
                </div>
                <div>
                  <label className={labelCls}>Agent Contact</label>
                  <input value={opsForm.agentContact} onChange={(e) => setOps("agentContact", e.target.value)}
                    className={inputCls} placeholder="04xx xxx xxx" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Agent Email</label>
                  <input type="email" value={opsForm.agentEmail} onChange={(e) => setOps("agentEmail", e.target.value)}
                    className={inputCls} placeholder="john.smith@company.com.au" />
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Customer Details</p>
                <p className="text-xs text-gray-400 mt-0.5">The individual or business that requested this service</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Customer Name *</label>
                  <input required value={opsForm.customerName} onChange={(e) => setOps("customerName", e.target.value)}
                    className={inputCls} placeholder="e.g. Mrs. Sarah Johnson or Acme Corp" />
                </div>
                <div>
                  <label className={labelCls}>Customer Contact Number</label>
                  <input value={opsForm.customerContact} onChange={(e) => setOps("customerContact", e.target.value)}
                    className={inputCls} placeholder="04xx xxx xxx" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Customer Email</label>
                  <input type="email" value={opsForm.customerEmail} onChange={(e) => setOps("customerEmail", e.target.value)}
                    className={inputCls} placeholder="e.g. sarah.johnson@email.com" />
                </div>
              </div>
            </div>

            {/* Job Meta */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Priority</label>
                  <select value={opsForm.priority} onChange={(e) => setOps("priority", e.target.value)} className={inputCls}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Source</label>
                  <select value={opsForm.source} onChange={(e) => setOps("source", e.target.value)} className={inputCls}>
                    <option value="manual">Manual</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── SHARED: Job Details ────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          {isClient && (
            <div>
              <p className="text-sm font-semibold text-gray-900">Job Details</p>
              <p className="text-xs text-gray-400 mt-0.5">Where the work is needed and what the issue is</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Property Address *</label>
              <input required value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)}
                className={inputCls} placeholder="123 Smith St, Sydney NSW 2000" />
            </div>

            <div className={isClient ? "col-span-2" : "col-span-1"}>
              <label className={labelCls}>Category *</label>
              <select required value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                <option>Plumbing</option>
                <option>Electrical</option>
                <option>Roofing</option>
                <option>HVAC</option>
                <option>General Maintenance</option>
                <option>Other</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className={labelCls}>Description *</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls + " resize-none"}
                placeholder={isClient ? "e.g. Burst pipe under kitchen sink, needs urgent repair..." : "Describe the job in detail..."}
              />
            </div>

            {/* Photo upload — client only */}
            {isClient && (
              <div className="col-span-2">
                <label className={labelCls}>Attach a Photo (optional)</label>
                <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 transition-colors group">
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-400 truncate">
                    {photoFile ? photoFile.name : "Add photo (jpg, png, pdf — max 10MB)"}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {photoFile && (
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="mt-1.5 text-xs text-red-400 hover:text-red-600"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            )}

            {/* Inspection Required toggle */}
            <div className="col-span-2">
              <div className={`flex items-center justify-between px-4 py-3 border rounded-xl transition-colors ${
                inspectionRequired ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
              }`}>
                <div>
                  <p className="text-sm font-medium text-gray-700">Inspection Required?</p>
                  <p className="text-xs text-gray-400 mt-0.5">Team will inspect before quoting</p>
                </div>
                <Toggle checked={inspectionRequired} onChange={() => setInspectionRequired((v) => !v)} />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Link
            href={isClient ? "/client" : "/jobs"}
            className="flex-1 py-3 text-center border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            {loading
              ? (isClient ? "Submitting..." : "Creating...")
              : (isClient ? "Submit Job Request" : "Create Job")}
          </button>
        </div>
      </form>
    </div>
  );
}
