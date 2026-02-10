# Bug Analysis: Roast Mate App

Multi-angle analysis by three specialist agents: UX, Technical Architecture, and Devil's Advocate.

## CRITICAL (5 bugs)

### 1. Division by zero when roast loss = 100%
- **File:** `src/lib/roast-engine.ts:134`
- **Issue:** No validation on `roastLossPercentage`. At 100%, `greenRequired = roasted / (1 - 1.0) = Infinity`. Breaks entire roast plan.
- **Fix:** Validate range `(0, 100)` exclusive at API layer and engine entry.

### 2. Multi-blend coffee attribution silently wrong
- **File:** `src/lib/roast-engine.ts:99-103`
- **Issue:** `coffeeNeeds` map keys on `coffeeId` alone. When a coffee appears in 2+ blends, only the last blend's `blendId` survives. Surplus credited to wrong blend.
- **Fix:** Key on `(coffeeId, blendId)` tuples instead of just `coffeeId`.

### 3. Single-origin + blend coffee surplus misrouted
- **File:** `src/lib/roast-engine.ts:95-121`
- **Issue:** Same root cause as #2. A coffee ordered both standalone and in a blend has all surplus routed to the blend bucket.
- **Fix:** Same as #2 -- restructure `coffeeNeeds` to track context.

### 4. Missing `await` on `createRoastSession`
- **File:** `src/app/api/roast-sessions/route.ts:15`
- **Issue:** `createRoastSession(date)` returns a Promise that isn't awaited. API returns `{}` to client.
- **Fix:** Add `await`.

### 5. No auth + GET-triggered mutation on Shopify import
- **File:** `src/app/api/orders/import/shopify/route.ts:31`
- **Issue:** `export { POST as GET }` lets crawlers, link previews, and health checks trigger data-mutating syncs including order deletion.
- **Fix:** Remove `export { POST as GET }`.

## HIGH (12 bugs)

### 6. Shopify pagination missing
- **File:** `src/lib/shopify.ts:121-126`
- **Issue:** Hard limit of 250 orders. Orders beyond 250 silently dropped; next sync deletes them from DB.

### 7. Blend percentages not validated to sum to 100%
- **Files:** `src/lib/repos/products.ts`, `src/app/api/settings/blends/route.ts`
- **Issue:** A blend at 70% total under-roasts; at 120% over-roasts. No validation at any layer.

### 8. PDF has no page overflow handling
- **File:** `src/lib/pdf.ts:32-67`
- **Issue:** After ~44 rows, content renders off-page. No new pages created. Reports silently truncated.

### 9. Archived coffee silently breaks variant mappings
- **Files:** `src/lib/db/schema.ts:43-51`, `src/lib/roast-engine.ts:132`
- **Issue:** Archiving a coffee doesn't cascade to variant mappings. Engine skips the coffee but bagging still lists it.

### 10. SyncButton silently swallows errors
- **File:** `src/app/components/SyncButton.tsx:9-16`
- **Issue:** No error state or message. Sync fails -> spinner stops -> user thinks it succeeded.

### 11. All API errors silently ignored client-side
- **Files:** `src/app/components/RoastPlanner.tsx`, `src/app/components/SettingsManager.tsx`
- **Issue:** Every `fetch` checks `if (res.ok)` with no `else`. Failed operations invisible to user.

### 12. Race condition in session creation
- **File:** `src/lib/roast-sessions.ts:21-25`
- **Issue:** TOCTOU in `getOrCreateActiveSession`. Concurrent requests both INSERT `session_current` -> PK violation.

### 13. No confirmation on destructive actions
- **File:** `src/app/components/SettingsManager.tsx`
- **Issue:** Delete/archive execute instantly with no confirmation dialog.

### 14. Dual Shopify import controls can race
- **Files:** `src/app/components/SyncButton.tsx`, `src/app/components/RoastPlanner.tsx`
- **Issue:** Two independent import mechanisms (server action vs client API) can run simultaneously.

### 15. Session date always overwritten to today
- **File:** `src/lib/roast-sessions.ts:46-47`
- **Issue:** `getSessionWithComputation` replaces every session's date with today. Historical sessions display wrong date.

### 16. All sessions share global orders
- **File:** `src/lib/roast-sessions.ts:49-54`
- **Issue:** No `session_id` on orders table. Toggling order status in one session affects all. Multi-session is architecturally broken.

