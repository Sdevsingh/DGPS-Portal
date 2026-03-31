import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import SessionProvider from "@/components/layout/SessionProvider";
import ClientTopNav from "@/components/layout/ClientTopNav";
import MobileNav from "@/components/layout/MobileNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isClient = session.user.role === "client";

  return (
    <SessionProvider>
      {isClient ? (
        <div className="min-h-screen bg-gray-50">
          <ClientTopNav />
          <main>{children}</main>
        </div>
      ) : (
        <div className="flex h-screen overflow-hidden bg-gray-50">
          {/* Desktop sidebar */}
          <div className="hidden md:flex">
            <Sidebar />
          </div>
          {/* Mobile: top bar + drawer */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-40">
            <MobileNav />
          </div>
          <main className="flex-1 overflow-auto md:pt-0 pt-14">
            {children}
          </main>
        </div>
      )}
    </SessionProvider>
  );
}
