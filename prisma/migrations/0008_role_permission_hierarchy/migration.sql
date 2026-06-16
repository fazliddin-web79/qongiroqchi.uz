WITH permission_keys("key") AS (
  VALUES
    ('company.read'), ('company.manage'), ('company.suspend'), ('company.impersonate'), ('platform_user.manage'),
    ('campaign.create'), ('campaign.read'), ('campaign.update'), ('campaign.delete'), ('campaign.submit'), ('campaign.review'), ('campaign.start'), ('campaign.pause'), ('campaign.cancel'),
    ('audio.upload'), ('audio.read'), ('audio.review'),
    ('contact.create'), ('contact.import'), ('contact.read'), ('contact.update'), ('contact.delete'), ('contact.export'),
    ('lead.read'), ('lead.assign'), ('lead.update_status'), ('lead.add_note'), ('lead.export'),
    ('user.create'), ('user.invite'), ('user.update'), ('user.delete'),
    ('call.read'), ('call.update'), ('queue.read'), ('queue.update'), ('report.read'),
    ('billing.read'), ('billing.update'), ('invoice.manage'), ('support.read'), ('error.read'), ('audit.read'), ('settings.update'), ('notification.read')
)
INSERT INTO "Permission" ("id", "key", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "key", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM permission_keys
ON CONFLICT ("key") DO UPDATE SET "deletedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Role" ("id", "name", "companyId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), role_name::"RoleName", NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM unnest(ARRAY['PLATFORM_ADMIN', 'MODERATOR', 'SUPPORT', 'BILLING_MANAGER']) AS roles(role_name)
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = role_name::"RoleName" AND "companyId" IS NULL);

INSERT INTO "Role" ("id", "name", "companyId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), role_name::"RoleName", company."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Company" AS company
CROSS JOIN unnest(ARRAY['COMPANY_OWNER', 'COMPANY_ADMIN', 'MANAGER', 'OPERATOR', 'ANALYST', 'ACCOUNTANT']) AS roles(role_name)
WHERE company."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Role"
    WHERE "name" = role_name::"RoleName" AND "companyId" = company."id"
  );

DELETE FROM "_PermissionToRole"
WHERE "B" IN (SELECT "id" FROM "Role" WHERE "deletedAt" IS NULL);

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" AS permission
CROSS JOIN "Role" AS role
WHERE permission."deletedAt" IS NULL
  AND role."deletedAt" IS NULL
  AND (
    role."name" IN ('SUPER_ADMIN', 'PLATFORM_ADMIN')
    OR (role."name" = 'MODERATOR' AND permission."key" IN ('company.read', 'campaign.read', 'campaign.review', 'audio.read', 'audio.review', 'notification.read', 'report.read'))
    OR (role."name" = 'SUPPORT' AND permission."key" IN ('company.read', 'campaign.read', 'call.read', 'error.read', 'audit.read', 'support.read', 'notification.read'))
    OR (role."name" = 'BILLING_MANAGER' AND permission."key" IN ('company.read', 'billing.read', 'billing.update', 'invoice.manage', 'report.read', 'notification.read'))
    OR (role."name" IN ('COMPANY_OWNER', 'COMPANY_ADMIN') AND permission."key" IN (
      'company.read', 'campaign.create', 'campaign.read', 'campaign.update', 'campaign.delete', 'campaign.submit', 'campaign.start', 'campaign.pause', 'campaign.cancel',
      'audio.upload', 'audio.read', 'contact.create', 'contact.import', 'contact.read', 'contact.update', 'contact.delete', 'contact.export',
      'lead.read', 'lead.assign', 'lead.update_status', 'lead.add_note', 'lead.export', 'user.create', 'user.invite', 'user.update', 'user.delete',
      'call.read', 'queue.read', 'report.read', 'billing.read', 'settings.update', 'notification.read'
    ))
    OR (role."name" = 'MANAGER' AND permission."key" IN (
      'campaign.create', 'campaign.read', 'campaign.update', 'campaign.delete', 'campaign.submit', 'campaign.start', 'campaign.pause', 'campaign.cancel',
      'audio.upload', 'audio.read', 'contact.create', 'contact.import', 'contact.read', 'contact.update', 'contact.delete', 'contact.export',
      'lead.read', 'lead.assign', 'lead.update_status', 'lead.add_note', 'lead.export', 'call.read', 'queue.read', 'report.read', 'notification.read'
    ))
    OR (role."name" = 'OPERATOR' AND permission."key" IN ('lead.read', 'lead.update_status', 'lead.add_note', 'call.read', 'notification.read'))
    OR (role."name" = 'ANALYST' AND permission."key" IN ('campaign.read', 'contact.read', 'lead.read', 'call.read', 'report.read'))
    OR (role."name" = 'ACCOUNTANT' AND permission."key" IN ('billing.read', 'report.read', 'notification.read'))
  )
ON CONFLICT ("A", "B") DO NOTHING;
