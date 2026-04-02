"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function ClientTopNav() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? "Client";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");

  return (
    <header className="bg-white/95 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/client" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="leading-tight py-0.5">
            <p className="font-semibold text-gray-900 text-sm">DGPS</p>
            <p className="text-xs text-gray-400 hidden sm:block">Client Portal</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold items-center justify-center">
              {initials || "C"}
            </span>
            <span className="text-sm text-gray-700 max-w-40 truncate">{name}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors px-2.5 py-1 rounded-lg hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
