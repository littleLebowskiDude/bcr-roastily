# Roast Mate — Beechworth Coffee Roasters

Mobile-friendly roast-planning system that pulls unfulfilled Shopify orders, converts variants into coffee/blend demand, enforces full 5 kg drops, tracks on-hand roasted stock, and outputs roasting + bagging reports.

## Stack
- Next.js 14 (App Router, React server components)
- TypeScript
- PostgreSQL-ready data model (in-memory store in this scaffold)
- PDF generation via `pdf-lib`
- Tailwind CSS

## Environment variables
Copy `.env.example` to `.env.local`:
```
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_xxxxxx
SHOPIFY_API_VERSION=2024-07
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

Shopify calls stay server-side. The Postgres URL is used for the `/api/db` health check and future persistence.

## Key features implemented
- Roast sessions (auto-created, full 5 kg drops, surplus -> on-hand).
- Order skipping per session.
- Variant-to-coffee/blend mapping (sample data seeded).
- Blend recipes with drop-based blending.
- Roast engine: on-hand deduction, roast loss, drops, surplus handling.
- On-hand editor for single origins and blends.
- Bagging report (per SKU/size/grind) and pick-list data.
- Roasting and bagging PDF endpoints.
- Settings endpoint exposing coffees, blends, and mappings.

## Core API routes
- `GET /api/orders/import/shopify` — pull unfulfilled Shopify orders.
- `GET /api/roast-sessions` — list sessions with totals.
- `POST /api/roast-sessions` — create a new session.
- `GET/POST /api/roast-sessions/{id}` — fetch/update on-hand + skip orders.
- `POST /api/roast-sessions/{id}/calculate` — recompute roast plan.
- `GET /api/reports/roasting/{id}` — roasting PDF.
- `GET /api/reports/bagging/{id}` — bagging PDF.
- `GET /api/settings` — coffees, blends, mappings, batch size.
- `GET /api/db` — Postgres connectivity check.

## Running locally
```bash
npm install
npm run dev
# open http://localhost:3000
```

## Notes
- The scaffold uses an in-memory store with sample coffees, blends, orders, and on-hand stock. Swap the store with Postgres-backed repositories to persist sessions.
- Batch size is fixed at 5 kg green (no partial batches), defined in `src/lib/constants.ts`.
