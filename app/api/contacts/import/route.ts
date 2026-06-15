import { ContactStatus, Prisma } from "@prisma/client";
import { AppError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { requireApiPermission } from "@/lib/auth/api";
import { parseContactImport } from "@/lib/contacts/import";
import { normalizePhone } from "@/lib/contacts/phone";
import { prisma } from "@/lib/db/prisma";
import { recordAudit } from "@/lib/logging/audit-log";
import { companyIdForWrite } from "@/lib/modules/scope";
import { PERMISSION } from "@/lib/permissions/constants";

export const POST = withApiHandler(async (request) => {
  const auth = await requireApiPermission(request, PERMISSION.CONTACT_IMPORT);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("CSV or XLSX file is required", 422, "FILE_REQUIRED");
  const companyId = companyIdForWrite(auth, String(form.get("companyId") ?? "") || undefined);
  const groupId = String(form.get("groupId") ?? "") || null;
  const defaultStatusValue = String(form.get("status") ?? ContactStatus.ACTIVE).toUpperCase();
  const defaultStatus = Object.values(ContactStatus).includes(defaultStatusValue as ContactStatus) ? defaultStatusValue as ContactStatus : ContactStatus.ACTIVE;
  if (groupId && !(await prisma.contactGroup.findFirst({ where: { id: groupId, companyId, deletedAt: null } }))) throw new NotFoundError("Contact group");

  const rows = await parseContactImport(file);
  const errors: { row: number; message: string }[] = [];
  const prepared: { fullName: string; phone: string; status: ContactStatus; extraFields: Prisma.InputJsonObject }[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    try {
      if (!row.fullName?.trim()) throw new AppError("Full name is required", 422);
      if (!row.phone?.trim()) throw new AppError("Phone is required", 422);
      const phone = normalizePhone(row.phone);
      if (seen.has(phone)) throw new AppError("Duplicate phone inside import file", 409);
      seen.add(phone);
      const statusValue = row.status?.toUpperCase();
      const status = statusValue && Object.values(ContactStatus).includes(statusValue as ContactStatus) ? statusValue as ContactStatus : defaultStatus;
      const extraFields = Object.fromEntries(Object.entries(row).filter(([key]) => !["fullName", "phone", "status"].includes(key)));
      prepared.push({ fullName: row.fullName.trim(), phone, status, extraFields });
    } catch (error) {
      errors.push({ row: index + 2, message: error instanceof Error ? error.message : "Invalid row" });
    }
  });

  const existing = prepared.length ? await prisma.contact.findMany({ where: { companyId, phone: { in: prepared.map(({ phone }) => phone) }, deletedAt: null }, select: { phone: true } }) : [];
  const existingPhones = new Set(existing.map(({ phone }) => phone));
  const data = prepared.filter(({ phone }) => !existingPhones.has(phone)).map((contact) => ({ ...contact, companyId, groupId }));
  existingPhones.forEach((phone) => errors.push({ row: 0, message: `Duplicate phone skipped: ${phone}` }));
  if (data.length) await prisma.contact.createMany({ data });

  await recordAudit({ action: "CONTACT_IMPORT", entity: "Contact", user: auth, request, metadata: { fileName: file.name, created: data.length, skipped: errors.length } });
  return apiSuccess({ created: data.length, skipped: errors.length, errors }, "Contacts imported");
});
