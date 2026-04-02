import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "./supabase-server";
import { getOpsManagerTenantIds } from "./db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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

        // Find active users matching the email
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

        // Find the user whose password matches
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
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        // Look for an existing user with this Google email
        const { data: existing } = await supabaseAdmin
          .from("users")
          .select("*")
          .eq("email", email)
          .eq("is_active", true)
          .limit(1)
          .single();

        if (!existing) {
          // Auto-create or reject — here we reject unknown Google users
          return "/login?error=no-account";
        }

        // Update google_id and avatar_url if not set
        const updates: Record<string, string> = {};
        if (!existing.google_id && account.providerAccountId) {
          updates.google_id = account.providerAccountId;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!existing.avatar_url && (profile as any)?.picture) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          updates.avatar_url = (profile as any).picture;
        }
        if (Object.keys(updates).length > 0) {
          await supabaseAdmin.from("users").update(updates).eq("id", existing.id);
        }

        // Inject extra fields into the user object for the jwt callback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (user as any)._dbUser = existing;
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbUser = (user as any)._dbUser;
        if (dbUser) {
          const { data: tenant } = await supabaseAdmin
            .from("tenants")
            .select("id, name, slug")
            .eq("id", dbUser.tenant_id)
            .single();

          let assignedTenantIds: string[] = [];
          if (dbUser.role === "operations_manager") {
            assignedTenantIds = await getOpsManagerTenantIds(dbUser.id);
          }

          token.id = dbUser.id;
          token.role = dbUser.role;
          token.tenantId = dbUser.tenant_id;
          token.tenantName = tenant?.name ?? "";
          token.tenantSlug = tenant?.slug ?? "";
          token.assignedTenantIds = assignedTenantIds;
        }
      } else if (user) {
        // Credentials login
        const authUser = user as {
          id: string;
          role: string;
          tenantId: string;
          tenantName: string;
          tenantSlug: string;
          assignedTenantIds: string[];
        };
        token.id = user.id;
        token.role = authUser.role;
        token.tenantId = authUser.tenantId;
        token.tenantName = authUser.tenantName;
        token.tenantSlug = authUser.tenantSlug;
        token.assignedTenantIds = authUser.assignedTenantIds ?? [];
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
      }
      return session;
    },
  },
};
