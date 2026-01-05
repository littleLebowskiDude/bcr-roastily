import { RoastPlanner } from "./components/RoastPlanner";
import { SyncButton } from "./components/SyncButton";
import { getRoastPlan } from "@/lib/roast-sessions";
import { fetchSettingsSnapshot, seedIfEmpty } from "@/lib/repository";
import { collectUnmappedOrderItems } from "@/lib/unmapped";

export const revalidate = 0;

export default async function Home() {
  await seedIfEmpty();
  const [session, settings] = await Promise.all([
    getRoastPlan(),
    fetchSettingsSnapshot(),
  ]);

  if (!session) {
    return (
      <main className="texture-grain min-h-screen bg-linen-100 px-6 py-12">
        <div className="mx-auto max-w-6xl animate-fade-in rounded-2xl bg-white p-8 shadow-warm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-espresso-100">
              <svg className="h-6 w-6 text-espresso-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="font-display text-xl tracking-wide text-espresso-900">NO ROAST PLAN AVAILABLE</p>
              <p className="text-sm text-espresso-600">Reload to sync unfulfilled Shopify orders.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const unmappedItems = collectUnmappedOrderItems(session.orders);
  const unmappedVariantCount = new Set(unmappedItems.map((item) => item.variantId)).size;

  return (
    <main className="texture-grain min-h-screen bg-linen-100 px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Warning Banner for Unmapped Variants */}
        {unmappedItems.length ? (
          <div className="animate-slide-up rounded-2xl border-2 border-roast-300 bg-gradient-to-r from-roast-50 to-roast-100 px-5 py-4 shadow-warm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-roast-200">
                  <svg className="h-5 w-5 text-roast-700" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-roast-900">Missing mappings detected</p>
                  <p className="text-sm text-roast-700">
                    {unmappedItems.length} item{unmappedItems.length === 1 ? "" : "s"} across{" "}
                    {unmappedVariantCount} variant{unmappedVariantCount === 1 ? "" : "s"} need mapping.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="#unmapped-variants"
                  className="rounded-lg border border-roast-300 bg-white px-4 py-2 text-sm font-semibold text-roast-800 shadow-sm transition-warm hover:border-roast-400 hover:bg-roast-50"
                >
                  View list
                </a>
                <a
                  href="/settings"
                  className="rounded-lg bg-roast-600 px-4 py-2 text-sm font-semibold text-white shadow-warm transition-warm hover:bg-roast-500"
                >
                  Map variants
                </a>
              </div>
            </div>
          </div>
        ) : null}

        {/* Hero Header */}
        <header className="animate-fade-in overflow-hidden rounded-2xl bg-espresso-950 shadow-warm-lg">
          {/* Decorative top bar */}
          <div className="h-1.5 bg-gradient-to-r from-sienna-500 via-sienna-400 to-sienna-600" />

          <div className="relative px-6 py-8 md:px-8 md:py-10">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sienna-500/20">
                    <svg className="h-6 w-6 text-sienna-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-sienna-400">
                    Beechworth Coffee Roasters
                  </span>
                </div>
                <h1 className="font-display text-4xl tracking-wide text-white md:text-5xl">
                  ROAST MATE
                </h1>
                <p className="mt-3 text-base leading-relaxed text-espresso-300">
                  Import unfulfilled Shopify orders, convert variants to roast demand,
                  enforce full 5 kg drops, and generate production reports.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <SyncButton />
                  <a
                    href="/settings"
                    className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-warm hover:bg-white/20"
                  >
                    Settings
                  </a>
                </div>

                <div className="rounded-xl bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sienna-400">
                    Batch size
                  </p>
                  <p className="font-display text-3xl tracking-wide text-white">5 KG GREEN</p>
                  <p className="mt-1 text-xs text-espresso-400">No partial batches</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <RoastPlanner session={session} settings={settings} />
      </div>
    </main>
  );
}
