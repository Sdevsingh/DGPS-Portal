import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/**
 * Returns the tenantId to filter by, or null for "all tenants" (super_admin).
 * Pass requestedTenantId to let super_admin scope to a specific tenant.
 */
export async function getEffectiveTenantId(requestedTenantId?: string | null): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { role, tenantId } = session.user;

  if (role === "super_admin") {
    return requestedTenantId ?? null; // null = see everything
  }

  return tenantId;
}

export async function requireTenantId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  return session.user.tenantId;
}
