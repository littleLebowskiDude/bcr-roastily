# Bug Analysis: Roast Mate App

Multi-angle analysis by three specialist agents: UX, Technical Architecture, and Devil's Advocate.

## CRITICAL (5 bugs) -- ALL FIXED

### ~~1. Division by zero when roast loss = 100%~~ FIXED
- **File:** `src/lib/roast-engine.ts:139`
- **Issue:** No validation on `roastLossPercentage`. At 100%, `greenRequired = roasted / (1 - 1.0) = Infinity`. Breaks entire roast plan.
- **Fix applied:** Clamped to `[0, 99]` in engine + range validation in coffee create/update API routes.

### ~~2. Multi-blend coffee attribution silently wrong~~ FIXED
- **File:** `src/lib/roast-engine.ts:101-107`
- **Issue:** `coffeeNeeds` map keyed on `coffeeId` alone. When a coffee appears in 2+ blends, only the last blend's `blendId` survived. Surplus credited to wrong blend.
- **Fix applied:** `coffeeNeeds` now keys on `coffeeId:blendId` tuples. Each coffee-in-context gets a separate entry.

### ~~3. Single-origin + blend coffee surplus misrouted~~ FIXED
- **File:** `src/lib/roast-engine.ts:121-126`
- **Issue:** Same root cause as #2. A coffee ordered both standalone and in a blend had all surplus routed to the blend bucket.
- **Fix applied:** Single-origin entries now key on `coffeeId:direct`, keeping them separate from blend entries.

### ~~4. Missing `await` on `createRoastSession`~~ FIXED
- **File:** `src/app/api/roast-sessions/route.ts:15`
- **Issue:** `createRoastSession(date)` returned a Promise that wasn't awaited. API returned `{}` to client.
- **Fix applied:** Added `await`.

### ~~5. No auth + GET-triggered mutation on Shopify import~~ FIXED
- **File:** `src/app/api/orders/import/shopify/route.ts:31`
- **Issue:** `export { POST as GET }` let crawlers, link previews, and health checks trigger data-mutating syncs including order deletion.
- **Fix applied:** Removed `export { POST as GET }`.

---

## HIGH (12 bugs) -- TODO

### 6. Shopify pagination missing
- **File:** `src/lib/shopify.ts:121-126`
- **Issue:** Hard limit of 250 orders. Orders beyond 250 silently dropped; next sync deletes them from DB.
- **Suggested fix:** Implement cursor-based pagination using the `Link` response header. Loop until no more pages.

### 7. Blend percentages not validated to sum to 100%
- **Files:** `src/lib/repos/products.ts`, `src/app/api/settings/blends/route.ts`, `src/app/api/settings/blends/[id]/route.ts`
- **Issue:** A blend at 70% total under-roasts; at 120% over-roasts. No validation at any layer.
- **Suggested fix:** Validate `components.reduce((sum, c) => sum + c.percentage, 0) === 100` in blend create/update API routes.

### 8. PDF has no page overflow handling
- **File:** `src/lib/pdf.ts:32-67`
- **Issue:** After ~44 rows, content renders off-page. No new pages created. Reports silently truncated.
- **Suggested fix:** Track `y` position and call `pdfDoc.addPage()` when it drops below a threshold (~50pt from bottom).

### 9. Archived coffee silently breaks variant mappings
- **Files:** `src/lib/db/schema.ts:43-51`, `src/lib/roast-engine.ts:132`
- **Issue:** Archiving a coffee doesn't cascade to variant mappings. Engine skips the coffee but bagging still lists it.
- **Suggested fix:** On archive, either deactivate related variant mappings or warn the user. Consider adding FK constraints.

### 10. SyncButton silently swallows errors
- **File:** `src/app/components/SyncButton.tsx:9-16`
- **Issue:** No error state or message. Sync fails -> spinner stops -> user thinks it succeeded.
- **Suggested fix:** Add error state, display error message to user on failure.

