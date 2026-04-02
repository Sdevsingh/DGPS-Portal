import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      tenantId: string;
      tenantName: string;
      tenantSlug: string;
      assignedTenantIds: string[];
    };
  }

  interface User {
    id: string;
    role: string;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    assignedTenantIds: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    assignedTenantIds: string[];
  }
}

export type { NextAuth };
