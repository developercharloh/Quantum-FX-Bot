---
name: Migration pattern
description: How to write Drizzle migrations in this project — drizzle-kit generate has a __dirname bug so all migrations are written manually.
---

## Rule
Never run `pnpm --filter @workspace/db run generate`. It fails with a `__dirname` ESM bug. Always:
1. Write the SQL file manually in `lib/db/migrations/<idx>_<name>.sql`
2. Add a journal entry to `lib/db/migrations/meta/_journal.json` with timestamp strictly greater than the last entry.
3. Run `pnpm --filter @workspace/db run push` for local dev.
4. The API server runs `runMigrations()` at startup — this applies migrations on Render automatically.

## Timestamp history
- 0001: 1750190000000
- 0002: 1782260000000
- 0003: 1782320000000
- 0004: 1782380000000

**Next migration must use timestamp > 1782380000000.**

## Why
drizzle-kit uses `__dirname` in a way that breaks under ESM/Node 24 in this monorepo setup. The push command works fine for local; the startup migration runner covers production.
