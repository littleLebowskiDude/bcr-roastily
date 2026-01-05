"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "./SectionCard";
import type { Blend, Coffee, VariantMapping } from "@/lib/types";

type SettingsSnapshot = {
  coffees: Coffee[];
  blends: Blend[];
  variantMappings: VariantMapping[];
};

type MappingForm = {
  variantId: string;
  coffeeId: string;
  isBlend: boolean;
  sizeG: number;
  grindType: string;
};

const formatKg = (value: number) =>
  `${(value / 1000).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} kg`;

export function SettingsManager({ initialSettings }: { initialSettings: SettingsSnapshot }) {
  const [settings, setSettings] = useState(initialSettings);

  const [mappingForm, setMappingForm] = useState<MappingForm>(() => ({
    variantId: "",
    coffeeId: initialSettings.coffees[0]?.id ?? initialSettings.blends[0]?.id ?? "",
    isBlend: false,
    sizeG: 250,
    grindType: "Whole bean",
  }));

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
    components: settings.coffees[0]
      ? [{ coffeeId: settings.coffees[0].id, percentage: 50 }]
      : [],
  }));

  const coffeeNameById = useMemo(
    () => new Map(settings.coffees.map((coffee) => [coffee.id, coffee.name])),
    [settings.coffees],
  );
  const blendNameById = useMemo(
    () => new Map(settings.blends.map((blend) => [blend.id, blend.name])),
    [settings.blends],
  );

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

  return (
    <div className="space-y-6">
      <SectionCard
        title="Variant mappings"
        subtitle="Link Shopify variant IDs to coffees or blends, sizes, and grind types."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-linen-100 p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-espresso-800">Existing mappings</p>
              <span className="rounded-md bg-espresso-100 px-2 py-1 text-xs font-semibold text-espresso-600">
                {settings.variantMappings.length} total
              </span>
            </div>
            <div className="mt-4 divide-y divide-espresso-200">
              {settings.variantMappings.map((mapping) => (
                <div
                  key={mapping.variantId}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-espresso-900">{mapping.variantId}</p>
                    <p className="mt-0.5 text-sm text-espresso-500">
                      {mapping.isBlend ? "Blend" : "Coffee"} ·{" "}
                      {mapping.isBlend
                        ? blendNameById.get(mapping.coffeeId) ?? mapping.coffeeId
                        : coffeeNameById.get(mapping.coffeeId) ?? mapping.coffeeId}{" "}
                      · {formatKg(mapping.sizeG)} ·{" "}
                      {mapping.grindType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMappingPrefill(mapping)}
                      className="rounded-lg border border-espresso-200 bg-white px-3 py-1.5 text-xs font-semibold text-espresso-700 transition-warm hover:border-espresso-300 hover:bg-espresso-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleMappingDelete(mapping.variantId)}
                      className="rounded-lg bg-espresso-900 px-3 py-1.5 text-xs font-semibold text-white shadow-warm transition-warm hover:bg-espresso-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {settings.variantMappings.length === 0 ? (
                <p className="py-4 text-sm text-espresso-500">No mappings yet.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-espresso-100 bg-white p-5 shadow-warm">
            <p className="font-semibold text-espresso-900">Add / edit mapping</p>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">
                  Shopify variant ID
                </span>
                <input
                  value={mappingForm.variantId}
                  onChange={(event) =>
                    setMappingForm((prev) => ({ ...prev, variantId: event.target.value }))
                  }
                  className="input-field mt-1.5"
                  placeholder="gid://shopify/ProductVariant/123456"
                />
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMappingTypeChange(false)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-warm ${
                    mappingForm.isBlend
                      ? "border border-espresso-200 text-espresso-600 hover:bg-espresso-50"
                      : "bg-sienna-100 text-sienna-800"
                  }`}
                >
                  Coffee
                </button>
                <button
                  onClick={() => handleMappingTypeChange(true)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-warm ${
                    mappingForm.isBlend
                      ? "bg-espresso-900 text-white"
                      : "border border-espresso-200 text-espresso-600 hover:bg-espresso-50"
                  }`}
                >
                  Blend
                </button>
              </div>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">
                  Target
                </span>
                <select
                  value={mappingForm.coffeeId}
                  onChange={(event) =>
                    setMappingForm((prev) => ({
                      ...prev,
                      coffeeId: event.target.value,
                    }))
                  }
                  className="input-field mt-1.5"
                >
                  {(mappingForm.isBlend ? settings.blends : settings.coffees).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">
                    Size (kg)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={mappingForm.sizeG / 1000}
                    onChange={(event) =>
                      setMappingForm((prev) => ({
                        ...prev,
                        sizeG: Number(event.target.value) * 1000,
                      }))
                    }
                    className="input-field mt-1.5"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">
                    Grind type
                  </span>
                  <input
                    value={mappingForm.grindType}
                    onChange={(event) =>
                      setMappingForm((prev) => ({ ...prev, grindType: event.target.value }))
                    }
                    className="input-field mt-1.5"
                    placeholder="Whole bean / Espresso"
                  />
                </label>
              </div>

              <button
                onClick={handleMappingSubmit}
                disabled={mappingDisabled}
                className="btn-primary w-full"
              >
                Save mapping
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Coffees" subtitle="Manage single-origin coffees and roast loss percentages.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-linen-100 p-5">
            <p className="font-semibold text-espresso-800">Active coffees</p>
            <div className="mt-4 divide-y divide-espresso-200">
              {settings.coffees.map((coffee) => (
                <div
                  key={coffee.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-espresso-900">{coffee.name}</p>
                    <p className="mt-0.5 text-sm text-espresso-500">
                      Roast loss {coffee.roastLossPercentage}%
                      {coffee.costPerKg ? ` · $${coffee.costPerKg.toFixed(2)}/kg` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCoffeeEdit(coffee.id)}
                      className="rounded-lg border border-espresso-200 bg-white px-3 py-1.5 text-xs font-semibold text-espresso-700 transition-warm hover:border-espresso-300 hover:bg-espresso-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleCoffeeArchive(coffee.id)}
                      className="rounded-lg bg-espresso-900 px-3 py-1.5 text-xs font-semibold text-white shadow-warm transition-warm hover:bg-espresso-800"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))}
              {settings.coffees.length === 0 ? (
                <p className="py-4 text-sm text-espresso-500">No coffees available.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-espresso-100 bg-white p-5 shadow-warm">
            <p className="font-semibold text-espresso-900">
              {coffeeForm.id ? "Update coffee" : "Add coffee"}
            </p>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">
                  Name
                </span>
                <input
                  value={coffeeForm.name}
                  onChange={(event) =>
                    setCoffeeForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="input-field mt-1.5"
                  placeholder="Kenya AA"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">
                    Roast loss (%)
                  </span>
                  <input
                    type="number"
                    value={coffeeForm.roastLossPercentage}
                    onChange={(event) =>
                      setCoffeeForm((prev) => ({
                        ...prev,
                        roastLossPercentage: Number(event.target.value),
                      }))
                    }
                    className="input-field mt-1.5"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">
                    Cost per kg (optional)
                  </span>
                  <input
                    type="number"
                    value={coffeeForm.costPerKg}
                    onChange={(event) =>
                      setCoffeeForm((prev) => ({ ...prev, costPerKg: event.target.value }))
                    }
                    className="input-field mt-1.5"
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCoffeeSubmit}
                  disabled={coffeeDisabled}
                  className="btn-primary"
                >
                  Save coffee
                </button>
                {coffeeForm.id ? (
                  <button
                    onClick={resetCoffeeForm}
                    className="btn-secondary"
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
          <div className="rounded-xl bg-linen-100 p-5">
            <p className="font-semibold text-espresso-800">Active blends</p>
            <div className="mt-4 divide-y divide-espresso-200">
              {settings.blends.map((blend) => (
                <div
                  key={blend.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-espresso-900">{blend.name}</p>
                    <p className="mt-0.5 text-sm text-espresso-500">
                      {blend.components
                        .map((component) => {
                          const label = coffeeNameById.get(component.coffeeId) ?? component.coffeeId;
                          return `${component.percentage}% ${label}`;
                        })
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBlendEdit(blend)}
                      className="rounded-lg border border-espresso-200 bg-white px-3 py-1.5 text-xs font-semibold text-espresso-700 transition-warm hover:border-espresso-300 hover:bg-espresso-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleBlendArchive(blend.id)}
                      className="rounded-lg bg-espresso-900 px-3 py-1.5 text-xs font-semibold text-white shadow-warm transition-warm hover:bg-espresso-800"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))}
              {settings.blends.length === 0 ? (
                <p className="py-4 text-sm text-espresso-500">No blends yet.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-espresso-100 bg-white p-5 shadow-warm">
            <p className="font-semibold text-espresso-900">
              {blendForm.id ? "Update blend" : "Add blend"}
            </p>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">
                  Blend name
                </span>
                <input
                  value={blendForm.name}
                  onChange={(event) => setBlendForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="input-field mt-1.5"
                  placeholder="House Blend"
                />
              </label>
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-espresso-600">
                  Components
                </span>
                {blendForm.components.map((component, index) => (
                  <div key={`${component.coffeeId}-${index}`} className="flex items-center gap-2">
                    <select
                      value={component.coffeeId}
                      onChange={(event) => updateBlendComponent(index, "coffeeId", event.target.value)}
                      className="input-field flex-1"
                    >
                      {settings.coffees.map((coffee) => (
                        <option key={coffee.id} value={coffee.id}>
                          {coffee.name}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <input
                        type="number"
                        value={component.percentage}
                        onChange={(event) =>
                          updateBlendComponent(index, "percentage", Number(event.target.value))
                        }
                        className="input-field w-20 pr-7 text-right"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-espresso-400">%</span>
                    </div>
                    {blendForm.components.length > 1 ? (
                      <button
                        onClick={() => removeBlendComponent(index)}
                        className="rounded-lg border border-espresso-200 bg-white p-2 text-espresso-500 transition-warm hover:border-espresso-300 hover:bg-espresso-50 hover:text-espresso-700"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  onClick={addBlendComponent}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-sienna-300 px-3 py-2 text-sm font-semibold text-sienna-600 transition-warm hover:border-sienna-400 hover:bg-sienna-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add component
                </button>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleBlendSubmit}
                  disabled={blendDisabled}
                  className="btn-primary"
                >
                  Save blend
                </button>
                {blendForm.id ? (
                  <button
                    onClick={resetBlendForm}
                    className="btn-secondary"
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
