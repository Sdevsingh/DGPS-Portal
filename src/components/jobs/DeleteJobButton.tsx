"use client";

import { useRef, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

type Props = {
  jobId: string;
  jobNumber?: string;
};

export default function DeleteJobButton({ jobId, jobNumber }: Props) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const rowRef = useRef<HTMLElement | null>(null);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      setOpen(false);

      // Target the card row and animate it out
      const row = document.querySelector(`[data-job-row="${jobId}"]`) as HTMLElement | null;
      rowRef.current = row;

      if (row) {
        const h = row.offsetHeight;
        row.style.overflow = "hidden";
        row.style.height = `${h}px`;
        row.style.opacity = "1";
        row.style.transition = "height 0.25s ease, opacity 0.2s ease, margin 0.25s ease";
        // Force reflow
        void row.offsetHeight;
        row.style.height = "0px";
        row.style.opacity = "0";
        row.style.marginBottom = "0px";
      }
    } catch {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild>
        <button
          id={`delete-btn-${jobId}`}
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
          className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
          title="Delete job"
          aria-label="Delete job"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <AlertDialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(90vw, 420px)",
            zIndex: 51,
          }}
          className="bg-white rounded-2xl shadow-2xl p-6"
        >
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>

          <AlertDialog.Title className="text-lg font-bold text-gray-900 mb-1">
            Delete {jobNumber ?? "this job"}?
          </AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-gray-500 mb-6 leading-relaxed">
            This job will be removed from your view. All job data is retained securely and can be recovered by your administrator if needed.
          </AlertDialog.Description>

          <div className="flex gap-3">
            <AlertDialog.Cancel asChild>
              <button
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.25" strokeWidth="2.5" />
                      <path stroke="white" strokeWidth="2.5" strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Deleting…
                  </>
                ) : "Yes, delete"}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
