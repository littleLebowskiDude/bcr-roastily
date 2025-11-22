# Shopify Open Orders

A minimal Next.js app that connects to the Shopify Admin API and lists open, unfulfilled orders. Intended as a starting point for roast-planning tooling (e.g., "how many drops of green beans to roast today").

## Prerequisites
- Shopify store domain (e.g., `your-store.myshopify.com`)
- Shopify Admin API access token with read access to Orders
- Node 18+

## Environment variables
Create a `.env.local` file based on `.env.example`:

```
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_xxxxxx
# Optional: override default API version (2024-07)
SHOPIFY_API_VERSION=2024-07
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

The Shopify call happens server-side (API route + server component), so the admin token never reaches the browser.

## Run locally
```bash
npm install
npm run dev
# open http://localhost:3000
```

## API route
`/api/orders` returns the same unfulfilled order payload shown in the UI. It uses the Admin REST endpoint with `status=open` and `fulfillment_status=unfulfilled`.

`/api/db` pings Postgres using `DATABASE_URL` to confirm connectivity.

## Deploy
Deploy to Vercel (or any Node-capable host) and set the same environment variables in the hosting dashboard. No additional build steps beyond `npm run build` are required.