### 11. All API errors silently ignored client-side
- **Files:** `src/app/components/RoastPlanner.tsx`, `src/app/components/SettingsManager.tsx`
- **Issue:** Every `fetch` checks `if (res.ok)` with no `else`. Failed operations invisible to user.
- **Suggested fix:** Add `else` branches that set error state and display toast/banner notifications.

### 12. Race condition in session creation
- **File:** `src/lib/roast-sessions.ts:21-25`
- **Issue:** TOCTOU in `getOrCreateActiveSession`. Concurrent requests both INSERT `session_current` -> PK violation.
- **Suggested fix:** Use `INSERT ... ON CONFLICT DO NOTHING` (upsert) or a mutex/lock pattern.

### 13. No confirmation on destructive actions
- **File:** `src/app/components/SettingsManager.tsx`
- **Issue:** Delete/archive execute instantly with no confirmation dialog.
- **Suggested fix:** Add `window.confirm()` or a modal before delete/archive operations.

### 14. Dual Shopify import controls can race
- **Files:** `src/app/components/SyncButton.tsx`, `src/app/components/RoastPlanner.tsx`
- **Issue:** Two independent import mechanisms (server action vs client API) can run simultaneously.
- **Suggested fix:** Consolidate into one mechanism, or add a shared loading/lock state.

### 15. Session date always overwritten to today
- **File:** `src/lib/roast-sessions.ts:46-47`
- **Issue:** `getSessionWithComputation` replaces every session's date with today. Historical sessions display wrong date.
- **Suggested fix:** Only set today's date when creating a new session, not when fetching existing ones.

### 16. All sessions share global orders
- **File:** `src/lib/roast-sessions.ts:49-54`
- **Issue:** No `session_id` on orders table. Toggling order status in one session affects all. Multi-session is architecturally broken.
- **Suggested fix:** Add a `session_orders` join table or `session_id` FK on orders. This is a larger refactor.

### 17. No runtime validation on order status
- **File:** `src/app/api/roast-sessions/[id]/route.ts:21-23`
- **Issue:** Any string accepted for `body.status`. Non-"skipped" values silently include the order.
- **Suggested fix:** Validate `body.status` is one of `"included" | "skipped"` before proceeding.

---

## MEDIUM (13 bugs) -- TODO

> Note: Bug #28 (bucketKey colon-split) was fixed alongside the critical bugs.

### 18. Texture grain overlay z-index 9999
- **File:** `src/app/globals.css:20-29`
- **Issue:** Fixed overlay with `z-index: 9999`. `pointer-events: none` not supported on some mobile browsers.
- **Suggested fix:** Lower z-index or remove the overlay on mobile via media query.

### 19. Order toggle has no loading/disabled state
- **File:** `src/app/components/RoastPlanner.tsx:307-330`
- **Issue:** Rapid clicks create concurrent API requests and race conditions.
- **Suggested fix:** Add a loading state that disables the toggle button during the API call.

### 20. No empty states for orders, roast schedule, bagging
- **File:** `src/app/components/RoastPlanner.tsx`
- **Issue:** Empty sections show blank tables with no guidance text.
- **Suggested fix:** Add "No orders yet" / "No items to roast" placeholder messages.

### 21. "No roast plan" page has no action button
- **File:** `src/app/page.tsx:16-34`
- **Issue:** Tells user to "reload" but provides no button or mechanism.
- **Suggested fix:** Add a "Sync Orders" or "Create Session" button.

### 22. Floating-point drift in kg/g conversion
- **File:** `src/app/components/RoastPlanner.tsx:383-388`
- **Issue:** `0.1 * 1000 = 100.00000000000001`. UI shows ugly decimals after round-trip.
- **Suggested fix:** Round to nearest integer gram using `Math.round()`.

### 23. Negative on-hand stock accepted via API
- **File:** `src/app/api/roast-sessions/[id]/route.ts:25`
- **Issue:** HTML `min=0` only constrains stepper; API has no validation. Negative values inflate requirements.
- **Suggested fix:** Validate `onHandRoastedG >= 0` server-side before saving.

### 24. `ensureSchema` race on cold start
- **File:** `src/lib/db/ensure-schema.ts:6-13`
- **Issue:** Multiple concurrent requests execute DDL simultaneously.
- **Suggested fix:** Use a promise-based mutex: `let initPromise: Promise | null = null`.

