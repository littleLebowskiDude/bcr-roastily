"use client";

import { groupUnmappedVariants, type UnmappedOrderItem } from "@/lib/unmapped";

type Props = {
  unmappedItems: UnmappedOrderItem[];
};

export function UnmappedVariantsAlert({ unmappedItems }: Props) {
  if (unmappedItems.length === 0) return null;

  const uniqueVariants = groupUnmappedVariants(unmappedItems);

  return (
    <div id="unmapped-variants" className="rounded-3xl border-2 border-amber-200 bg-amber-50 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-900">Unmapped Shopify Variants Detected</h3>
          <p className="mt-1 text-sm text-amber-800">
            Your roast schedule is incomplete because {unmappedItems.length} item
            {unmappedItems.length !== 1 ? "s" : ""} across {uniqueVariants.length} variant
            {uniqueVariants.length !== 1 ? "s need" : " needs"} to be mapped to coffees or blends.
          </p>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Unmapped variants:</p>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-amber-200 bg-white p-3">
              {uniqueVariants.map((item) => (
                <div
                  key={item.variantId}
                  className="flex flex-col gap-1 border-b border-amber-100 pb-2 last:border-0 last:pb-0"
                >
                  <p className="text-sm font-semibold text-slate-900">{item.productName}</p>
                  <p className="font-mono text-xs text-slate-500">Variant ID: {item.variantId}</p>
                  <p className="text-xs text-slate-600">
                    Appears in {item.orders.length} order{item.orders.length !== 1 ? "s" : ""} ·{" "}
                    {item.totalQuantity} item{item.totalQuantity !== 1 ? "s" : ""} total
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Orders: {item.orders.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <a
              href="/settings"
              className="inline-flex items-center justify-center rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500"
            >
              Go to Settings to Map Variants
            </a>
            <span className="text-xs text-amber-700">
              Map these variants to see your complete roast schedule
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
