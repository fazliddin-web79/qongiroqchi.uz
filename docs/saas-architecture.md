# Multi-Tenant SaaS Architecture

AutoCall CRM has two explicit security boundaries:

1. Platform management users operate the SaaS platform.
2. Customer company users operate only inside their assigned tenant.

## Role Hierarchy

Platform roles always have `companyId = null`: `SUPER_ADMIN`,
`PLATFORM_ADMIN`, `MODERATOR`, `SUPPORT`, and `BILLING_MANAGER`.

Company roles always belong to one company: `COMPANY_OWNER`, `COMPANY_ADMIN`,
`MANAGER`, `OPERATOR`, `ANALYST`, and `ACCOUNTANT`.

Tenant-aware queries must use `companyWhere`, `companyWhereForRequest`, or
`companyIdForWrite`. Platform impersonation creates a short-lived audited
`ImpersonationSession`; while active, the same scope helpers force every query
into the impersonated company.

## Moderation Workflow

Audio is stored independently as an `AudioAsset`:

`PENDING_REVIEW -> APPROVED | REJECTED`

Campaign workflow:

`DRAFT -> AUDIO_UPLOADED -> PENDING_REVIEW -> APPROVED | REJECTED | CHANGES_REQUESTED -> SCHEDULED -> RUNNING`

Only an approved campaign with an approved audio asset can create call jobs.
Every moderation decision creates a `ModerationReview`, an `AuditLog`, and a
company notification. New uploads and submissions create platform
notifications.

## Company Safety Controls

- A suspended company cannot authenticate or launch campaigns.
- Audio uploads accept MP3, WAV, and M4A, up to 10 MB and 180 seconds.
- Call launch enforces subscription and daily call limits.
- Workers enforce working hours, concurrent calls, and separate retry policies.
- Scheduled campaigns are launched by the independent queue worker.

## Extension Boundaries

- Telephony providers implement the existing telephony adapter interface.
- SMS, Telegram, and WhatsApp executors should share moderation, tenant scope,
  notifications, billing limits, and audit services.
- AI voice generation should produce `AudioAsset` records and pass through the
  same moderation workflow.
- CRM integrations and marketplace apps must use tenant-scoped credentials and
  the centralized scope helpers.
