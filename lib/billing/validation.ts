import { SubscriptionStatus } from "@prisma/client";
import { z } from "zod";

export const planSchema = z.object({
  name: z.string().trim().min(2).max(100),
  monthlyPrice: z.number().min(0).max(1_000_000_000),
  callLimit: z.number().int().min(0).max(100_000_000),
  userLimit: z.number().int().min(0).max(1_000_000),
  campaignLimit: z.number().int().min(0).max(1_000_000),
  features: z.record(z.string(), z.unknown()).default({}),
});

export const subscriptionSchema = z.object({
  companyId: z.uuid(),
  planId: z.uuid(),
  status: z.nativeEnum(SubscriptionStatus).default(SubscriptionStatus.ACTIVE),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
}).refine((input) => new Date(input.endsAt) > new Date(input.startsAt), { message: "endsAt must be after startsAt" });
