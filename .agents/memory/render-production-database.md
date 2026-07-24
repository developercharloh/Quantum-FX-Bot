---
name: Render production database
description: How to reason about production schema failures when this app is hosted on Render separately from Replit.
---

The live Render service uses its own production PostgreSQL database, separate from Replit's managed development database. Replit's production database tools cannot inspect or modify that Render database.

**Why:** A login request returned a production-only database error while the same request worked locally; the Replit production database was not connected because the app's live deployment was hosted on Render.

**How to apply:** Treat repository migrations and the Render publish/redeploy process as the source of truth for live schema synchronization. Use Replit database checks only for the Replit preview database, and avoid assuming its rows or schema match Render.