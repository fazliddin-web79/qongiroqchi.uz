import type { AuthUser } from "@/types/auth";

export function hasPermission(user: AuthUser, permission: string) {
  return user.permissions.includes("*") || user.permissions.includes(permission);
}

export function hasRole(user: AuthUser, role: string) {
  return user.roles.includes(role);
}

export function canAccess(user: AuthUser, permissions: string[]) {
  return permissions.every((permission) => hasPermission(user, permission));
}
