export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  OPERATOR: "OPERATOR",
} as const;

export const PERMISSIONS = [
  "users.read", "users.create", "users.update", "users.delete",
  "companies.read", "companies.create", "companies.update", "companies.delete",
  "roles.read", "roles.create", "roles.update", "roles.delete",
  "permissions.read", "permissions.create", "permissions.update", "permissions.delete",
  "leads.read", "leads.create", "leads.update", "leads.delete",
  "auditLogs.read", "errorLogs.read", "errorLogs.update",
] as const;
