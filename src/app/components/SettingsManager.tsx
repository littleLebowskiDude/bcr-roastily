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
    </div>
  );
}
