import { Prisma } from "@prisma/client";
import type { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { apiError } from "./response";
import { recordError } from "@/lib/logging/error-log";

type ApiHandler<TContext> = (request: NextRequest, context: TContext) => Promise<NextResponse>;
type DefaultContext = { params: Promise<Record<string, never>> };

export function withApiHandler<TContext = DefaultContext>(handler: ApiHandler<TContext>) {
  return async (request: NextRequest, context: TContext) => {
    try {
      return await handler(request, context);
    } catch (error) {
      const appError = normalizeError(error);
      await recordError(error, request, appError.statusCode);
      return apiError(appError.message, { code: appError.code, details: appError.details ?? null }, appError.statusCode);
    }
  };
}

function normalizeError(error: unknown) {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError) return new AppError("Validation failed", 422, "VALIDATION_ERROR", error.flatten());
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return new AppError("A record with this value already exists", 409, "DUPLICATE_RECORD", error.meta);
    if (error.code === "P2025") return new AppError("Record not found", 404, "NOT_FOUND");
  }
  return new AppError("Internal server error");
}
