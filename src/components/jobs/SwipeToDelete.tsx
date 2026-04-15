"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";

type Props = {
  jobId: string;
  children: React.ReactNode;
};

const REVEAL = 88; // px — width of the red delete zone

export default function SwipeToDelete({ jobId, children }: Props) {
  const x = useMotionValue(0);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [removed, setRemoved]       = useState(false);

  const deleteOpacity = useTransform(x, [-REVEAL, -24, 0], [1, 0.7, 0]);
  const iconScale     = useTransform(x, [-REVEAL, -REVEAL / 2, 0], [1, 0.88, 0.72]);

  function snapBack() {
    animate(x, 0, { type: "spring", stiffness: 300, damping: 28, mass: 0.8 });
    setConfirming(false);
  }

  function handleDragEnd(_e: unknown, info: PanInfo) {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    // Swipe past threshold OR flick with enough speed
    if (offset < -(REVEAL / 3) || velocity < -300) {
      animate(x, -REVEAL, { type: "spring", stiffness: 300, damping: 28, mass: 0.8 });
      setConfirming(true);
    } else {
      snapBack();
    }
  }

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await animate(x, -600, { duration: 0.22, ease: "easeIn" });
      setRemoved(true);
    } catch {
      setDeleting(false);
      snapBack();
    }
  }

  if (removed) return null;

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* Red delete zone behind the card */}
      <motion.div
        style={{
          position: "absolute",
          right: 0, top: 0, bottom: 0,
          width: REVEAL,
          background: confirming ? "#dc2626" : "#ef4444",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 4,
          opacity: deleteOpacity,
        }}
      >
        {confirming ? (
          <button
            onClick={confirmDelete}
            disabled={deleting}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 4, color: "#fff", background: "none", border: "none",
              cursor: deleting ? "not-allowed" : "pointer",
              padding: "8px 12px", opacity: deleting ? 0.65 : 1,
            }}
          >
            {deleting ? (
              /* spinner — uses Tailwind animate-spin, no inline style tag needed */
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="animate-spin">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>
              {deleting ? "..." : "DELETE"}
            </span>
          </button>
        ) : (
          <motion.div style={{ scale: iconScale }}>
            <svg width="22" height="22" fill="none" stroke="rgba(255,255,255,0.85)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </motion.div>
        )}
      </motion.div>

      {/* Swipeable card */}
      <motion.div
        drag="x"
        dragConstraints={{ right: 0, left: -REVEAL }}
        dragElastic={{ left: 0.15, right: 0.05 }}
        dragMomentum={false}
        style={{ x, backgroundColor: "white", position: "relative", zIndex: 1 }}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          if (confirming) { e.preventDefault(); snapBack(); }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
