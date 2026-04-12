"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import * as Select from "@radix-ui/react-select";

const COUNTRY_CODES = [
  { code: "+61", label: "🇦🇺 +61", placeholder: "04xx xxx xxx" },
  { code: "+1",  label: "🇺🇸 +1",  placeholder: "(555) 000-0000" },
  { code: "+44", label: "🇬🇧 +44", placeholder: "07xxx xxxxxx" },
  { code: "+64", label: "🇳🇿 +64", placeholder: "021 xxx xxxx" },
  { code: "+91", label: "🇮🇳 +91", placeholder: "98xxx xxxxx" },
];

// Validation helpers
function validateEmail(email: string): string {
  if (!email) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? ""
    : "Please enter a valid email address";
}

function validatePhone(phone: string, countryCode: string): string {
  if (!phone.trim()) return "";
  const digits = phone.replace(/[\s\-().+]/g, "");
  if (countryCode === "+61") {
    // Australian: 10 digits starting with 0 (04xx) or 9 digits starting with 4
    if (!/^(0\d{9}|\d{9})$/.test(digits)) {
      return "Enter a valid Australian number";
    }
  } else {
    // Generic: between 7 and 15 digits
    if (digits.length < 7 || digits.length > 15) {
      return "Enter a valid phone number (7–15 digits)";
    }
  }
  return "";
}

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
        className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? "translateX(1.375rem)" : "translateX(0.125rem)" }}
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

  // Field-level validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setErr(field: string, msg: string) {
    setErrors((prev) => ({ ...prev, [field]: msg }));
  }
  function clearErr(field: string) {
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  // ── Shared fields ────────────────────────────────────────────────────────────
  const [streetAddress, setStreetAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [addrState, setAddrState] = useState("VIC");
  const [postcode, setPostcode] = useState("");
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
    setSubmitError("");

    // Run all validations before submitting
    const newErrors: Record<string, string> = {};

    if (isClient) {
      const agentPhoneErr = validatePhone(agentPhone, agentCountryCode);
      if (agentPhoneErr) newErrors.agentPhone = agentPhoneErr;

      const agentEmailErr = validateEmail(agentEmail);
      if (agentEmailErr) newErrors.agentEmail = agentEmailErr;

      if (customerPhone.trim()) {
        const custPhoneErr = validatePhone(customerPhone, customerCountryCode);
        if (custPhoneErr) newErrors.customerPhone = custPhoneErr;
      }
      if (customerEmail.trim()) {
        const custEmailErr = validateEmail(customerEmail);
        if (custEmailErr) newErrors.customerEmail = custEmailErr;
      }
    } else {
      if (opsForm.agentContact.trim()) {
        const err = validatePhone(opsForm.agentContact, "+61");
        if (err) newErrors.opsAgentContact = err;
      }
      if (opsForm.agentEmail.trim()) {
        const err = validateEmail(opsForm.agentEmail);
        if (err) newErrors.opsAgentEmail = err;
      }
      if (opsForm.customerContact.trim()) {
        const err = validatePhone(opsForm.customerContact, "+61");
        if (err) newErrors.opsCustomerContact = err;
      }
      if (opsForm.customerEmail.trim()) {
        const err = validateEmail(opsForm.customerEmail);
        if (err) newErrors.opsCustomerEmail = err;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const fullAddress = `${streetAddress.trim()}, ${suburb.trim()} ${addrState} ${postcode.trim()}`;

    try {
      const payload = isClient
        ? {
            agentName:       agentName.trim(),
            agentEmail:      agentEmail.trim(),
            agentContact:    `${agentCountryCode} ${agentPhone.trim()}`,
            companyName:     customerName.trim(),
            customerEmail:   customerEmail.trim(),
            customerContact: `${customerCountryCode} ${customerPhone.trim()}`,
            propertyAddress: fullAddress,
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
            propertyAddress: fullAddress,
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
                      onChange={(e) => { setAgentCountryCode(e.target.value); clearErr("agentPhone"); }}
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
                      onChange={(e) => { setAgentPhone(e.target.value); clearErr("agentPhone"); }}
                      onBlur={() => { const err = validatePhone(agentPhone, agentCountryCode); err ? setErr("agentPhone", err) : clearErr("agentPhone"); }}
                      placeholder={selectedAgentCountry.placeholder}
                      className={`${inputCls} ${errors.agentPhone ? "border-red-400 focus:ring-red-400" : ""}`}
                    />
                  </div>
                  {errors.agentPhone && <p className="mt-1 text-xs text-red-500">{errors.agentPhone}</p>}
                </div>

                {/* Agent Personal Email */}
                <div className="sm:col-span-2">
                  <label className={labelCls}>Your Email (for direct contact)</label>
                  <input
                    type="email"
                    value={agentEmail}
                    onChange={(e) => { setAgentEmail(e.target.value); clearErr("agentEmail"); }}
                    onBlur={() => { const err = validateEmail(agentEmail); err ? setErr("agentEmail", err) : clearErr("agentEmail"); }}
                    className={`${inputCls} ${errors.agentEmail ? "border-red-400 focus:ring-red-400" : ""}`}
                    placeholder="john.smith@dgps.com.au"
                  />
                  {errors.agentEmail && <p className="mt-1 text-xs text-red-500">{errors.agentEmail}</p>}
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
                      onChange={(e) => { setCustomerCountryCode(e.target.value); clearErr("customerPhone"); }}
                      className="px-2.5 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shrink-0"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => { setCustomerPhone(e.target.value); clearErr("customerPhone"); }}
                      onBlur={() => { if (customerPhone.trim()) { const err = validatePhone(customerPhone, customerCountryCode); err ? setErr("customerPhone", err) : clearErr("customerPhone"); } }}
                      placeholder={selectedCustomerCountry.placeholder}
                      className={`${inputCls} ${errors.customerPhone ? "border-red-400 focus:ring-red-400" : ""}`}
                    />
                  </div>
                  {errors.customerPhone && <p className="mt-1 text-xs text-red-500">{errors.customerPhone}</p>}
                </div>

                {/* Customer Email */}
                <div className="sm:col-span-2">
                  <label className={labelCls}>Customer Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => { setCustomerEmail(e.target.value); clearErr("customerEmail"); }}
                    onBlur={() => { if (customerEmail.trim()) { const err = validateEmail(customerEmail); err ? setErr("customerEmail", err) : clearErr("customerEmail"); } }}
                    className={`${inputCls} ${errors.customerEmail ? "border-red-400 focus:ring-red-400" : ""}`}
                    placeholder="e.g. sarah.johnson@email.com"
                  />
                  {errors.customerEmail && <p className="mt-1 text-xs text-red-500">{errors.customerEmail}</p>}
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
                  <input value={opsForm.agentContact}
                    onChange={(e) => { setOps("agentContact", e.target.value); clearErr("opsAgentContact"); }}
                    onBlur={() => { if (opsForm.agentContact.trim()) { const err = validatePhone(opsForm.agentContact, "+61"); err ? setErr("opsAgentContact", err) : clearErr("opsAgentContact"); } }}
                    className={`${inputCls} ${errors.opsAgentContact ? "border-red-400 focus:ring-red-400" : ""}`}
                    placeholder="04xx xxx xxx" />
                  {errors.opsAgentContact && <p className="mt-1 text-xs text-red-500">{errors.opsAgentContact}</p>}
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Agent Email</label>
                  <input type="email" value={opsForm.agentEmail}
                    onChange={(e) => { setOps("agentEmail", e.target.value); clearErr("opsAgentEmail"); }}
                    onBlur={() => { if (opsForm.agentEmail.trim()) { const err = validateEmail(opsForm.agentEmail); err ? setErr("opsAgentEmail", err) : clearErr("opsAgentEmail"); } }}
                    className={`${inputCls} ${errors.opsAgentEmail ? "border-red-400 focus:ring-red-400" : ""}`}
                    placeholder="john.smith@company.com.au" />
                  {errors.opsAgentEmail && <p className="mt-1 text-xs text-red-500">{errors.opsAgentEmail}</p>}
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
                  <input value={opsForm.customerContact}
                    onChange={(e) => { setOps("customerContact", e.target.value); clearErr("opsCustomerContact"); }}
                    onBlur={() => { if (opsForm.customerContact.trim()) { const err = validatePhone(opsForm.customerContact, "+61"); err ? setErr("opsCustomerContact", err) : clearErr("opsCustomerContact"); } }}
                    className={`${inputCls} ${errors.opsCustomerContact ? "border-red-400 focus:ring-red-400" : ""}`}
                    placeholder="04xx xxx xxx" />
                  {errors.opsCustomerContact && <p className="mt-1 text-xs text-red-500">{errors.opsCustomerContact}</p>}
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Customer Email</label>
                  <input type="email" value={opsForm.customerEmail}
                    onChange={(e) => { setOps("customerEmail", e.target.value); clearErr("opsCustomerEmail"); }}
                    onBlur={() => { if (opsForm.customerEmail.trim()) { const err = validateEmail(opsForm.customerEmail); err ? setErr("opsCustomerEmail", err) : clearErr("opsCustomerEmail"); } }}
                    className={`${inputCls} ${errors.opsCustomerEmail ? "border-red-400 focus:ring-red-400" : ""}`}
                    placeholder="e.g. sarah.johnson@email.com" />
                  {errors.opsCustomerEmail && <p className="mt-1 text-xs text-red-500">{errors.opsCustomerEmail}</p>}
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
            <div className="col-span-2 space-y-3">
              <div>
                <label className={labelCls}>Street Address *</label>
                <input required value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)}
                  className={inputCls} placeholder="e.g. 42 Harbour View Drive" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Suburb *</label>
                  <input required value={suburb} onChange={(e) => setSuburb(e.target.value)}
                    className={inputCls} placeholder="e.g. Pyrmont" />
                </div>
                <div>
                  <label className={labelCls}>State *</label>
                  <Select.Root value={addrState} onValueChange={setAddrState}>
                    <Select.Trigger className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 cursor-pointer">
                      <Select.Value />
                      <Select.Icon><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content position="popper" sideOffset={4} className="z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[120px]">
                        <Select.Viewport className="p-1">
                          {["ACT","NSW","NT","QLD","SA","TAS","VIC","WA"].map((s) => (
                            <Select.Item key={s} value={s} className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 rounded-lg cursor-pointer outline-none data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 data-[state=checked]:font-semibold data-[state=checked]:text-blue-700">
                              <Select.ItemText>{s}</Select.ItemText>
                              <Select.ItemIndicator><svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
                <div>
                  <label className={labelCls}>Postcode *</label>
                  <input required maxLength={4} value={postcode} onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ""))}
                    className={inputCls} placeholder="2000" />
                </div>
              </div>
            </div>

            <div className={isClient ? "col-span-2" : "col-span-1"}>
              <label className={labelCls}>Category *</label>
              <select required value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                <option>Plumbing</option>
                <option>Electrical</option>
                <option>Roofing</option>
                <option>HVAC</option>
                <option>General Maintenance</option>
                <option>Carpentry</option>
                <option>Cleaning</option>
                <option>Painting &amp; Plastering</option>
                <option>Garden &amp; Landscaping</option>
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
