import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { findRow, findRows } from "./sheets";

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

        let users = await findRows(
          "Users",
          (r) => r.email?.toLowerCase() === email && r.isActive === "true"
        );
        if (users.length === 0) return null;

        if (tenantSlug) {
          const tenantBySlug = await findRow(
            "Tenants",
            (r) => r.slug?.toLowerCase() === tenantSlug
          );
          if (!tenantBySlug) return null;
          users = users.filter((u) => u.tenantId === tenantBySlug.id);
          if (users.length === 0) return null;
        }

        // Handle duplicate emails across tenants by testing password against each account.
        const matchingUsers: Record<string, string>[] = [];
        for (const candidate of users) {
          const isMatch = await bcrypt.compare(credentials.password, candidate.passwordHash);
          if (isMatch) matchingUsers.push(candidate);
        }

        if (matchingUsers.length !== 1) return null;
        const user = matchingUsers[0];

        // Look up tenant name
        const tenant = await findRow("Tenants", (r) => r.id === user.tenantId);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: tenant?.name ?? "",
          tenantSlug: tenant?.slug ?? "",
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
        };
        token.id = user.id;
        token.role = authUser.role;
        token.tenantId = authUser.tenantId;
        token.tenantName = authUser.tenantName;
        token.tenantSlug = authUser.tenantSlug;
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
      }
      return session;
    },
  },
};
