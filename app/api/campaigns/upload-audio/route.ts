import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AppError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireAnyApiPermission } from "@/lib/auth/api";
import { recordAudit } from "@/lib/logging/audit-log";
import { PERMISSION } from "@/lib/permissions/constants";

export const runtime = "nodejs";

const EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
};

export const POST = withApiHandler(async (request) => {
  const auth = await requireAnyApiPermission(request, [PERMISSION.CAMPAIGN_CREATE, PERMISSION.CAMPAIGN_UPDATE]);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("Audio file is required", 422, "FILE_REQUIRED");
  const extension = EXTENSIONS[file.type];
  if (!extension) throw new AppError("Only MP3, WAV, OGG, and M4A audio files are supported", 422, "INVALID_AUDIO_TYPE");
  if (file.size > 25 * 1024 * 1024) throw new AppError("Audio file must be smaller than 25 MB", 413, "FILE_TOO_LARGE");

  const fileName = `${randomUUID()}.${extension}`;
  const directory = join(process.cwd(), "public", "uploads", "audio");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, fileName), Buffer.from(await file.arrayBuffer()));
  const audioUrl = `/uploads/audio/${fileName}`;
  await recordAudit({ action: "CAMPAIGN_AUDIO_UPLOAD", entity: "Campaign", user: auth, request, metadata: { audioUrl, originalName: file.name, size: file.size } });
  return apiSuccess({ audioUrl }, "Audio uploaded", 201);
});
