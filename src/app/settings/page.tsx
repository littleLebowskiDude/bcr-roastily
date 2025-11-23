import { SettingsManager } from "../components/SettingsManager";
import { fetchSettingsSnapshot, seedIfEmpty } from "@/lib/repository";

export const revalidate = 0;

export default async function SettingsPage() {
  await seedIfEmpty();
  const settings = await fetchSettingsSnapshot();

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl bg-slate-900 px-6 py-7 text-white shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">Roast Mate — Settings</p>
              <h1 className="text-3xl font-semibold">Configuration</h1>
              <p className="mt-2 max-w-2xl text-sm text-emerald-100">
                Manage variant mappings, coffees, and blends used by the weekly roast planner.
              </p>
            </div>
            <a
              href="/"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-white/20"
            >
              Back to planner
            </a>
          </div>
        </header>

        <SettingsManager initialSettings={settings} />
      </div>
    </main>
  );
}
