import { supabaseAdmin } from "./supabase";
import { formatThread } from "./db";

export async function ensureChatThreadForJob(jobId: string, tenantId: string) {
  const { data: existing } = await supabaseAdmin
    .from("chat_threads")
    .select("*")
    .eq("job_id", jobId)
    .single();

  if (existing) return formatThread(existing);

  const { data: created, error } = await supabaseAdmin
    .from("chat_threads")
    .insert({
      tenant_id: tenantId,
      job_id: jobId,
      pending_on: "none",
      last_message: null,
      last_message_at: null,
      last_message_by: null,
    })
    .select()
    .single();

  if (error || !created) throw new Error("Failed to create chat thread");
  return formatThread(created);
}
