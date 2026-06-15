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
  "contacts.read", "contacts.create", "contacts.update", "contacts.delete", "contacts.import",
  "contactGroups.read", "contactGroups.create", "contactGroups.update", "contactGroups.delete",
  "campaigns.read", "campaigns.create", "campaigns.update", "campaigns.delete", "campaigns.upload",
  "calls.read", "calls.update",
  "queue.read", "queue.update",
  "dashboard.read", "leadHistory.read",
  "auditLogs.read", "errorLogs.read", "errorLogs.update",
] as const;
