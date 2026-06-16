# Backend API

The backend uses Next.js App Router route handlers under `/app/api`, PostgreSQL,
Prisma ORM, JWT access tokens, rotating refresh tokens, and role-based data
scoping.

## Response Format

Every endpoint returns the same envelope:

```json
{
  "success": true,
  "data": {},
  "message": "Success",
  "error": null
}
```

Errors return `success: false`, `data: null`, an HTTP status code, and an error
object containing a stable `code`.

## Endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/health` | Public database health check |
| POST | `/api/auth/register` | Public; creates a company and its first COMPANY_OWNER |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/refresh` | Valid refresh token |
| POST | `/api/auth/logout` | Public; revokes supplied/cookie refresh token |
| GET | `/api/auth/me` | Authenticated |
| GET, POST | `/api/users` | Permission-based platform/company access |
| GET, PATCH, DELETE | `/api/users/:id` | Permission-based platform/company access |
| GET, POST | `/api/companies` | Platform management |
| GET, PATCH | `/api/companies/:id` | Tenant or platform management |
| DELETE | `/api/companies/:id` | SUPER_ADMIN |
| PATCH | `/api/companies/:id/status` | `company.suspend` |
| POST | `/api/companies/:id/impersonate` | `company.impersonate` |
| POST | `/api/auth/impersonation/stop` | Authenticated platform user |
| GET, POST | `/api/roles` | Platform admins and company owners/admins |
| GET, PATCH, DELETE | `/api/roles/:id` | Platform admins and company owners/admins |
| GET, POST | `/api/permissions` | SUPER_ADMIN |
| GET, PATCH, DELETE | `/api/permissions/:id` | SUPER_ADMIN |

### Action permissions

Protected module endpoints use action-level permissions:

- Campaign: `campaign.create`, `campaign.read`, `campaign.update`, `campaign.delete`, `campaign.submit`, `campaign.review`, `campaign.start`, `campaign.pause`, `campaign.cancel`
- Contact: `contact.create`, `contact.import`, `contact.read`, `contact.update`, `contact.delete`, `contact.export`
- Lead: `lead.read`, `lead.assign`, `lead.update_status`, `lead.add_note`, `lead.export`
- User: `user.create`, `user.invite`, `user.update`, `user.delete`
- Platform: `billing.read`, `billing.update`, `error.read`, `audit.read`, `settings.update`
- Moderation: `audio.upload`, `audio.read`, `audio.review`
- Platform control: `company.read`, `company.manage`, `company.suspend`, `company.impersonate`, `platform_user.manage`

Platform and company roles receive separate permission matrices. Company users
are always tenant-scoped. Platform users are global unless an audited
impersonation session forces them into a company scope.
| GET | `/api/audit-logs` | `audit.read` |
| GET | `/api/error-logs` | `error.read` |
| PATCH | `/api/error-logs/:id` | `error.read` |
| GET | `/api/leads` | `lead.read`; operators are assigned-lead scoped |
| POST | `/api/leads` | `lead.assign` |
| GET, PATCH | `/api/leads/:id` | Lead action permissions |
| GET | `/api/leads/:id/history` | `lead.read` |
| DELETE | `/api/leads/:id` | Company owners/admins or platform |
| GET, POST | `/api/contact-groups` | Contact action permissions |
| GET, PATCH, DELETE | `/api/contact-groups/:id` | Contact action permissions |
| GET, POST | `/api/contacts` | Contact action permissions |
| GET, PATCH, DELETE | `/api/contacts/:id` | Contact action permissions |
| POST | `/api/contacts/import` | `contact.import`; CSV/XLSX up to 2,000 rows |
| GET, POST | `/api/campaigns` | Campaign action permissions |
| GET, PATCH, DELETE | `/api/campaigns/:id` | Campaign action permissions |
| GET | `/api/audio-assets` | `audio.read` |
| POST | `/api/campaigns/upload-audio` | `audio.upload`; MP3/WAV/M4A up to 10 MB and 3 minutes |
| POST | `/api/audio-assets/:id/review` | `audio.review` |
| POST | `/api/campaigns/:id/submit` | `campaign.submit` |
| POST | `/api/campaigns/:id/review` | `campaign.review` |
| POST | `/api/campaigns/:id/start` | `campaign.start`; approved campaigns only |
| POST | `/api/campaigns/:id/cancel` | `campaign.cancel` |
| POST | `/api/campaigns/:id/pause` | `campaign.pause` |
| POST | `/api/campaigns/:id/resume` | `campaign.pause` |
| GET | `/api/calls` | `call.read` |
| GET, PATCH | `/api/calls/:id` | `call.read` / `call.update` |
| GET | `/api/queue/stats` | `queue.read`; BullMQ counts, workers, and recent jobs |
| POST | `/api/queue/jobs/:id/retry` | `queue.update`; retries a failed call job |
| GET | `/api/dashboard/stats` | `report.read`; company-scoped |
| GET | `/api/dashboard/platform` | Platform report access |
| GET | `/api/notifications` | `notification.read` |
| PATCH | `/api/notifications/:id/read` | `notification.read` |
| GET, PATCH | `/api/settings` | `settings.update`; company-scoped settings |
| POST | `/api/settings/telegram/test` | `settings.update` |
| GET, POST | `/api/billing/plans` | `billing.read` / `billing.update` |
| PATCH, DELETE | `/api/billing/plans/:id` | `billing.update` |
| GET, POST | `/api/billing/subscriptions` | `billing.read` / `billing.update` |
| PATCH | `/api/billing/subscriptions/:id` | `billing.update` |

List endpoints that return paginated data accept `?page=1&limit=20`.
Contact and campaign lists also accept `search`, `status`, and group filters.
SUPER_ADMIN can pass `companyId` to scope lists and create records.

## Role Scope

- Platform roles have global access according to their permissions.
- Company role queries are always scoped to the authenticated user's `companyId`.
- `OPERATOR` can only read assigned leads and can only update their status.
- Suspended companies cannot authenticate or launch campaigns.
- Campaigns cannot launch before campaign and audio moderation approval.
- Important create, update, delete, and auth actions are written to `AuditLog`.
- Route handler errors are normalized and written to `ErrorLog`.
- Contact phone numbers are normalized to E.164 and checked for active duplicates
  inside each company.
- Campaign audio currently uses the local `public/uploads/audio` adapter. Replace
  it with object storage before horizontally scaling the application.
- Starting a campaign creates one idempotent `Call` record for every active
  contact in its selected group and places each pending call into BullMQ.
- The independent call worker uses the replaceable telephony adapter, updates
  call results, applies campaign retry settings, and delays jobs while a
  campaign is paused.
- A pressed IVR key or `createLead: true` call result creates a lead and assigns
  it to the least-busy company operator.
- Operators only receive their assigned leads and may update status, note, and
  callback time. Every lead change is persisted in `LeadHistory`.
- New leads send a best-effort Telegram group notification when the company bot
  token and chat id are configured.
- Active subscription limits block campaign starts that exceed call allowance
  and block creation beyond user and campaign limits.

## Authentication Flow

1. Register or login returns a 15-minute access token and sets HTTP-only access
   and refresh cookies. Cookies are also marked secure in production.
2. Protected API requests can use the access cookie or
   `Authorization: Bearer <access-token>`.
3. `/api/auth/refresh` validates the 30-day refresh token, revokes it, persists
   a new hashed refresh token, and returns a new access token.
4. `/api/auth/logout` revokes the refresh token and clears both cookies.
5. Passwords are hashed with bcrypt. Raw refresh tokens are never stored.

## Local Test

Create `.env`, start PostgreSQL and Redis, then initialize the database:

```bash
cp .env.example .env
npm install
npm run db:deploy
npm run db:seed
npm run dev
```

Run the queue worker in another terminal:

```bash
docker compose up -d redis
npm run queue:worker
```

Verify database connectivity:

```bash
curl http://localhost:3000/api/health
```

Login as the seeded SUPER_ADMIN and keep cookies:

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@autocall.local","password":"ChangeMe123!"}'
```

Use the authenticated cookie:

```bash
curl -b cookies.txt http://localhost:3000/api/auth/me
curl -b cookies.txt http://localhost:3000/api/companies
curl -b cookies.txt "http://localhost:3000/api/audit-logs?page=1&limit=20"
```

Create a separate company owner account:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"ChangeMe123!","companyName":"Example Company","companySlug":"example-company"}'
```

Import contacts:

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/contacts/import \
  -F "file=@contacts.csv" \
  -F "groupId=<contact-group-uuid>"
```

Change the seeded password and both JWT secrets before deploying.
