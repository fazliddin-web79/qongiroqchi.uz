import type { AuthUser } from "@/types/auth";
import { ForbiddenError } from "@/lib/api/errors";
import { ROLES } from "./constants";

export function hasPermission(user: AuthUser, permission: string) {
  return user.permissions.includes("*") || user.permissions.includes(permission);
}

export function hasRole(user: AuthUser, role: string) {
  return user.roles.includes(role);
}

export function canAccess(user: AuthUser, permissions: string[]) {
  return permissions.every((permission) => hasPermission(user, permission));
}

export function isSuperAdmin(user: AuthUser) {
  return hasRole(user, ROLES.SUPER_ADMIN);
}

export function isAdmin(user: AuthUser) {
  return hasRole(user, ROLES.ADMIN);
}

export function isOperator(user: AuthUser) {
  return hasRole(user, ROLES.OPERATOR);
}

export function assertRole(user: AuthUser, allowedRoles: string[]) {
  if (!allowedRoles.some((role) => hasRole(user, role))) throw new ForbiddenError();
}

export function assertPermission(user: AuthUser, permission: string) {
  if (!hasPermission(user, permission)) throw new ForbiddenError();
}

export function companyWhere(user: AuthUser) {
  if (isSuperAdmin(user)) return {};
  if (!user.companyId) throw new ForbiddenError("User is not assigned to a company");
  return { companyId: user.companyId };
}

export function leadWhere(user: AuthUser) {
  const scope = companyWhere(user);
  return isOperator(user) ? { ...scope, assignedToId: user.id } : scope;
}
