import { PrismaClient, RoleName } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const permissions = [
  "campaign.create", "campaign.read", "campaign.update", "campaign.delete", "campaign.start", "campaign.pause",
  "contact.create", "contact.import", "contact.read", "contact.update", "contact.delete", "contact.export",
  "lead.read", "lead.assign", "lead.update_status", "lead.add_note", "lead.export",
  "user.create", "user.invite", "user.update", "user.delete",
  "billing.read", "billing.update", "error.read", "audit.read", "settings.update",
];
const operatorPermissions = new Set(["lead.read", "lead.update_status", "lead.add_note"]);

async function main() {
  await prisma.plan.upsert({ where: { name: "Free" }, update: { deletedAt: null }, create: { name: "Free", monthlyPrice: 0, callLimit: 1000, userLimit: 5, campaignLimit: 5, features: { telegram: true, queue: true } } });
  const records = await Promise.all(permissions.map((key) => prisma.permission.upsert({ where: { key }, update: { deletedAt: null }, create: { key } })));
  let role = await prisma.role.findFirst({ where: { name: RoleName.SUPER_ADMIN, companyId: null } });
  role = role
    ? await prisma.role.update({ where: { id: role.id }, data: { deletedAt: null, permissions: { set: records.map(({ id }) => ({ id })) } } })
    : await prisma.role.create({ data: { name: RoleName.SUPER_ADMIN, permissions: { connect: records.map(({ id }) => ({ id })) } } });
  const roles = await prisma.role.findMany({ where: { deletedAt: null } });
  for (const currentRole of roles) {
    const allowed = currentRole.name === RoleName.OPERATOR ? records.filter(({ key }) => operatorPermissions.has(key)) : records;
    await prisma.role.update({ where: { id: currentRole.id }, data: { permissions: { set: allowed.map(({ id }) => ({ id })) } } });
  }
  const email = process.env.SUPER_ADMIN_EMAIL ?? "superadmin@autocall.local";
  const passwordHash = await hash(process.env.SUPER_ADMIN_PASSWORD ?? "ChangeMe123!", 12);
  const user = await prisma.user.upsert({ where: { email }, update: { deletedAt: null, passwordHash }, create: { email, name: "Super Admin", passwordHash } });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: { deletedAt: null }, create: { userId: user.id, roleId: role.id } });
  console.log(`Seeded SUPER_ADMIN: ${email}`);
}

main().finally(() => prisma.$disconnect());
