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
| POST | `/api/auth/register` | Public; creates a company and its first ADMIN |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/refresh` | Valid refresh token |
| POST | `/api/auth/logout` | Public; revokes supplied/cookie refresh token |
| GET | `/api/auth/me` | Authenticated |
| GET, POST | `/api/users` | SUPER_ADMIN, ADMIN |
| GET, PATCH, DELETE | `/api/users/:id` | SUPER_ADMIN, ADMIN |
| GET, POST | `/api/companies` | SUPER_ADMIN |
| GET, PATCH | `/api/companies/:id` | SUPER_ADMIN, ADMIN |
| DELETE | `/api/companies/:id` | SUPER_ADMIN |
| GET, POST | `/api/roles` | SUPER_ADMIN, ADMIN |
| GET, PATCH, DELETE | `/api/roles/:id` | SUPER_ADMIN, ADMIN |
| GET, POST | `/api/permissions` | SUPER_ADMIN |
| GET, PATCH, DELETE | `/api/permissions/:id` | SUPER_ADMIN |
| GET | `/api/audit-logs` | SUPER_ADMIN, ADMIN |
| GET | `/api/error-logs` | SUPER_ADMIN, ADMIN |
| PATCH | `/api/error-logs/:id` | SUPER_ADMIN, ADMIN |
| GET | `/api/leads` | SUPER_ADMIN, ADMIN, OPERATOR |
| POST | `/api/leads` | SUPER_ADMIN, ADMIN |
| GET, PATCH | `/api/leads/:id` | SUPER_ADMIN, ADMIN, assigned OPERATOR |
| GET | `/api/leads/:id/history` | SUPER_ADMIN, ADMIN, assigned OPERATOR |
| DELETE | `/api/leads/:id` | SUPER_ADMIN, ADMIN |
| GET, POST | `/api/contact-groups` | SUPER_ADMIN, ADMIN |
| GET, PATCH, DELETE | `/api/contact-groups/:id` | SUPER_ADMIN, ADMIN |
| GET, POST | `/api/contacts` | SUPER_ADMIN, ADMIN |
| GET, PATCH, DELETE | `/api/contacts/:id` | SUPER_ADMIN, ADMIN |
| POST | `/api/contacts/import` | SUPER_ADMIN, ADMIN; CSV/XLSX up to 2,000 rows |
| GET, POST | `/api/campaigns` | SUPER_ADMIN, ADMIN |
| GET, PATCH, DELETE | `/api/campaigns/:id` | SUPER_ADMIN, ADMIN |
| POST | `/api/campaigns/upload-audio` | SUPER_ADMIN, ADMIN; MP3/WAV/OGG/M4A up to 25 MB |
| POST | `/api/campaigns/:id/start` | SUPER_ADMIN, ADMIN; creates contact-based call queue |
| GET | `/api/calls` | SUPER_ADMIN, ADMIN |
| GET, PATCH | `/api/calls/:id` | SUPER_ADMIN, ADMIN; records call result and can create lead |
| GET | `/api/dashboard/stats` | SUPER_ADMIN, ADMIN, OPERATOR |

List endpoints that return paginated data accept `?page=1&limit=20`.
Contact and campaign lists also accept `search`, `status`, and group filters.
SUPER_ADMIN can pass `companyId` to scope lists and create records.

## Role Scope

- `SUPER_ADMIN` has global access.
- `ADMIN` queries are always scoped to the authenticated user's `companyId`.
- `OPERATOR` can only read assigned leads and can only update their status.
- Important create, update, delete, and auth actions are written to `AuditLog`.
- Route handler errors are normalized and written to `ErrorLog`.
- Contact phone numbers are normalized to E.164 and checked for active duplicates
  inside each company.
- Campaign audio currently uses the local `public/uploads/audio` adapter. Replace
  it with object storage before horizontally scaling the application.
- Starting a campaign creates one idempotent `Call` record for every active
  contact in its selected group.
- A pressed IVR key or `createLead: true` call result creates a lead and assigns
  it to the least-busy company operator.
- Operators only receive their assigned leads and may update status, note, and
  callback time. Every lead change is persisted in `LeadHistory`.

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

Create `.env`, start PostgreSQL, and initialize the database:

```bash
cp .env.example .env
npm install
npm run db:deploy
npm run db:seed
npm run dev
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

Create a separate company ADMIN account:

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
