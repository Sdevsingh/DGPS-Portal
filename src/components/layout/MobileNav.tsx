"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navIcons: Record<string, React.ReactNode> = {
  "/dashboard": (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  "/jobs": (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  "/technician": (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    </svg>
  ),
  "/companies": (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  "/reports": (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  "/settings/users": (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
};

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const navItems = [
    { href: "/dashboard", label: "Dashboard", roles: ["super_admin", "operations_manager"] },
    { href: "/jobs", label: "Jobs", roles: ["super_admin", "operations_manager"] },
    { href: "/technician", label: "Field Jobs", roles: ["technician"] },
    { href: "/companies", label: "Companies", roles: ["super_admin"] },
    { href: "/reports", label: "Reports", roles: ["super_admin", "operations_manager"] },
    { href: "/settings/users", label: "Users", roles: ["super_admin", "operations_manager"] },
  ].filter((item) => !item.roles || item.roles.includes(role || ""));

  return (
    <>
      {/* Top bar */}
      <div className="md:hidden bg-gray-950 border-b border-white/5 flex items-center justify-between px-4 h-14 shrink-0">
        <div className="relative inline-flex items-center justify-center">
          <div className="logo-glow absolute -inset-4 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />
          <div className="logo-glow-sm absolute -inset-2 bg-indigo-400/15 rounded-full blur-md pointer-events-none" style={{ animationDelay: "0.5s" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="relative bg-white rounded-lg px-2 py-1">
            <img
              src="/Maintenr.png"
              alt="Maintenr"
              className="h-7 w-auto object-contain"
            />
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-72 bg-gray-950 h-full flex flex-col shadow-2xl border-r border-white/5">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
              <div className="relative inline-flex items-center justify-center">
                <div className="logo-glow absolute -inset-4 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />
                <div className="logo-glow-sm absolute -inset-2 bg-indigo-400/15 rounded-full blur-md pointer-events-none" style={{ animationDelay: "0.5s" }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className="bg-white rounded-lg px-2 py-1">
                  <img
                    src="/Maintenr.png"
                    alt="Maintenr"
                    className="h-7 w-auto object-contain"
                  />
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tenant name */}
            {role !== "super_admin" && session?.user?.tenantName && (
              <div className="mx-3 mt-3 px-3 py-2 bg-white/5 rounded-xl">
                <p className="text-xs text-blue-400 font-medium truncate">{session.user.tenantName}</p>
              </div>
            )}

            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                      active
                        ? "text-white bg-white/10 font-medium"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="shrink-0">{navIcons[item.href]}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* User section */}
            <div className="px-3 pb-8 border-t border-white/5 pt-4">
              <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">
                    {session?.user?.name?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{session?.user?.name}</p>
                  <p className="text-[11px] text-gray-500 capitalize">{role?.replace(/_/g, " ")}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-xl transition-all duration-150"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
