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
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.toLowerCase();
      if (!email) return false;

      // ── 1. Check for an existing active user ─────────────────────────────
      const { data: existingUsers } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      const existing = existingUsers?.[0] ?? null;

      if (existing) {
        // Google sign-in is ONLY permitted for client accounts.
        // Super admins, operations managers, and technicians must use
        // email + password — their accounts are provisioned by a super admin.
        if (existing.role !== "client") {
          return "/login?error=google-staff-blocked";
        }

        // Existing client — refresh Google metadata
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (user as any)._dbUser = existing;
        return true;
      }

      // ── 2. New Google user — look up tenant via submitted jobs ────────────
      //
      // When a client submits a job via the public form, their email is stored
      // as agent_email on the job record. We use that to discover which tenant
      // they belong to and auto-provision their account.
      const { data: jobMatches } = await supabaseAdmin
        .from("jobs")
        .select("tenant_id")
        .eq("agent_email", email)
        .order("created_at", { ascending: false });

      // If this email appears in multiple tenants we can't safely auto-provision
      const uniqueTenants = [...new Set((jobMatches ?? []).map((j) => j.tenant_id))];
      if (uniqueTenants.length > 1) {
        console.warn(`[Auth] Google sign-in blocked: ${email} matches ${uniqueTenants.length} tenants`);
        return "/login?error=google-new-user";
      }

      const tenantId = uniqueTenants[0] ?? null;

      if (!tenantId) {
        // Completely unknown email — no jobs found, no existing account.
        return "/login?error=google-new-user";
      }

      // ── 3. Auto-create a client account under the discovered tenant ───────
      const { data: newUser, error: createErr } = await supabaseAdmin
        .from("users")
        .insert({
          email,
          name: user.name ?? (profile as Record<string, string>)?.name ?? email.split("@")[0],
          role: "client",
          tenant_id: tenantId,
          google_id: account.providerAccountId ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          avatar_url: (profile as any)?.picture ?? null,
          is_active: true,
        })
        .select("*")
        .single();

      if (createErr || !newUser) {
        console.error("[Auth] Google auto-create failed:", createErr?.message);
        return "/login?error=CredentialsSignin";
      }

      console.log(`[Auth] Auto-provisioned Google client: ${email} → tenant ${tenantId}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (user as any)._dbUser = newUser;
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
          token.clientCompanyName = dbUser.client_company_name ?? "";
        }
      } else if (user) {
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
