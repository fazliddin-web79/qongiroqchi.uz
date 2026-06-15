import { PrismaClient, RoleName } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const permissions = [
  "users.read", "users.create", "users.update", "users.delete", "companies.read", "companies.create", "companies.update", "companies.delete",
  "roles.read", "roles.create", "roles.update", "roles.delete", "permissions.read", "permissions.create", "permissions.update", "permissions.delete",
  "leads.read", "leads.create", "leads.update", "leads.delete", "auditLogs.read", "errorLogs.read", "errorLogs.update",
  "contacts.read", "contacts.create", "contacts.update", "contacts.delete", "contacts.import",
  "contactGroups.read", "contactGroups.create", "contactGroups.update", "contactGroups.delete",
  "campaigns.read", "campaigns.create", "campaigns.update", "campaigns.delete", "campaigns.upload",
  "calls.read", "calls.update", "queue.read", "queue.update", "settings.read", "settings.update", "billing.read", "billing.update", "dashboard.read", "leadHistory.read",
];

async function main() {
  await prisma.plan.upsert({ where: { name: "Free" }, update: { deletedAt: null }, create: { name: "Free", monthlyPrice: 0, callLimit: 1000, userLimit: 5, campaignLimit: 5, features: { telegram: true, queue: true } } });
  const records = await Promise.all(permissions.map((key) => prisma.permission.upsert({ where: { key }, update: { deletedAt: null }, create: { key } })));
  let role = await prisma.role.findFirst({ where: { name: RoleName.SUPER_ADMIN, companyId: null } });
  role = role
    ? await prisma.role.update({ where: { id: role.id }, data: { deletedAt: null, permissions: { set: records.map(({ id }) => ({ id })) } } })
    : await prisma.role.create({ data: { name: RoleName.SUPER_ADMIN, permissions: { connect: records.map(({ id }) => ({ id })) } } });
  const email = process.env.SUPER_ADMIN_EMAIL ?? "superadmin@autocall.local";
  const passwordHash = await hash(process.env.SUPER_ADMIN_PASSWORD ?? "ChangeMe123!", 12);
  const user = await prisma.user.upsert({ where: { email }, update: { deletedAt: null, passwordHash }, create: { email, name: "Super Admin", passwordHash } });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: { deletedAt: null }, create: { userId: user.id, roleId: role.id } });
  console.log(`Seeded SUPER_ADMIN: ${email}`);
}

main().finally(() => prisma.$disconnect());
