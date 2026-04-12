import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "./supabase-server";
import { getOpsManagerTenantIds } from "./db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantSlug: { label: "Company Slug", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        const tenantSlug = credentials.tenantSlug?.trim().toLowerCase();

        let query = supabaseAdmin
          .from("users")
          .select("*, tenants(id, name, slug)")
          .eq("email", email)
          .eq("is_active", true);

        if (tenantSlug) {
          const { data: tenant } = await supabaseAdmin
            .from("tenants")
            .select("id")
            .eq("slug", tenantSlug)
            .single();
          if (!tenant) return null;
          query = query.eq("tenant_id", tenant.id);
        }

        const { data: users } = await query;
        if (!users || users.length === 0) return null;

        const matchingUsers = [];
        for (const candidate of users) {
          if (!candidate.password_hash) continue;
          const isMatch = await bcrypt.compare(credentials.password, candidate.password_hash);
          if (isMatch) matchingUsers.push(candidate);
        }

        if (matchingUsers.length !== 1) return null;
        const user = matchingUsers[0];
        const tenant = Array.isArray(user.tenants) ? user.tenants[0] : user.tenants;

        let assignedTenantIds: string[] = [];
        if (user.role === "operations_manager") {
          assignedTenantIds = await getOpsManagerTenantIds(user.id);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenant_id,
          tenantName: tenant?.name ?? "",
          tenantSlug: tenant?.slug ?? "",
          assignedTenantIds,
          clientCompanyName: user.client_company_name ?? "",
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as {
          id: string;
          role: string;
          tenantId: string;
          tenantName: string;
          tenantSlug: string;
          assignedTenantIds: string[];
          clientCompanyName: string;
        };
        token.id = user.id;
        token.role = authUser.role;
        token.tenantId = authUser.tenantId;
        token.tenantName = authUser.tenantName;
        token.tenantSlug = authUser.tenantSlug;
        token.assignedTenantIds = authUser.assignedTenantIds ?? [];
        token.clientCompanyName = authUser.clientCompanyName ?? "";
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantName = token.tenantName as string;
        session.user.tenantSlug = token.tenantSlug as string;
        session.user.assignedTenantIds = (token.assignedTenantIds as string[]) ?? [];
        session.user.clientCompanyName = (token.clientCompanyName as string) ?? "";
      }
      return session;
    },
  },
};