### 17. No runtime validation on order status
- **File:** `src/app/api/roast-sessions/[id]/route.ts:21-23`
- **Issue:** Any string accepted for `body.status`. Non-"skipped" values silently include the order.

## MEDIUM (14 bugs)

### 18. Texture grain overlay z-index 9999
- **File:** `src/app/globals.css:20-29`
- **Issue:** Fixed overlay with `z-index: 9999`. `pointer-events: none` not supported on some mobile browsers.

### 19. Order toggle has no loading/disabled state
- **File:** `src/app/components/RoastPlanner.tsx:307-330`
- **Issue:** Rapid clicks create concurrent API requests and race conditions.

### 20. No empty states for orders, roast schedule, bagging
- **File:** `src/app/components/RoastPlanner.tsx`
- **Issue:** Empty sections show blank tables with no guidance text.

### 21. "No roast plan" page has no action button
- **File:** `src/app/page.tsx:16-34`
- **Issue:** Tells user to "reload" but provides no button or mechanism.

### 22. Floating-point drift in kg/g conversion
- **File:** `src/app/components/RoastPlanner.tsx:383-388`
- **Issue:** `0.1 * 1000 = 100.00000000000001`. UI shows ugly decimals after round-trip.

### 23. Negative on-hand stock accepted via API
- **File:** `src/app/api/roast-sessions/[id]/route.ts:25`
- **Issue:** HTML `min=0` only constrains stepper; API has no validation. Negative values inflate requirements.

### 24. `ensureSchema` race on cold start
- **File:** `src/lib/db/ensure-schema.ts:6-13`
- **Issue:** Multiple concurrent requests execute DDL simultaneously.

### 25. Fake `db` object when DATABASE_URL missing
- **File:** `src/lib/db.ts:39`
- **Issue:** `{} as Drizzle` causes cryptic runtime errors instead of clear "DB not configured" message.

### 26. `variant_title` used as `grindType`
- **File:** `src/lib/shopify.ts:171`
- **Issue:** Shopify variant title may contain size/roast info, not just grind type.

### 27. Unmapped items appear in bagging but not roast schedule
- **Files:** `src/lib/roast-engine.ts:77-88`, `src/lib/roast-engine.ts:131-132`
- **Issue:** Bagging report lists items the roast schedule doesn't include. Mismatch on production floor.

### 28. `bucketKey` colon-split fails for IDs containing colons
- **File:** `src/lib/roast-engine.ts:176`
- **Issue:** `key.split(":")` produces >2 elements for IDs with colons. Bucket ID truncated.

### 29. New coffees missing from on-hand stock UI
- **File:** `src/app/components/RoastPlanner.tsx:32-49`
- **Issue:** Coffees added after session creation don't appear in on-hand editor.

### 30. Accessibility violations
- **File:** `src/app/components/RoastPlanner.tsx`, `src/app/components/SettingsManager.tsx`
- **Issue:** No labels on on-hand inputs, no ARIA on toggle buttons, icon-only buttons without accessible names.

## LOW (7 bugs)

### 31. `costPerKg` of 0 stored as NULL
- **File:** `src/lib/repos/products.ts:94,111` -- Falsy check treats 0 as null.

### 32. Whitespace-only names pass form validation
- **File:** `src/app/components/SettingsManager.tsx:67-68`

### 33. `toIsoString` converts null to string "null"
- **File:** `src/lib/repos/utils.ts:5-6`

### 34. Stale data after settings changes
- **File:** `src/app/components/SettingsManager.tsx:28` -- No cache revalidation on navigation.

### 35. Duplicate unmapped variants alert rendered twice
- **Files:** `src/app/page.tsx:43-76`, `src/app/components/RoastPlanner.tsx:176`

### 36. Size displayed as "0.25 kg" instead of "250g"
- **File:** `src/app/components/SettingsManager.tsx:275` -- Industry convention mismatch.

### 37. `SectionCard` missing `"use client"` directive
- **File:** `src/app/components/SectionCard.tsx:1` -- Works only because parents are client components.

## Recommended Fix Priority

1. **Roast engine data structure** (#2, #3) -- Core calculation is silently wrong
2. **Roast loss validation** (#1) -- Trivial to trigger, breaks everything
3. **Missing await** (#4) -- One-character fix
4. **Remove GET export on import** (#5) -- Crawlers delete data
5. **Client-side error handling** (#10, #11) -- Users can't tell when things fail
