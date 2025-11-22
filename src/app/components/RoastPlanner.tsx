/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Blend, Coffee, OnHandStock, Order, RoastSession, VariantMapping } from "@/lib/types";

type Props = {
  session: RoastSession;
  settings: {
    coffees: Coffee[];
    blends: Blend[];
    variantMappings: VariantMapping[];
  };
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

export function RoastPlanner({ session, settings: initialSettings }: Props) {
  const router = useRouter();
  const [data, setData] = useState(session);
  const [settings, setSettings] = useState(initialSettings);
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
  const [mappingForm, setMappingForm] = useState({
    variantId: "",
    coffeeId: initialSettings.coffees[0]?.id ?? "",
    isBlend: false,
    sizeG: 250,
    grindType: "Whole bean",
  });
  const [coffeeForm, setCoffeeForm] = useState({
    id: "",
    name: "",
    roastLossPercentage: 16,
    costPerKg: "",
  });
  const [blendForm, setBlendForm] = useState<{
    id?: string;
    name: string;
    components: { coffeeId: string; percentage: number }[];
  }>(() => ({
    name: "",
    components: initialSettings.coffees[0]
      ? [{ coffeeId: initialSettings.coffees[0].id, percentage: 50 }]
      : [],
  }));

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

  const handleMappingSubmit = async () => {
    const res = await fetch("/api/settings/variant-mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mappingForm),
    });
    if (res.ok) {
      const payload = await res.json();
      setSettings(payload.settings);
      setMappingForm((prev) => ({ ...prev, variantId: "" }));
      await refreshSession();
    }
  };

  const handleMappingPrefill = (mapping: VariantMapping) => {
    setMappingForm({
      variantId: mapping.variantId,
      coffeeId: mapping.coffeeId,
      isBlend: mapping.isBlend,
      sizeG: mapping.sizeG,
      grindType: mapping.grindType,
    });
  };

  const handleMappingTypeChange = (isBlend: boolean) => {
    const options = isBlend ? settings.blends : settings.coffees;
    setMappingForm((prev) => ({
      ...prev,
      isBlend,
      coffeeId: options.find((option) => option.id === prev.coffeeId)?.id ?? options[0]?.id ?? "",
    }));
  };

  const handleMappingDelete = async (variantId: string) => {
    const res = await fetch(`/api/settings/variant-mappings/${variantId}`, { method: "DELETE" });
    if (res.ok) {
      const payload = await res.json();
      setSettings(payload.settings);
      await refreshSession();
    }
  };

  const resetCoffeeForm = () =>
    setCoffeeForm({
      id: "",
      name: "",
      roastLossPercentage: 16,
      costPerKg: "",
    });

  const handleCoffeeSubmit = async () => {
    const method = coffeeForm.id ? "PUT" : "POST";
    const path = coffeeForm.id
      ? `/api/settings/coffees/${coffeeForm.id}`
      : "/api/settings/coffees";
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: coffeeForm.name,
        roastLossPercentage: Number(coffeeForm.roastLossPercentage),
        costPerKg: coffeeForm.costPerKg === "" ? undefined : Number(coffeeForm.costPerKg),
      }),
    });
    if (res.ok) {
      const payload = await res.json();
      setSettings(payload.settings);
      resetCoffeeForm();
      await refreshSession();
    }
  };

  const handleCoffeeEdit = (id: string) => {
    const coffee = settings.coffees.find((item) => item.id === id);
    if (!coffee) return;
    setCoffeeForm({
      id: coffee.id,
      name: coffee.name,
      roastLossPercentage: coffee.roastLossPercentage,
      costPerKg: coffee.costPerKg?.toString() ?? "",
    });
  };

  const handleCoffeeArchive = async (id: string) => {
    const res = await fetch(`/api/settings/coffees/${id}`, { method: "DELETE" });
    if (res.ok) {
      const payload = await res.json();
      setSettings(payload.settings);
      resetCoffeeForm();
      await refreshSession();
    }
  };

  const resetBlendForm = () =>
    setBlendForm({
      id: undefined,
      name: "",
      components: settings.coffees[0]
        ? [{ coffeeId: settings.coffees[0].id, percentage: 50 }]
        : [],
    });

  const handleBlendSubmit = async () => {
    const method = blendForm.id ? "PUT" : "POST";
    const path = blendForm.id
      ? `/api/settings/blends/${blendForm.id}`
      : "/api/settings/blends";
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blendForm),
    });
    if (res.ok) {
      const payload = await res.json();
      setSettings(payload.settings);
      resetBlendForm();
      await refreshSession();
    }
  };

  const handleBlendEdit = (blend: Blend) => {
    setBlendForm({
      id: blend.id,
      name: blend.name,
      components: blend.components.map((component) => ({
        coffeeId: component.coffeeId,
        percentage: component.percentage,
      })),
    });
  };

  const handleBlendArchive = async (id: string) => {
    const res = await fetch(`/api/settings/blends/${id}`, { method: "DELETE" });
    if (res.ok) {
      const payload = await res.json();
      setSettings(payload.settings);
      resetBlendForm();
      await refreshSession();
    }
  };

  const addBlendComponent = () =>
    setBlendForm((prev) => ({
      ...prev,
      components: [
        ...prev.components,
        { coffeeId: settings.coffees[0]?.id ?? "", percentage: 0 },
      ],
    }));

  const updateBlendComponent = (
    index: number,
    field: "coffeeId" | "percentage",
    value: string | number,
  ) =>
    setBlendForm((prev) => {
      const components = [...prev.components];
      components[index] = {
        ...components[index],
        [field]: field === "percentage" ? Number(value) : String(value),
      };
      return { ...prev, components };
    });

  const removeBlendComponent = (index: number) =>
    setBlendForm((prev) => ({
      ...prev,
      components: prev.components.filter((_, compIndex) => compIndex !== index),
    }));

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

  const sessionDate = (() => {
    const raw = data.sessionDate as unknown;
    if (typeof raw === "string") return raw;
    if (raw instanceof Date) return raw.toISOString().slice(0, 10);
    return String(raw);
  })();

  const mappingDisabled =
    !mappingForm.variantId || !mappingForm.coffeeId || Number(mappingForm.sizeG) <= 0;
  const coffeeDisabled =
    !coffeeForm.name || Number.isNaN(Number(coffeeForm.roastLossPercentage));
  const blendDisabled =
    !blendForm.name ||
    blendForm.components.length === 0 ||
    blendForm.components.some((component) => !component.coffeeId || component.percentage <= 0);

  useEffect(() => {
    const options = mappingForm.isBlend ? settings.blends : settings.coffees;
    if (!options.find((option) => option.id === mappingForm.coffeeId)) {
      setMappingForm((prev) => ({
        ...prev,
        coffeeId: options[0]?.id ?? "",
      }));
    }
  }, [mappingForm.coffeeId, mappingForm.isBlend, settings.blends, settings.coffees]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-slate-100 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
            Session date
          </p>
          <p className="text-3xl font-semibold text-slate-900">{sessionDate}</p>
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
        title="Shopify import"
        subtitle="Pull unfulfilled Shopify orders, map variants, and persist them to this session."
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-slate-700">
              Imports use the live Shopify credentials from your environment variables.
            </p>
            {importError ? <p className="text-xs text-amber-700">{importError}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleImportShopify}
              disabled={importing}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {importing ? "Importing..." : "Import Shopify orders"}
            </button>
            <button
              onClick={refreshSession}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300"
            >
              Recalculate session
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Variant mappings"
        subtitle="Link Shopify variant IDs to coffees or blends, sizes, and grind types."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Existing mappings</p>
              <span className="text-xs text-slate-500">{settings.variantMappings.length} total</span>
            </div>
            <div className="mt-3 divide-y divide-slate-200">
              {settings.variantMappings.map((mapping) => (
                <div
                  key={mapping.variantId}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{mapping.variantId}</p>
                    <p className="text-xs text-slate-500">
                      {mapping.isBlend ? "Blend" : "Coffee"} -{" "}
                      {mapping.isBlend
                        ? blendNameById.get(mapping.coffeeId) ?? mapping.coffeeId
                        : coffeeNameById.get(mapping.coffeeId) ?? mapping.coffeeId}{" "}
                      - {mapping.sizeG} g -{" "}
                      {mapping.grindType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMappingPrefill(mapping)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 transition hover:border-slate-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleMappingDelete(mapping.variantId)}
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {settings.variantMappings.length === 0 ? (
                <p className="py-3 text-sm text-slate-500">No mappings yet.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Add / edit mapping</p>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Shopify variant ID
                <input
                  value={mappingForm.variantId}
                  onChange={(event) =>
                    setMappingForm((prev) => ({ ...prev, variantId: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="gid://shopify/ProductVariant/123456"
                />
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMappingTypeChange(false)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    mappingForm.isBlend
                      ? "border border-slate-200 text-slate-700"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  Coffee
                </button>
                <button
                  onClick={() => handleMappingTypeChange(true)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    mappingForm.isBlend
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 text-slate-700"
                  }`}
                >
                  Blend
                </button>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Target
                <select
                  value={mappingForm.coffeeId}
                  onChange={(event) =>
                    setMappingForm((prev) => ({
                      ...prev,
                      coffeeId: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {(mappingForm.isBlend ? settings.blends : settings.coffees).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Size (g)
                  <input
                    type="number"
                    min={0}
                    value={mappingForm.sizeG}
                    onChange={(event) =>
                      setMappingForm((prev) => ({
                        ...prev,
                        sizeG: Number(event.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Grind type
                  <input
                    value={mappingForm.grindType}
                    onChange={(event) =>
                      setMappingForm((prev) => ({ ...prev, grindType: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Whole bean / Espresso"
                  />
                </label>
              </div>

              <button
                onClick={handleMappingSubmit}
                disabled={mappingDisabled}
                className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save mapping
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Coffees" subtitle="Manage single-origin coffees and roast loss percentages.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Active coffees</p>
            <div className="mt-3 divide-y divide-slate-200">
              {settings.coffees.map((coffee) => (
                <div
                  key={coffee.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{coffee.name}</p>
                    <p className="text-xs text-slate-500">
                      Roast loss {coffee.roastLossPercentage}%
                      {coffee.costPerKg ? ` | $${coffee.costPerKg.toFixed(2)}/kg` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCoffeeEdit(coffee.id)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 transition hover:border-slate-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleCoffeeArchive(coffee.id)}
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))}
              {settings.coffees.length === 0 ? (
                <p className="py-3 text-sm text-slate-500">No coffees available.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">
              {coffeeForm.id ? "Update coffee" : "Add coffee"}
            </p>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Name
                <input
                  value={coffeeForm.name}
                  onChange={(event) =>
                    setCoffeeForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Kenya AA"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Roast loss (%)
                  <input
                    type="number"
                    value={coffeeForm.roastLossPercentage}
                    onChange={(event) =>
                      setCoffeeForm((prev) => ({
                        ...prev,
                        roastLossPercentage: Number(event.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Cost per kg (optional)
                  <input
                    type="number"
                    value={coffeeForm.costPerKg}
                    onChange={(event) =>
                      setCoffeeForm((prev) => ({ ...prev, costPerKg: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCoffeeSubmit}
                  disabled={coffeeDisabled}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save coffee
                </button>
                {coffeeForm.id ? (
                  <button
                    onClick={resetCoffeeForm}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300"
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Blends" subtitle="Define blend recipes using coffee components.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Active blends</p>
            <div className="mt-3 divide-y divide-slate-200">
              {settings.blends.map((blend) => (
                <div
                  key={blend.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{blend.name}</p>
                    <p className="text-xs text-slate-500">
                      {blend.components
                        .map((component) => {
                          const label = coffeeNameById.get(component.coffeeId) ?? component.coffeeId;
                          return `${component.percentage}% ${label}`;
                        })
                        .join(" | ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBlendEdit(blend)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 transition hover:border-slate-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleBlendArchive(blend.id)}
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))}
              {settings.blends.length === 0 ? (
                <p className="py-3 text-sm text-slate-500">No blends yet.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">
              {blendForm.id ? "Update blend" : "Add blend"}
            </p>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Blend name
                <input
                  value={blendForm.name}
                  onChange={(event) => setBlendForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="House Blend"
                />
              </label>
              <div className="space-y-2">
                {blendForm.components.map((component, index) => (
                  <div key={`${component.coffeeId}-${index}`} className="grid grid-cols-[1fr_auto] items-center gap-2">
                    <select
                      value={component.coffeeId}
                      onChange={(event) => updateBlendComponent(index, "coffeeId", event.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      {settings.coffees.map((coffee) => (
                        <option key={coffee.id} value={coffee.id}>
                          {coffee.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={component.percentage}
                        onChange={(event) =>
                          updateBlendComponent(index, "percentage", Number(event.target.value))
                        }
                        className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      {blendForm.components.length > 1 ? (
                        <button
                          onClick={() => removeBlendComponent(index)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 transition hover:border-slate-300"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                <button
                  onClick={addBlendComponent}
                  className="mt-1 rounded-full border border-dashed border-emerald-400 px-3 py-1 text-xs font-semibold text-emerald-700"
                >
                  Add component
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBlendSubmit}
                  disabled={blendDisabled}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save blend
                </button>
                {blendForm.id ? (
                  <button
                    onClick={resetBlendForm}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300"
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

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
