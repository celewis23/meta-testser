# Meta Permission Test Lab

Meta Permission Test Lab is an internal Next.js admin app for securely testing Meta Graph API permissions, discovering related asset IDs, running App Review-ready test suites, and exporting structured evidence.

## Architecture summary

- `app/`: App Router pages for dashboard, environments, assets, permissions, tests, runs, review-pack, and export routes.
- `components/`: Reusable admin UI primitives and layout components in a shadcn-style structure.
- `lib/meta/`: Meta Graph client, built-in test catalog, dependency resolver, discovery flows, diagnostics, and runner orchestration.
- `lib/db/`: Prisma client, context helpers, dashboard/run queries, and audit logging.
- `lib/security/`: Internal auth cookie handling, encryption helpers, and env default loading.
- `prisma/`: Schema, migration, and seed catalog for built-in tests and starter packs.

## Database schema summary

- `Environment`: Secure environment-level settings and encrypted tokens.
- `AssetValue`: Manual and discovered IDs scoped to an environment.
- `TestDefinition`: Database-driven test registry with permissions, dependencies, and success rules.
- `TestRun`: Suite-level execution record.
- `TestRunItem`: Per-test execution details including response metadata and diagnostics.
- `FavoritePack`: Saved reusable test sets.
- `AuditLog`: Change trail for internal configuration actions.

## Built-in tests included

- `get_user_permissions`
- `get_pages_via_me_accounts`
- `get_page_details`
- `get_page_instagram_business_account`
- `get_ig_user_basic_profile`
- `get_ig_media_list`
- `get_page_conversations_instagram`
- `get_business_owned_pages`
- `get_business_instagram_accounts`
- `get_comment_details`

These cover starter flows for:

- `pages_show_list`
- `pages_read_engagement`
- `instagram_basic`
- `instagram_manage_comments`
- `instagram_manage_messages`
- `business_management`
- discovery prerequisites

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `ADMIN_PASSWORD`, `APP_ENCRYPTION_KEY`, and `ADMIN_SESSION_SECRET`.
3. Keep `DATABASE_PROVIDER="sqlite"` for local development and use `DATABASE_URL="file:./dev.db"`.
4. Install dependencies with `npm install`.
5. Generate the Prisma client with `npm run db:generate`.
6. Apply the migration with `npm run db:migrate`.
7. Seed starter data with `npm run db:seed`.
8. Start the app with `npm run dev`.

## Vercel deployment

1. Provision a Prisma-compatible Postgres database such as Neon, Supabase, or Vercel Postgres.
2. In Vercel, set:
   - `DATABASE_PROVIDER=postgresql`
   - `DATABASE_URL=<your pooled or direct Postgres url>`
   - `ADMIN_PASSWORD`
   - `APP_ENCRYPTION_KEY`
   - `ADMIN_SESSION_SECRET`
   - optional Meta defaults for first-time bootstrap
3. Run `npm run db:deploy` during or before deployment to apply Prisma migrations.
4. Deploy the Next.js app normally to Vercel.

## Vercel caveats

- SQLite is only for local development; do not use it in Vercel production.
- Server-side Meta calls depend on the deployment having outbound network access to `graph.facebook.com`.
- Tokens and app secrets are encrypted before database storage, but rotate encryption/session secrets carefully because changing them invalidates decryption/session state.

## First-time flow

1. Create an environment.
2. Paste user, page, or system user token values.
3. Optionally paste Business, Page, and Instagram IDs.
4. Run asset discovery.
5. Review permission readiness.
6. Run the recommended pack from the tests page.
7. Inspect pass/fail diagnostics in Runs.
8. Export the App Review Pack.
