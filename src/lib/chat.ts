import { appendRow, findRow } from "@/lib/sheets";

export async function ensureChatThreadForJob(jobId: string, tenantId: string) {
  const existing = await findRow("ChatThreads", (r) => r.jobId === jobId);
  if (existing) return existing;

  return appendRow("ChatThreads", {
    tenantId,
    jobId,
    pendingOn: "none",
    lastMessage: "",
    lastMessageAt: "",
    lastMessageBy: "",
    lastResponseTime: "",
    responseDueTime: "",
  });
}
