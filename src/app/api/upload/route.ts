import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_SIZE = 10 * 1024 * 1024;
const BUCKET = "job-attachments";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const jobId = formData.get("jobId") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Allowed: jpg, png, pdf, docx" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name).toLowerCase();
  const safeFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const storagePath = jobId ? `${jobId}/${safeFileName}` : safeFileName;

  // Upload to Supabase Storage
  const { error: storageError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  // Get the permanent public URL
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  // Record in Supabase attachments table
  const { data: attachment, error: dbError } = await supabaseAdmin
    .from("attachments")
    .insert({
      job_id: jobId ?? null,
      message_id: null,
      file_name: file.name,
      file_type: file.type,
      file_url: publicUrl,
      file_size: file.size,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ url: publicUrl, attachmentId: attachment.id });
}
