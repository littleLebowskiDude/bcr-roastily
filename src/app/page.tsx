import { RoastPlanner } from "./components/RoastPlanner";
import { getSessionWithComputation, getOrCreateLatestSession } from "@/lib/roast-sessions";
import { seedIfEmpty } from "@/lib/repository";

export const revalidate = 0;

export default async function Home() {
  await seedIfEmpty();
  const latest = await getOrCreateLatestSession();
  const session = await getSessionWithComputation(latest.id);

  if (!session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 px-6 py-12 text-slate-900">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-semibold text-slate-900">No roast session found.</p>
          <p className="text-sm text-slate-600">
            Create a session with POST /api/roast-sessions.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
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
            <div className="flex flex-col items-end text-right">
              <p className="text-sm uppercase tracking-[0.25em] text-emerald-100">
                Batch size
              </p>
              <p className="text-2xl font-semibold">5 kg green</p>
              <p className="text-xs text-emerald-200">No partial batches ever</p>
            </div>
          </div>
        </header>

        <RoastPlanner session={session} />
      </div>
    </main>
  );
}
