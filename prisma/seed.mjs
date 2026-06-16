import { PrismaClient, RoleName } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const permissions = [
  "company.read", "company.manage", "company.suspend", "company.impersonate", "platform_user.manage",
  "campaign.create", "campaign.read", "campaign.update", "campaign.delete", "campaign.submit", "campaign.review", "campaign.start", "campaign.pause", "campaign.cancel",
  "audio.upload", "audio.read", "audio.review",
  "contact.create", "contact.import", "contact.read", "contact.update", "contact.delete", "contact.export",
  "lead.read", "lead.assign", "lead.update_status", "lead.add_note", "lead.export",
  "user.create", "user.invite", "user.update", "user.delete",
  "call.read", "call.update", "queue.read", "queue.update", "report.read",
  "billing.read", "billing.update", "invoice.manage", "support.read", "error.read", "audit.read", "settings.update", "notification.read",
];
const companyAdmin = permissions.filter((key) => !["company.manage", "company.suspend", "company.impersonate", "platform_user.manage", "campaign.review", "audio.review", "call.update", "queue.update", "billing.update", "invoice.manage", "support.read", "error.read", "audit.read"].includes(key));
const rolePermissions = {
  [RoleName.SUPER_ADMIN]: permissions,
  [RoleName.PLATFORM_ADMIN]: permissions,
  [RoleName.MODERATOR]: ["company.read", "campaign.read", "campaign.review", "audio.read", "audio.review", "notification.read", "report.read"],
  [RoleName.SUPPORT]: ["company.read", "campaign.read", "call.read", "error.read", "audit.read", "support.read", "notification.read"],
  [RoleName.BILLING_MANAGER]: ["company.read", "billing.read", "billing.update", "invoice.manage", "report.read", "notification.read"],
  [RoleName.COMPANY_OWNER]: companyAdmin,
  [RoleName.COMPANY_ADMIN]: companyAdmin,
  [RoleName.MANAGER]: companyAdmin.filter((key) => !["company.read", "user.create", "user.invite", "user.update", "user.delete", "billing.read", "settings.update"].includes(key)),
  [RoleName.OPERATOR]: ["lead.read", "lead.update_status", "lead.add_note", "call.read", "notification.read"],
  [RoleName.ANALYST]: ["campaign.read", "contact.read", "lead.read", "call.read", "report.read"],
  [RoleName.ACCOUNTANT]: ["billing.read", "report.read", "notification.read"],
};
const platformRoles = [RoleName.SUPER_ADMIN, RoleName.PLATFORM_ADMIN, RoleName.MODERATOR, RoleName.SUPPORT, RoleName.BILLING_MANAGER];
const companyRoles = [RoleName.COMPANY_OWNER, RoleName.COMPANY_ADMIN, RoleName.MANAGER, RoleName.OPERATOR, RoleName.ANALYST, RoleName.ACCOUNTANT];

async function upsertRole(name, companyId, records) {
  const allowed = records.filter(({ key }) => rolePermissions[name].includes(key));
  const existing = await prisma.role.findFirst({ where: { name, companyId } });
  return existing
    ? prisma.role.update({ where: { id: existing.id }, data: { deletedAt: null, permissions: { set: allowed.map(({ id }) => ({ id })) } } })
    : prisma.role.create({ data: { name, companyId, permissions: { connect: allowed.map(({ id }) => ({ id })) } } });
}

async function main() {
  await prisma.plan.upsert({ where: { name: "Free" }, update: { deletedAt: null }, create: { name: "Free", monthlyPrice: 0, callLimit: 1000, userLimit: 5, campaignLimit: 5, features: { telegram: true, queue: true, moderation: true } } });
  const records = await Promise.all(permissions.map((key) => prisma.permission.upsert({ where: { key }, update: { deletedAt: null }, create: { key } })));
  const platform = Object.fromEntries(await Promise.all(platformRoles.map(async (name) => [name, await upsertRole(name, null, records)])));
  const companies = await prisma.company.findMany({ where: { deletedAt: null }, select: { id: true } });
  for (const company of companies) {
    for (const name of companyRoles) await upsertRole(name, company.id, records);
  }
  const email = process.env.SUPER_ADMIN_EMAIL ?? "superadmin@autocall.local";
  const passwordHash = await hash(process.env.SUPER_ADMIN_PASSWORD ?? "ChangeMe123!", 12);
  const user = await prisma.user.upsert({ where: { email }, update: { deletedAt: null, passwordHash, companyId: null }, create: { email, name: "Super Admin", passwordHash } });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: platform[RoleName.SUPER_ADMIN].id } }, update: { deletedAt: null }, create: { userId: user.id, roleId: platform[RoleName.SUPER_ADMIN].id } });
  console.log(`Seeded platform roles, company roles, and SUPER_ADMIN: ${email}`);
}

main().finally(() => prisma.$disconnect());
