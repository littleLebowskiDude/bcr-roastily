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
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 px-6 py-12 text-slate-900">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-semibold text-slate-900">No roast plan available.</p>
          <p className="text-sm text-slate-600">Reload to sync unfulfilled Shopify orders.</p>
        </div>
      </main>
    );
  }

  const unmappedItems = collectUnmappedOrderItems(session.orders);
  const unmappedVariantCount = new Set(unmappedItems.map((item) => item.variantId)).size;

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        {unmappedItems.length ? (
          <div className="flex flex-col gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-900">Missing mappings detected</p>
                <p className="text-xs text-amber-800">
                  {unmappedItems.length} item{unmappedItems.length === 1 ? "" : "s"} across{" "}
                  {unmappedVariantCount} variant{unmappedVariantCount === 1 ? "" : "s"} need a coffee
                  or blend mapping before the roast plan is complete.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="#unmapped-variants"
                  className="rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm transition hover:border-amber-400"
                >
                  View unmapped list
                </a>
                <a
                  href="/settings"
                  className="rounded-full bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-500"
                >
                  Map variants
                </a>
              </div>
            </div>
          </div>
        ) : null}
        <header className="flex flex-col gap-4 rounded-3xl bg-slate-900 px-6 py-7 text-white shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">
                Roast Mate — Beechworth Coffee Roasters
              </p>
              <h1 className="text-3xl font-semibold">Weekly roast planning</h1>
              <p className="mt-2 max-w-2xl text-sm text-emerald-100">
                Imports unfulfilled Shopify orders, converts variants to roast demand, enforces full
                5 kg drops, and outputs roasting, bagging, and pick-list reports.
              </p>
            </div>
            <div className="flex flex-col items-end gap-3 text-right">
              <div className="flex items-center gap-2">
                <SyncButton />
                <a
                  href="/settings"
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-white/20"
                >
                  Settings
                </a>
              </div>
              <div className="text-right">
                <p className="text-sm uppercase tracking-[0.25em] text-emerald-100">Batch size</p>
                <p className="text-2xl font-semibold">5 kg green</p>
                <p className="text-xs text-emerald-200">No partial batches ever</p>
              </div>
            </div>
          </div>
        </header>

        <RoastPlanner session={session} settings={settings} />
      </div>
    </main>
  );
}
