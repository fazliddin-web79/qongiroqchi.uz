import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { UnauthorizedError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createTokenPair, setAuthCookies } from "@/lib/auth/tokens";
import { recordAudit } from "@/lib/logging/audit-log";

const schema = z.object({ email: z.email().transform((value) => value.toLowerCase()), password: z.string().min(1) });

export const POST = withApiHandler(async (request) => {
  const input = schema.parse(await request.json());
  const user = await prisma.user.findFirst({ where: { email: input.email, deletedAt: null } });
  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) throw new UnauthorizedError("Invalid email or password");
  const pair = await createTokenPair(user.id);
  await recordAudit({ action: "AUTH_LOGIN", entity: "User", entityId: user.id, user: pair.user, request });
  return setAuthCookies(apiSuccess({ user: pair.user, accessToken: pair.accessToken }, "Login successful"), pair);
});
