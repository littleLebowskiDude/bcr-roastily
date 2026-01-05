/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { SectionCard } from "./SectionCard";
import { UnmappedVariantsAlert } from "./UnmappedVariantsAlert";
import { collectUnmappedOrderItems } from "@/lib/unmapped";
import type { Coffee, OnHandStock, Order, RoastSession } from "@/lib/types";

type Props = {
  session: RoastSession;
  settings: {
    coffees: Coffee[];
    blends: { id: string; name: string; components: { coffeeId: string; percentage: number }[] }[];
    variantMappings: { variantId: string; coffeeId: string; isBlend: boolean; sizeG: number; grindType: string }[];
  };
};

const formatKg = (value: number) =>
  `${(value / 1000).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} kg`;

export function RoastPlanner({ session, settings: initialSettings }: Props) {
  const router = useRouter();
  const [data, setData] = useState(session);
  const [isPending, startTransition] = useTransition();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [onHandDraft, setOnHandDraft] = useState<Record<string, number>>(() => {
    const draft: Record<string, number> = {};
    session.onHand.forEach((item) => {
      draft[`${item.bucketType}:${item.bucketId}`] = item.onHandRoastedG;
    });
    return draft;
  });
  const settings = initialSettings;

  const computation = data.computation;

  useEffect(() => {
    const draft: Record<string, number> = {};
    data.onHand.forEach((item) => {
      draft[`${item.bucketType}:${item.bucketId}`] = item.onHandRoastedG;
    });
    setOnHandDraft(draft);
  }, [data.onHand]);

  const roastTotals = computation?.totals ?? {
    roastedRequiredG: 0,
    greenRequiredG: 0,
    drops: 0,
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

  const refreshSession = async () => {
    const res = await fetch(`/api/roast-sessions/${data.id}/calculate`, { method: "POST" });
    if (res.ok) {
      const payload = await res.json();
      setData(payload.session);
      startTransition(() => router.refresh());
    }
  };

  const handleImportShopify = async () => {
    setImportError(null);
    setImporting(true);
    const res = await fetch(`/api/orders/import/shopify?sessionId=${data.id}`, {
      method: "POST",
    });
    if (!res.ok) {
      const message = await res.text();
      setImportError(message || "Shopify import failed.");
      setImporting(false);
      return;
    }
    const payload = await res.json();
    if (payload.session) {
      setData(payload.session);
      startTransition(() => router.refresh());
    } else {
      await refreshSession();
    }
    setImporting(false);
  };

  const groupedOnHand = useMemo(() => {
    const coffee = data.onHand.filter((item) => item.bucketType === "coffee");
    const blends = data.onHand.filter((item) => item.bucketType === "blend");
    return { coffee, blends };
  }, [data.onHand]);

  const coffeeNameById = useMemo(
    () => new Map(settings.coffees.map((coffee) => [coffee.id, coffee.name])),
    [settings.coffees],
  );
  const blendNameById = useMemo(
    () => new Map(settings.blends.map((blend) => [blend.id, blend.name])),
    [settings.blends],
  );

  const resolveBucketLabel = (type: "coffee" | "blend", id: string) => {
    if (type === "coffee") {
      const match = computation?.results.find((item) => item.coffeeId === id);
      if (match?.coffeeName) return match.coffeeName;

      const settingsName = coffeeNameById.get(id);
      if (settingsName) return settingsName;

      return id.replace("coffee_", "");
    }

    const blendMatch = computation?.blendBuckets.find((item) => item.blendId === id);
    if (blendMatch?.blendName) return blendMatch.blendName;

    const settingsBlendName = blendNameById.get(id);
    if (settingsBlendName) return settingsBlendName;

    return id.replace("blend_", "");
  };

  const sessionDate = (() => {
    const raw = data.sessionDate as unknown;
    if (typeof raw === "string") return raw;
    if (raw instanceof Date) return raw.toISOString().slice(0, 10);
    return String(raw);
  })();

  // Detect unmapped variants
  const unmappedItems = useMemo(
    () => collectUnmappedOrderItems(data.orders),
    [data.orders],
  );
  const unmappedByOrderId = useMemo(() => {
    const map = new Map<string, number>();
    unmappedItems.forEach((item) => {
      map.set(item.orderId, (map.get(item.orderId) ?? 0) + item.quantity);
    });
    return map;
  }, [unmappedItems]);

  return (
    <div className="space-y-6">
      <UnmappedVariantsAlert unmappedItems={unmappedItems} />

      {/* Stats Cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-warm transition-warm hover:shadow-warm-lg">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-sienna-100 opacity-50 transition-transform group-hover:scale-110" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sienna-600">
              Planning date
            </p>
            <p className="mt-1 font-display text-3xl tracking-wide text-espresso-900">{sessionDate}</p>
            <p className="mt-1 text-sm text-espresso-500">Syncs unfulfilled Shopify orders</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-warm transition-warm hover:shadow-warm-lg">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-sage-100 opacity-50 transition-transform group-hover:scale-110" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sage-600">
              Drops required
            </p>
            <p className="mt-1 font-display text-3xl tracking-wide text-espresso-900">{roastTotals.drops}</p>
            <p className="mt-1 text-sm text-espresso-500">{formatKg(roastTotals.greenRequiredG)} green</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-warm transition-warm hover:shadow-warm-lg">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-espresso-100 opacity-50 transition-transform group-hover:scale-110" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-espresso-600">
              Roasted needed
            </p>
            <p className="mt-1 font-display text-3xl tracking-wide text-espresso-900">
              {formatKg(roastTotals.roastedRequiredG)}
            </p>
            <p className="mt-1 text-sm text-espresso-500">After on-hand deductions</p>
          </div>
        </div>
      </section>

      <SectionCard
        title="Shopify import"
        subtitle="Pull unfulfilled Shopify orders, map variants, and persist them to the current plan."
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-espresso-600">
              Imports use the live Shopify credentials from your environment variables.
            </p>
            {importError ? (
              <p className="flex items-center gap-2 text-sm text-roast-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {importError}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleImportShopify}
              disabled={importing}
              className="btn-primary"
            >
              {importing ? "Importing..." : "Import Shopify orders"}
            </button>
            <button
              onClick={refreshSession}
              className="btn-secondary"
            >
              Recalculate plan
            </button>
          </div>
        </div>
      </SectionCard>


      <SectionCard
        title="Orders"
        subtitle="Tap to skip a specific order for this roast."
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {unmappedItems.length ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-roast-100 px-3 py-1.5 text-xs font-semibold text-roast-800">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {unmappedItems.length} unmapped item{unmappedItems.length === 1 ? "" : "s"}
              </span>
              <a
                href="#unmapped-variants"
                className="text-sm font-semibold text-roast-600 underline decoration-roast-300 underline-offset-2 transition-warm hover:text-roast-700"
              >
                Review missing mappings
              </a>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-sage-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              All imported items are mapped
            </span>
          )}
        </div>
        <div className="divide-y divide-espresso-100">
          {data.orders.map((order) => {
            const unmappedCount = unmappedByOrderId.get(order.id);
            return (
              <article
                key={order.id}
                className="py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-espresso-900">
                      {order.sourceOrderId} — {order.customerName}
                    </p>
                    <p className="mt-0.5 text-sm text-espresso-500">
                      {order.items.length} items · {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    {typeof unmappedCount === "number" ? (
                      <p className="mt-1 flex items-center gap-1 text-sm text-roast-600">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        Missing mappings for {unmappedCount} item{unmappedCount === 1 ? "" : "s"}
                      </p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => handleOrderToggle(order)}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-warm transition-warm ${
                      order.status === "skipped"
                        ? "bg-roast-100 text-roast-800 hover:bg-roast-200"
                        : "bg-sage-600 text-white hover:bg-sage-500"
                    }`}
                  >
                    {order.status === "skipped" ? (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        Skipped
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Included
                      </>
                    )}
                  </button>
                </div>
                {/* Order items list */}
                <div className="mt-3 rounded-lg bg-linen-50 p-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-espresso-100">
                        <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-espresso-500">Product</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-espresso-500">SKU</th>
                        <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-espresso-500">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-espresso-100">
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 text-espresso-700">{item.productName}</td>
                          <td className="py-2 font-mono text-xs text-espresso-500">{item.variantId}</td>
                          <td className="py-2 text-right font-semibold text-espresso-800">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>
      <SectionCard
        title="On-hand roasted stock"
        subtitle="Use these buckets before scheduling new drops."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-linen-100 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sienna-100">
                <svg className="h-3.5 w-3.5 text-sienna-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-espresso-800">Single origins</p>
            </div>
            <div className="space-y-3">
              {groupedOnHand.coffee.map((item) => (
                <div key={item.bucketId} className="flex items-center justify-between gap-3">
                  <p className="text-sm text-espresso-700">
                    {resolveBucketLabel("coffee", item.bucketId)}
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={(onHandDraft[`coffee:${item.bucketId}`] ?? 0) / 1000}
                      onChange={(event) =>
                        setOnHandDraft((prev) => ({
                          ...prev,
                          [`coffee:${item.bucketId}`]: Number(event.target.value) * 1000,
                        }))
                      }
                      className="input-field w-28 pr-10 text-right"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-espresso-400">kg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-linen-100 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-espresso-200">
                <svg className="h-3.5 w-3.5 text-espresso-700" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-espresso-800">Blends</p>
            </div>
            <div className="space-y-3">
              {groupedOnHand.blends.map((item) => (
                <div key={item.bucketId} className="flex items-center justify-between gap-3">
                  <p className="text-sm text-espresso-700">
                    {resolveBucketLabel("blend", item.bucketId)}
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={(onHandDraft[`blend:${item.bucketId}`] ?? 0) / 1000}
                      onChange={(event) =>
                        setOnHandDraft((prev) => ({
                          ...prev,
                          [`blend:${item.bucketId}`]: Number(event.target.value) * 1000,
                        }))
                      }
                      className="input-field w-28 pr-10 text-right"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-espresso-400">kg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={handleOnHandSave}
            className="btn-dark"
          >
            Save on-hand
          </button>
          {isPending ? (
            <span className="flex items-center gap-2 text-sm text-espresso-500">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Calculating…
            </span>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Roast schedule"
        subtitle="Full 5 kg green batches only. Surplus automatically moves to on-hand."
        defaultOpen
      >
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-espresso-200">
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">Coffee</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">Needed</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">Green</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">Drops</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">Output</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">Surplus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-espresso-100">
              {computation?.results.map((result) => (
                <tr key={`${result.coffeeId}-${result.blendId ?? "solo"}`} className="transition-warm hover:bg-linen-50">
                  <td className="px-3 py-3.5">
                    <span className="font-semibold text-espresso-900">{result.coffeeName}</span>
                    {result.blendName ? (
                      <span className="ml-2 rounded-md bg-espresso-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-espresso-600">
                        {result.blendName}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums text-espresso-700">{formatKg(result.roastedNeededG)}</td>
                  <td className="px-3 py-3.5 text-right tabular-nums text-espresso-700">{formatKg(result.greenRequiredG)}</td>
                  <td className="px-3 py-3.5 text-center">
                    <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md bg-sienna-100 px-2 font-display text-lg text-sienna-700">
                      {result.dropsRequired}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums text-espresso-700">{formatKg(result.expectedRoastedG)}</td>
                  <td className="px-3 py-3.5 text-right">
                    <span className={`tabular-nums ${result.surplusG > 0 ? "text-sage-600" : "text-espresso-500"}`}>
                      {formatKg(result.surplusG)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Blend buckets" subtitle="Drop-based blending by component.">
        <div className="grid gap-4 md:grid-cols-2">
          {computation?.blendBuckets.map((blend) => (
            <div
              key={blend.blendId}
              className="rounded-xl border border-espresso-100 bg-linen-50 p-4 transition-warm hover:border-espresso-200"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-espresso-900">{blend.blendName}</p>
                <span className={`text-sm font-medium ${blend.surplusG > 0 ? "text-sage-600" : "text-espresso-500"}`}>
                  +{formatKg(blend.surplusG)} surplus
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-espresso-600">
                <span>{formatKg(blend.requiredRoastedG)} required</span>
                <svg className="h-4 w-4 text-espresso-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                <span className="font-medium text-espresso-800">{formatKg(blend.actualRoastedG)} actual</span>
              </div>
            </div>
          ))}
          {computation?.blendBuckets.length === 0 ? (
            <p className="text-sm text-espresso-500">No blends in this plan.</p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Bagging report" subtitle="Counts by SKU, size, and grind.">
        <div className="divide-y divide-espresso-100">
          {computation?.bagging.map((line) => (
            <div key={line.key} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-espresso-900">{line.label}</p>
                <p className="mt-0.5 text-sm text-espresso-500">
                  {formatKg(line.sizeG)} · {line.grindType}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm text-espresso-700">
                  <svg className="h-4 w-4 text-espresso-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  {line.quantity} bags
                </span>
                <span className="rounded-lg bg-espresso-100 px-3 py-1.5 text-sm font-semibold tabular-nums text-espresso-700">
                  {formatKg(line.totalRoastedG)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            className="btn-primary inline-flex items-center gap-2"
            href={`/api/reports/roasting/${data.id}`}
            target="_blank"
            rel="noreferrer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Roasting PDF
          </a>
          <a
            className="btn-dark inline-flex items-center gap-2"
            href={`/api/reports/bagging/${data.id}`}
            target="_blank"
            rel="noreferrer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Bagging PDF
          </a>
        </div>
      </SectionCard>
    </div>
  );
}
