WITH permission_keys("key") AS (
  VALUES
    ('campaign.create'), ('campaign.read'), ('campaign.update'), ('campaign.delete'), ('campaign.start'), ('campaign.pause'),
    ('contact.create'), ('contact.import'), ('contact.read'), ('contact.update'), ('contact.delete'), ('contact.export'),
    ('lead.read'), ('lead.assign'), ('lead.update_status'), ('lead.add_note'), ('lead.export'),
    ('user.create'), ('user.invite'), ('user.update'), ('user.delete'),
    ('billing.read'), ('billing.update'), ('error.read'), ('audit.read'), ('settings.update')
)
INSERT INTO "Permission" ("id", "key", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "key", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM permission_keys
ON CONFLICT ("key") DO UPDATE
SET "deletedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" AS permission
CROSS JOIN "Role" AS role
WHERE permission."deletedAt" IS NULL
  AND role."deletedAt" IS NULL
  AND (
    (
      role."name" IN ('SUPER_ADMIN', 'ADMIN')
      AND permission."key" IN (
        'campaign.create', 'campaign.read', 'campaign.update', 'campaign.delete', 'campaign.start', 'campaign.pause',
        'contact.create', 'contact.import', 'contact.read', 'contact.update', 'contact.delete', 'contact.export',
        'lead.read', 'lead.assign', 'lead.update_status', 'lead.add_note', 'lead.export',
        'user.create', 'user.invite', 'user.update', 'user.delete',
        'billing.read', 'billing.update', 'error.read', 'audit.read', 'settings.update'
      )
    )
    OR (
      role."name" = 'OPERATOR'
      AND permission."key" IN ('lead.read', 'lead.update_status', 'lead.add_note')
    )
  )
ON CONFLICT ("A", "B") DO NOTHING;
