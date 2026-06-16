import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { recordAudit } from "@/lib/logging/audit-log";
import { PERMISSION } from "@/lib/permissions/constants";
import { companyIdForWrite } from "@/lib/modules/scope";
import { prisma } from "@/lib/db/prisma";
import { notifyPlatform } from "@/lib/notifications/service";

export const runtime = "nodejs";

const EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
};

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.AUDIO_UPLOAD);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("Audio file is required", 422, "FILE_REQUIRED");
  const extension = EXTENSIONS[file.type];
  if (!extension) throw new AppError("Only MP3, WAV, and M4A audio files are supported", 422, "INVALID_AUDIO_TYPE");
  if (file.size > 10 * 1024 * 1024) throw new AppError("Audio file must be smaller than 10 MB", 413, "FILE_TOO_LARGE");
  const durationSeconds = Number(form.get("durationSeconds") ?? 0);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new AppError("Audio duration metadata is required", 422, "AUDIO_DURATION_REQUIRED");
  if (durationSeconds > 180) throw new AppError("Audio duration must not exceed 3 minutes", 422, "AUDIO_TOO_LONG");
  const companyId = companyIdForWrite(auth, String(form.get("companyId") ?? "") || undefined);

  const fileName = `${randomUUID()}.${extension}`;
  const directory = join(process.cwd(), "public", "uploads", "audio");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, fileName), Buffer.from(await file.arrayBuffer()));
  const audioUrl = `/uploads/audio/${fileName}`;
  const audioAsset = await prisma.audioAsset.create({
    data: { companyId, url: audioUrl, originalName: file.name, mimeType: file.type, sizeBytes: file.size, durationSeconds, createdById: auth.id },
  });
  await notifyPlatform({ type: "AUDIO_UPLOADED", title: "New audio uploaded", message: file.name, metadata: { audioAssetId: audioAsset.id, companyId } });
  await recordAudit({ action: "AUDIO_UPLOAD", entity: "AudioAsset", entityId: audioAsset.id, user: auth, request, metadata: { audioUrl, originalName: file.name, size: file.size, durationSeconds } });
  return apiSuccess({ audioUrl, audioAssetId: audioAsset.id, audioAsset }, "Audio uploaded for review", 201);
});
