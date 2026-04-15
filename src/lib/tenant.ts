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

/**
 * Returns tenant IDs an ops manager can access.
 * Super admin gets null (all tenants).
 */
export async function getAccessibleTenantIds(): Promise<string[] | null> {
  const session = await getServerSession(authOptions);
  if (!session) return [];
  const { role, tenantId, assignedTenantIds } = session.user;
  if (role === "super_admin") return null; // null = all
  if (role === "operations_manager") {
    // Own tenant + assigned tenants
    const ids = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    return Array.from(ids);
  }
  return [tenantId];
}
