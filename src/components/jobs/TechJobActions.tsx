"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_TRANSITIONS: Record<string, { next: string; label: string; color: string }> = {
  new: { next: "in_progress", label: "Start Job", color: "bg-yellow-500 hover:bg-yellow-600" },
  ready: { next: "in_progress", label: "Start Job", color: "bg-yellow-500 hover:bg-yellow-600" },
  in_progress: { next: "completed", label: "Mark Completed", color: "bg-green-600 hover:bg-green-700" },
};

export default function TechJobActions({ jobId, jobStatus }: { jobId: string; jobStatus: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const transition = STATUS_TRANSITIONS[jobStatus];

  async function updateStatus() {
    if (!transition) return;
    setStatusLoading(true);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobStatus: transition.next }),
      });
      router.refresh();
    } finally {
      setStatusLoading(false);
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("jobId", jobId);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json();
        setUploadError(data.error ?? "Upload failed");
        return;
      }
      const data = await res.json();
      setUploadedUrl(data.url);
      router.refresh();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {/* Status update */}
      {transition && (
        <button
          onClick={updateStatus}
          disabled={statusLoading}
          className={`w-full py-4 ${transition.color} disabled:opacity-60 text-white font-bold rounded-2xl text-base transition-colors`}
        >
          {statusLoading ? "Updating..." : transition.label}
        </button>
      )}

      {/* Photo upload */}
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
          id="tech-photo-input"
        />
        <label
          htmlFor="tech-photo-input"
          className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-dashed cursor-pointer transition-colors font-semibold text-sm ${
            uploading
              ? "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
              : "border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {uploading ? "Uploading..." : "Upload Photo"}
        </label>

        {uploadError && (
          <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>
        )}
        {uploadedUrl && !uploadError && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={uploadedUrl} alt="Uploaded" className="rounded-xl w-full max-h-48 object-cover border border-gray-200" />
            <p className="text-xs text-green-600 mt-1 font-medium">Photo uploaded successfully</p>
          </div>
        )}
      </div>
    </div>
  );
}
