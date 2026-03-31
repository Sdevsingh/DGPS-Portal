import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile } from "fs/promises";
import path from "path";
import { appendRow } from "@/lib/sheets";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const jobId = formData.get("jobId") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Allowed: jpg, png, pdf, docx" }, { status: 400 });
  }

  // Validate size
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Safe filename
  const ext = path.extname(file.name).toLowerCase();
  const safeFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const uploadPath = path.join(process.cwd(), "public", "uploads", safeFileName);

  await writeFile(uploadPath, buffer);

  const fileUrl = `/uploads/${safeFileName}`;

  // Record in Sheets
  const attachment = await appendRow("Attachments", {
    jobId: jobId ?? "",
    messageId: "",
    fileName: file.name,
    fileType: file.type,
    fileUrl,
    fileSize: String(file.size),
  });

  return NextResponse.json({ url: fileUrl, attachmentId: attachment.id });
}
