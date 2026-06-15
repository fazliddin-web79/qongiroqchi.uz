# AutoCall CRM SaaS Foundation

AutoCall CRM is a production-oriented starter foundation for a multilingual auto-calling CRM SaaS platform. It includes public, authentication, and protected dashboard layouts without implementing domain-heavy business features yet.

## Stack

- Next.js 15 App Router and React 19
- TypeScript
- Tailwind CSS with CSS-variable color tokens
- PostgreSQL and Prisma ORM
- Prepared custom JWT authentication structure
- Cookie-based English, Uzbek, and Russian i18n
- Light, dark, and system themes with `next-themes`

## Installation

```bash
npm install
cp .env.example .env
```

Update `.env` with your PostgreSQL connection and a secure auth secret:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/autocall_crm?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_ENFORCED="false"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

`AUTH_ENFORCED=false` keeps the dashboard in demo mode. Set it to `true` after implementing the real login flow.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful commands:

```bash
npm run typecheck
npm run build
npm run start
npm run db:generate
npm run db:studio
```

## Prisma And Migrations

The initial PostgreSQL schema includes `User`, `Company`, `Role`, `Permission`, `UserRole`, `AuditLog`, and `ErrorLog`. Every model includes UUID IDs and timestamp/soft-delete fields.

```bash
npm run db:generate
npm run db:migrate -- --name init
```

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
lib/db/               Prisma client
lib/i18n/             Locale configuration and server dictionary loading
lib/permissions/      Role and permission helpers
messages/             Translation dictionaries
prisma/               PostgreSQL schema
types/                Shared TypeScript types
```

## Authentication Foundation

- `auth.config.ts` defines protected routes and cookie settings.
- `lib/auth/jwt.ts` provides JWT signing and verification.
- `lib/auth/service.ts` provides session lookup and `requireAuth()`.
- `middleware.ts` prepares dashboard route protection.
- `lib/permissions` provides role and permission helpers.

The actual credential validation, password reset flow, and session persistence should be implemented next.
