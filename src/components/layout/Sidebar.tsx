"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import NotificationBell from "./NotificationBell";

type NavItem = {
  href: string;
  label: string;
  roles?: string[];
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    roles: ["super_admin", "operations_manager", "technician"],
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: "/technician",
    label: "Field Jobs",
    roles: ["technician"],
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/jobs",
    label: "Jobs",
    roles: ["super_admin", "operations_manager"],
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: "/analytics",
    label: "Analytics",
    roles: ["super_admin", "operations_manager"],
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/companies",
    label: "Companies",
    roles: ["super_admin"],
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: "/reports",
    label: "Reports",
    roles: ["super_admin", "operations_manager"],
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/settings/users",
    label: "Users",
    roles: ["super_admin"],
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: "/settings/privileges",
    label: "Privileges",
    roles: ["super_admin"],
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

// Animation variants
const sidebarVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.1 } },
} as const;
const navItemVariants = {
  hidden: { opacity: 0, x: -14 },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visible: { opacity: 1, x: 0 } as any,
} as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = session?.user?.role;

  if (status === "loading") {
    return (
      <aside className="w-60 bg-gray-950 shrink-0 h-full border-r border-white/5 flex flex-col">
        {/* Skeleton header */}
        <div className="px-4 py-4 mb-2 border-b border-white/5">
          <div className="h-8 w-28 bg-white/5 rounded-lg animate-pulse" />
        </div>
        {/* Skeleton nav items */}
        <div className="flex-1 px-3 py-2 space-y-1">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-9 bg-white/5 rounded-xl animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </aside>
    );
  }

  if (role === "client") return null;

  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role || ""));

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-60 bg-gray-950 flex flex-col h-full border-r border-white/5"
    >
      {/* ── Logo ───────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 mb-2 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="relative inline-flex items-center justify-center">
            <div className="logo-glow absolute -inset-5 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="logo-glow-sm absolute -inset-2 bg-indigo-400/15 rounded-full blur-lg pointer-events-none" style={{ animationDelay: "0.5s" }} />
            <Image
              src="/Logo.jpeg"
              alt="Domain Group Property Services"
              width={120}
              height={32}
              className="relative h-8 w-auto object-contain drop-shadow-[0_0_8px_rgba(96,165,250,0.45)]"
              priority
            />
          </div>
        </div>
        <p className="text-[10px] text-gray-500 mt-1.5 font-medium uppercase tracking-wider pl-0.5">
          Operations Platform
        </p>
      </div>

      {/* ── Tenant badge ────────────────────────────────────────────────── */}
      {role !== "super_admin" && session?.user?.tenantName && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="mx-3 mb-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5"
        >
          <p className="text-xs text-blue-400 font-medium truncate">{session.user.tenantName}</p>
        </motion.div>
      )}

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <motion.nav
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto"
      >
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <motion.div key={item.href} variants={navItemVariants}>
              <Link
                href={item.href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                  active
                    ? "text-white bg-white/10 font-medium"
                    : "text-gray-400 hover:text-white hover:bg-white/5 font-normal"
                }`}
              >
                {/* Active indicator bar */}
                {active && (
                  <motion.span
                    layoutId="nav-active-bar"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`shrink-0 transition-colors duration-200 ${active ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"}`}>
                  {item.icon}
                </span>
                {item.label}
                {/* Active dot on right */}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                )}
              </Link>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* ── User section ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="px-3 pb-6 pt-4 border-t border-white/5"
      >
        <div className="flex items-center justify-between px-3 py-2 mb-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white/10">
              <span className="text-xs font-semibold text-white">
                {session?.user?.name?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate leading-tight">
                {session?.user?.name}
              </p>
              <p className="text-[11px] text-gray-500 capitalize truncate mt-0.5">
                {role === "client" && session?.user?.clientCompanyName
                  ? `Client · ${session.user.clientCompanyName}`
                  : role?.replace(/_/g, " ")}
              </p>
            </div>
          </div>
          <NotificationBell />
        </div>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-150"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </motion.button>
      </motion.div>
    </motion.aside>
  );
}
