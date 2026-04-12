import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatJob } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import ClientJobsView from "@/components/client/ClientJobsView";

export default async function ClientPortalPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "client") redirect("/dashboard");

  const { tenantId, id: userId, email } = session.user;

  const [{ data: tenantData }, { data: jobsRaw }] = await Promise.all([
    supabaseAdmin.from("tenants").select("id, name, slug").eq("id", tenantId).single(),
    supabaseAdmin.from("jobs").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
  ]);

  const jobs = (jobsRaw ?? [])
    .map(formatJob)
    .filter((j) => j.agentEmail?.toLowerCase() === email?.toLowerCase() || j.createdByUserId === userId);

  const tenantName = tenantData?.name ?? session.user.tenantName ?? "";
  const tenantSlug = tenantData?.slug ?? "";
  const activeCount = jobs.filter((j) => !["completed", "paid"].includes(j.jobStatus === "ready" ? "in_progress" : j.jobStatus)).length;
  const quoteCount  = jobs.filter((j) => j.quoteStatus === "sent").length;

  return (
    <div style={{ minHeight: "100vh", background: "#eef2ff", marginTop: "-1px" }}>

      {/* ── Blue gradient hero ── */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #4f46e5 100%)",
        padding: "32px 20px 80px",
      }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>

          {/* Tenant badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)",
            borderRadius: "999px", padding: "5px 14px", marginBottom: "28px",
          }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#34d399" }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {tenantName}
            </span>
          </div>

          {/* Heading row */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "13px", color: "#93c5fd", marginBottom: "6px", letterSpacing: "0.01em" }}>
                Welcome back
              </p>
              <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#fff", lineHeight: 1.1, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
                {session.user.name}
              </h1>

              {/* Stats row */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "13px", color: "#bfdbfe" }}>
                  {jobs.length} request{jobs.length !== 1 ? "s" : ""}
                </span>
                {activeCount > 0 && (
                  <>
                    <span style={{ color: "#60a5fa", opacity: 0.5 }}>·</span>
                    <span style={{ fontSize: "13px", color: "#bfdbfe" }}>{activeCount} active</span>
                  </>
                )}
                {quoteCount > 0 && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.35)",
                    borderRadius: "999px", padding: "4px 12px", fontSize: "11px", fontWeight: 700, color: "#fef3c7",
                  }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#fbbf24" }} />
                    {quoteCount} quote{quoteCount > 1 ? "s" : ""} ready
                  </span>
                )}
              </div>
            </div>

            {/* New Request CTA */}
            <Link
              href="/jobs/new"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "11px 20px", background: "#fff", color: "#1d4ed8",
                borderRadius: "14px", fontSize: "13px", fontWeight: 700,
                textDecoration: "none", flexShrink: 0,
                boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Request
            </Link>
          </div>
        </div>
      </div>

      {/* ── Content card rises from hero ── */}
      <div style={{ padding: "0 16px 56px" }}>
        <div style={{ maxWidth: "640px", margin: "-52px auto 0" }}>
          {jobs.length === 0 ? (
            <div style={{
              background: "#fff", borderRadius: "20px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 8px 40px rgba(30,58,138,0.12), 0 2px 8px rgba(0,0,0,0.06)",
              padding: "64px 24px", textAlign: "center",
            }}>
              <div style={{
                width: "64px", height: "64px", background: "#eff6ff",
                borderRadius: "18px", display: "flex", alignItems: "center",
                justifyContent: "center", margin: "0 auto 18px",
              }}>
                <svg width="30" height="30" fill="none" stroke="#60a5fa" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>No requests yet</h2>
              <p style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "28px", lineHeight: 1.6 }}>
                Submit your first service request and we&apos;ll take care of the rest.
              </p>
              <Link
                href="/jobs/new"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  padding: "12px 24px", background: "#2563eb", color: "#fff",
                  borderRadius: "12px", fontSize: "14px", fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Submit Request
              </Link>
            </div>
          ) : (
            <ClientJobsView jobs={jobs as unknown as Record<string, string>[]} tenantSlug={tenantSlug} />
          )}
        </div>
      </div>
    </div>
  );
}
