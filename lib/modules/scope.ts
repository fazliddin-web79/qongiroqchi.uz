import type { AuthUser } from "@/types/auth";
import { ForbiddenError } from "@/lib/api/errors";
import { isSuperAdmin } from "@/lib/permissions";

export function companyIdForWrite(user: AuthUser, requestedCompanyId?: string | null) {
  const companyId = isSuperAdmin(user) ? requestedCompanyId : user.companyId;
  if (!companyId) throw new ForbiddenError("A company is required");
  return companyId;
}

export function companyWhereForRequest(user: AuthUser, requestedCompanyId?: string | null) {
  if (isSuperAdmin(user)) return requestedCompanyId ? { companyId: requestedCompanyId } : {};
  if (!user.companyId) throw new ForbiddenError("User is not assigned to a company");
  return { companyId: user.companyId };
}
