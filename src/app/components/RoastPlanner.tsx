/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { OnHandStock, Order, RoastSession } from "@/lib/types";

type Props = {
  session: RoastSession;
};

const formatKg = (value: number) => `${(value / 1000).toFixed(1)} kg`;
const formatG = (value: number) => `${Math.round(value).toLocaleString()} g`;

function SectionCard(props: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-slate-100 backdrop-blur">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{props.title}</p>
          {props.subtitle ? (
            <p className="text-xs text-slate-500">{props.subtitle}</p>
          ) : null}
        </div>
      </header>
      {props.children}
    </section>
  );
}

export function RoastPlanner({ session }: Props) {
  const router = useRouter();
  const [data, setData] = useState(session);
  const [isPending, startTransition] = useTransition();
  const [onHandDraft, setOnHandDraft] = useState<Record<string, number>>(() => {
    const draft: Record<string, number> = {};
    session.onHand.forEach((item) => {
      draft[`${item.bucketType}:${item.bucketId}`] = item.onHandRoastedG;
    });
    return draft;
  });

  const computation = data.computation;

  const roastTotals = computation?.totals ?? {
    roastedRequiredG: 0,
    greenRequiredG: 0,
    drops: 0,
  };

  const resolveBucketLabel = (type: "coffee" | "blend", id: string) => {
    if (type === "coffee") {
      const match = computation?.results.find((item) => item.coffeeId === id);
      return match?.coffeeName ?? id.replace("coffee_", "");
    }
    const blendMatch = computation?.blendBuckets.find((item) => item.blendId === id);
    return blendMatch?.blendName ?? id.replace("blend_", "");
  };

  const handleOrderToggle = async (order: Order) => {
    const status = order.status === "skipped" ? "included" : "skipped";
    const res = await fetch(`/api/roast-sessions/${data.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, status }),
    });
    if (res.ok) {
      const payload = await res.json();
      setData(payload.session);
      startTransition(() => router.refresh());
    }
  };

  const handleOnHandSave = async () => {
    const entries: OnHandStock[] = data.onHand.map((entry) => ({
      ...entry,
      onHandRoastedG: Number(onHandDraft[`${entry.bucketType}:${entry.bucketId}`] ?? 0),
    }));
    const res = await fetch(`/api/roast-sessions/${data.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onHand: entries }),
    });
    if (res.ok) {
      const payload = await res.json();
      setData(payload.session);
      startTransition(() => router.refresh());
    }
  };

  const groupedOnHand = useMemo(() => {
    const coffee = data.onHand.filter((item) => item.bucketType === "coffee");
    const blends = data.onHand.filter((item) => item.bucketType === "blend");
    return { coffee, blends };
  }, [data.onHand]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-slate-100 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
            Session date
          </p>
          <p className="text-3xl font-semibold text-slate-900">{data.sessionDate}</p>
          <p className="text-xs text-slate-500">Auto-created every Monday</p>
        </div>
        <div className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-slate-100 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
            Drops required
          </p>
          <p className="text-3xl font-semibold text-slate-900">{roastTotals.drops}</p>
          <p className="text-xs text-slate-500">{formatKg(roastTotals.greenRequiredG)} green</p>
        </div>
        <div className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-slate-100 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
            Roasted needed
          </p>
          <p className="text-3xl font-semibold text-slate-900">
            {formatKg(roastTotals.roastedRequiredG)}
          </p>
          <p className="text-xs text-slate-500">After on-hand deductions</p>
        </div>
      </section>

      <SectionCard
        title="Orders"
        subtitle="Tap to skip a specific order for this roast session."
      >
        <div className="divide-y divide-slate-100">
          {data.orders.map((order) => (
            <article
              key={order.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {order.sourceOrderId} — {order.customerName}
                </p>
                <p className="text-xs text-slate-500">
                  {order.items.length} items • {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleOrderToggle(order)}
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  order.status === "skipped"
                    ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                }`}
              >
                {order.status === "skipped" ? "Skipped" : "Included"}
              </button>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="On-hand roasted stock"
        subtitle="Use these buckets before scheduling new drops."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="mb-3 text-xs font-semibold text-slate-700">Single origins</p>
            <div className="space-y-3">
              {groupedOnHand.coffee.map((item) => (
                <div key={item.bucketId} className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-800">
                    {resolveBucketLabel("coffee", item.bucketId)}
                  </p>
                  <input
                    type="number"
                    min={0}
                    value={onHandDraft[`coffee:${item.bucketId}`] ?? 0}
                    onChange={(event) =>
                      setOnHandDraft((prev) => ({
                        ...prev,
                        [`coffee:${item.bucketId}`]: Number(event.target.value),
                      }))
                    }
                    className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="mb-3 text-xs font-semibold text-slate-700">Blends</p>
            <div className="space-y-3">
              {groupedOnHand.blends.map((item) => (
                <div key={item.bucketId} className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-800">
                    {resolveBucketLabel("blend", item.bucketId)}
                  </p>
                  <input
                    type="number"
                    min={0}
                    value={onHandDraft[`blend:${item.bucketId}`] ?? 0}
                    onChange={(event) =>
                      setOnHandDraft((prev) => ({
                        ...prev,
                        [`blend:${item.bucketId}`]: Number(event.target.value),
                      }))
                    }
                    className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            onClick={handleOnHandSave}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Save on-hand
          </button>
          {isPending ? (
            <span className="text-xs text-slate-500">Calculating…</span>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Roast schedule"
        subtitle="Full 5 kg green batches only. Surplus automatically moves to on-hand."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-3 py-2">Coffee</th>
                <th className="px-3 py-2">Needed</th>
                <th className="px-3 py-2">Green</th>
                <th className="px-3 py-2">Drops</th>
                <th className="px-3 py-2">Output</th>
                <th className="px-3 py-2">Surplus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {computation?.results.map((result) => (
                <tr key={`${result.coffeeId}-${result.blendId ?? "solo"}`}>
                  <td className="px-3 py-3 font-semibold text-slate-900">
                    {result.coffeeName}
                    {result.blendName ? (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        {result.blendName}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{formatG(result.roastedNeededG)}</td>
                  <td className="px-3 py-3 text-slate-700">{formatG(result.greenRequiredG)}</td>
                  <td className="px-3 py-3 text-slate-700">{result.dropsRequired}</td>
                  <td className="px-3 py-3 text-slate-700">{formatG(result.expectedRoastedG)}</td>
                  <td className="px-3 py-3 text-slate-700">{formatG(result.surplusG)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Blend buckets" subtitle="Drop-based blending by component.">
        <div className="grid gap-3 md:grid-cols-2">
          {computation?.blendBuckets.map((blend) => (
            <div
              key={blend.blendId}
              className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 shadow-inner"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{blend.blendName}</p>
                <span className="text-xs text-slate-500">
                  Surplus: {formatG(blend.surplusG)}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Required {formatG(blend.requiredRoastedG)} → Actual {formatG(blend.actualRoastedG)}
              </p>
            </div>
          ))}
          {computation?.blendBuckets.length === 0 ? (
            <p className="text-sm text-slate-500">No blends in this session.</p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Bagging report" subtitle="Counts by SKU, size, and grind.">
        <div className="divide-y divide-slate-100">
          {computation?.bagging.map((line) => (
            <div key={line.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{line.label}</p>
                <p className="text-xs text-slate-500">
                  {line.sizeG} g • {line.grindType}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <span>{line.quantity} bags</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {formatG(line.totalRoastedG)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
            href={`/api/reports/roasting/${data.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Roasting PDF
          </a>
          <a
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            href={`/api/reports/bagging/${data.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Bagging PDF
          </a>
        </div>
      </SectionCard>
    </div>
  );
}
