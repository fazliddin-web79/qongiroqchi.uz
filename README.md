# AutoCall CRM SaaS Foundation

AutoCall CRM is a production-oriented starter foundation for a multilingual auto-calling CRM SaaS platform. It includes public, authentication, and protected dashboard layouts without implementing domain-heavy business features yet.

## Stack

- Next.js 15 App Router and React 19
- TypeScript
- Tailwind CSS with CSS-variable color tokens
- PostgreSQL and Prisma ORM
- Redis and BullMQ background call queue
- Prepared custom JWT authentication structure
- Cookie-based English, Uzbek, and Russian i18n
- Light, dark, and system themes with `next-themes`

## Installation

```bash
npm install
cp .env.example .env
```

Update `.env` with your PostgreSQL connection and secure auth secrets:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/autocall_crm?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"
REFRESH_TOKEN_SECRET="replace-with-another-long-random-secret"
AUTH_ENFORCED="true"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
CALL_QUEUE_CONCURRENCY="5"
TELEPHONY_ADAPTER="mock"
SUPER_ADMIN_EMAIL="superadmin@autocall.local"
SUPER_ADMIN_PASSWORD="ChangeMe123!"
```

`AUTH_ENFORCED=false` keeps the dashboard in demo mode. Use `true` when testing
the JWT-backed login flow.

## Development

Start Redis and the call worker in separate terminals:

```bash
docker compose up -d redis
npm run queue:worker
```

Then run the web application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful commands:

```bash
npm run typecheck
npm run build
npm run start
npm run queue:worker
npm run db:generate
npm run db:deploy
npm run db:seed
npm run db:studio
```

## Prisma And Migrations

The PostgreSQL schema includes the auth/RBAC foundation plus `Contact`,
`ContactGroup`, `Campaign`, `Call`, `Lead`, and `LeadHistory` modules.
It also includes company settings, billing plans, and subscription limits.

```bash
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
```

Use `npm run db:deploy` to apply committed migrations outside development.

## Internationalization

Translation dictionaries live in:

- `messages/uz.json`
- `messages/en.json`
- `messages/ru.json`

Uzbek is the default. The language switcher stores the selected locale in the `autocall-locale` cookie and refreshes server-rendered content. Client components access translations through `useTranslations()`.

## Theme System

Light and dark color tokens are defined as HSL CSS variables in `app/globals.css` and mapped into Tailwind in `tailwind.config.ts`. `next-themes` controls light, dark, and system modes.

## Architecture

```text
app/                  App Router pages and route-group layouts
components/layout/    Public, auth, and dashboard layout components
components/pages/     Page-level reusable views
components/providers/ Theme and i18n providers
components/ui/        Reusable design-system primitives
config/               Application-level configuration
hooks/                Shared React hooks
lib/auth/             JWT and auth service foundation
lib/api/              Shared API response, error, and pagination helpers
lib/db/               Prisma client
lib/i18n/             Locale configuration and server dictionary loading
lib/logging/          Audit and backend error persistence
lib/permissions/      Role and permission helpers
lib/queue/            BullMQ queue configuration and operations
lib/telephony/        Replaceable telephony adapter and mock provider
lib/billing/          Subscription usage and limit enforcement
lib/settings/         Company calling policy helpers
lib/telegram/         New-lead Telegram notifications
messages/             Translation dictionaries
prisma/               PostgreSQL schema, migrations, and seed
types/                Shared TypeScript types
workers/              Independently deployed BullMQ workers
```

## Backend And Authentication

- `auth.config.ts` defines protected routes and cookie settings.
- `lib/auth` provides password hashing, JWT signing, refresh rotation, and API
  authentication.
- `app/api` contains Auth, Users, Companies, Roles, Permissions, Leads,
  Contacts, Campaigns, Calls, Dashboard statistics, AuditLogs, and ErrorLogs
  endpoints.
- `lib/api/handler.ts` normalizes API errors and records them in `ErrorLog`.
- `lib/permissions` enforces global SUPER_ADMIN, company-scoped ADMIN, and
  assigned-lead-only OPERATOR access.
- `middleware.ts` protects dashboard pages when `AUTH_ENFORCED=true`.

## Auto-Call Queue

Starting a campaign creates idempotent `Call` records and adds one BullMQ job
per pending call. Run `npm run queue:worker` as a separate process. The worker
uses the mock telephony adapter, updates call statuses, creates IVR leads, and
honors campaign retries, pause, and resume.

The adapter contract lives in `lib/telephony/types.ts`. Implement that interface
and update `lib/telephony/index.ts` to add Asterisk or a SIP provider without
changing queue or campaign code.

## Settings And Billing

Company settings control Telegram lead notifications, default retries, working
hours, call speed, locale, and timezone. Telegram tokens are stored in the
database; use application-level encryption or a secrets manager before
production deployment.

Every company receives the `Free` plan by default. Active subscription call,
user, and campaign limits are checked before starting campaigns or creating
records. SUPER_ADMIN can manage plans and assign subscriptions from the Billing
page.

See [`docs/backend-api.md`](docs/backend-api.md) for the endpoint list, auth flow,
role scope, and curl-based test instructions.
