import { RoleName } from "@prisma/client";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ConflictError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { ensurePermissions } from "@/lib/auth/roles";
import { createTokenPair, setAuthCookies } from "@/lib/auth/tokens";
import { recordAudit } from "@/lib/logging/audit-log";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  companyName: z.string().min(2).max(160),
  companySlug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/).optional(),
});

export const POST = withApiHandler(async (request) => {
  const input = schema.parse(await request.json());
  const slug = input.companySlug ?? input.companyName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const [emailExists, slugExists] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email } }),
    prisma.company.findUnique({ where: { slug } }),
  ]);
  if (emailExists) throw new ConflictError("Email is already registered");
  if (slugExists) throw new ConflictError("Company slug is already in use");
  const permissions = await ensurePermissions();
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({ data: { name: input.companyName, slug } });
    const role = await tx.role.create({ data: { name: RoleName.ADMIN, companyId: company.id, permissions: { connect: permissions.map(({ id }) => ({ id })) } } });
    return tx.user.create({ data: { name: input.name, email: input.email, passwordHash, companyId: company.id, roles: { create: { roleId: role.id } } } });
  });
  const pair = await createTokenPair(user.id);
  await recordAudit({ action: "AUTH_REGISTER", entity: "User", entityId: user.id, user: pair.user, request });
  return setAuthCookies(apiSuccess({ user: pair.user, accessToken: pair.accessToken }, "Registration successful", 201), pair);
});
