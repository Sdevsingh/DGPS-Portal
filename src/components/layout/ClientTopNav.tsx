"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function ClientTopNav() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? "";

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/client" className="flex items-center">
          <div className="relative inline-flex items-center justify-center">
            <div className="logo-glow absolute -inset-4 bg-blue-200/40 rounded-full blur-xl pointer-events-none" />
            <div className="logo-glow-sm absolute -inset-2 bg-indigo-200/30 rounded-full blur-md pointer-events-none" style={{ animationDelay: "0.5s" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Logo.jpeg"
              alt="Domain Group"
              className="relative h-7 w-auto object-contain drop-shadow-[0_0_6px_rgba(96,165,250,0.3)]"
            />
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {name && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-[11px] font-semibold text-white">{name[0]?.toUpperCase()}</span>
              </div>
              <span className="text-sm text-gray-600 font-medium">{name}</span>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