### 25. Fake `db` object when DATABASE_URL missing
- **File:** `src/lib/db.ts:39`
- **Issue:** `{} as Drizzle` causes cryptic runtime errors instead of clear "DB not configured" message.
- **Suggested fix:** Throw a descriptive error or use a proxy that throws on access.

### 26. `variant_title` used as `grindType`
- **File:** `src/lib/shopify.ts:171`
- **Issue:** Shopify variant title may contain size/roast info, not just grind type.
- **Suggested fix:** Parse specific option values from Shopify variant options instead of using the combined title.

### 27. Unmapped items appear in bagging but not roast schedule
- **Files:** `src/lib/roast-engine.ts:77-88`, `src/lib/roast-engine.ts:131-132`
- **Issue:** Bagging report lists items the roast schedule doesn't include. Mismatch on production floor.
- **Suggested fix:** Skip unmapped items in bagging, or add them to roast schedule with a warning flag.

### 29. New coffees missing from on-hand stock UI
- **File:** `src/app/components/RoastPlanner.tsx:32-49`
- **Issue:** Coffees added after session creation don't appear in on-hand editor.
- **Suggested fix:** Merge current coffees/blends list with existing on-hand entries when rendering.

### 30. Accessibility violations
- **Files:** `src/app/components/RoastPlanner.tsx`, `src/app/components/SettingsManager.tsx`
- **Issue:** No labels on on-hand inputs, no ARIA on toggle buttons, icon-only buttons without accessible names.
- **Suggested fix:** Add `aria-label` attributes and associate `<label>` elements with inputs.

---

## LOW (7 bugs) -- TODO

### 31. `costPerKg` of 0 stored as NULL
- **File:** `src/lib/repos/products.ts:94,111`
- **Issue:** Falsy check `input.costPerKg ? ... : null` treats 0 as null.
- **Suggested fix:** Use `input.costPerKg != null ? String(input.costPerKg) : null`.

### 32. Whitespace-only names pass form validation
- **File:** `src/app/components/SettingsManager.tsx:67-68`
- **Suggested fix:** Trim and check `.length > 0` before submitting.

### 33. `toIsoString` converts null to string "null"
- **File:** `src/lib/repos/utils.ts:5-6`
- **Suggested fix:** Add a null/undefined guard returning empty string or null.

### 34. Stale data after settings changes
- **File:** `src/app/components/SettingsManager.tsx:28`
- **Issue:** No cache revalidation on navigation back to dashboard.
- **Suggested fix:** Call `router.refresh()` or use `revalidatePath` in server actions.

### 35. Duplicate unmapped variants alert rendered twice
- **Files:** `src/app/page.tsx:43-76`, `src/app/components/RoastPlanner.tsx:176`
- **Suggested fix:** Remove one of the two instances.

### 36. Size displayed as "0.25 kg" instead of "250g"
- **File:** `src/app/components/SettingsManager.tsx:275`
- **Issue:** Industry convention is grams for sub-kg quantities.
- **Suggested fix:** Display as grams when < 1000g, kg otherwise.

### 37. `SectionCard` missing `"use client"` directive
- **File:** `src/app/components/SectionCard.tsx:1`
- **Issue:** Works only because parents are client components. Will break if used from a server component.
- **Suggested fix:** Add `"use client"` at the top of the file.

---

## Summary

| Severity | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 5     | 5     | 0         |
| High     | 12    | 0     | 12        |
| Medium   | 14    | 1     | 13        |
| Low      | 7     | 0     | 7         |
| **Total**| **38**| **6** | **32**    |

### Recommended next fix priority
1. **Client-side error handling** (#10, #11) -- Users can't tell when things fail
2. **Shopify pagination** (#6) -- High-volume shops lose orders
3. **Blend percentage validation** (#7) -- Data entry errors silently corrupt roast plan
4. **PDF page overflow** (#8) -- Reports truncated without warning
5. **Session creation race condition** (#12) -- 500 errors on concurrent requests
