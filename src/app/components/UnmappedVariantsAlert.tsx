"use client";

import { groupUnmappedVariants, type UnmappedOrderItem } from "@/lib/unmapped";

type Props = {
  unmappedItems: UnmappedOrderItem[];
};

export function UnmappedVariantsAlert({ unmappedItems }: Props) {
  if (unmappedItems.length === 0) return null;

  const uniqueVariants = groupUnmappedVariants(unmappedItems);

  return (
    <div id="unmapped-variants" className="animate-slide-up rounded-2xl border-2 border-roast-300 bg-gradient-to-br from-roast-50 to-roast-100 p-6 shadow-warm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-roast-200">
          <svg
            className="h-6 w-6 text-roast-700"
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
          <h3 className="font-display text-xl tracking-wide text-roast-900">UNMAPPED VARIANTS DETECTED</h3>
          <p className="mt-2 text-sm text-roast-700">
            Your roast schedule is incomplete because {unmappedItems.length} item
            {unmappedItems.length !== 1 ? "s" : ""} across {uniqueVariants.length} variant
            {uniqueVariants.length !== 1 ? "s need" : " needs"} to be mapped to coffees or blends.
          </p>

          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-roast-800">Unmapped variants:</p>
            <div className="max-h-48 space-y-3 overflow-y-auto rounded-xl border border-roast-200 bg-white p-4">
              {uniqueVariants.map((item) => (
                <div
                  key={item.variantId}
                  className="border-b border-roast-100 pb-3 last:border-0 last:pb-0"
                >
                  <p className="font-semibold text-espresso-900">{item.productName}</p>
                  <p className="mt-1 font-mono text-xs text-espresso-500">Variant ID: {item.variantId}</p>
                  <p className="mt-1 text-sm text-espresso-600">
                    Appears in {item.orders.length} order{item.orders.length !== 1 ? "s" : ""} ·{" "}
                    {item.totalQuantity} item{item.totalQuantity !== 1 ? "s" : ""} total
                  </p>
                  <p className="mt-0.5 text-xs text-espresso-400">
                    Orders: {item.orders.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href="/settings"
              className="inline-flex items-center gap-2 rounded-lg bg-roast-600 px-5 py-2.5 text-sm font-semibold text-white shadow-warm transition-warm hover:bg-roast-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Map Variants
            </a>
            <span className="text-sm text-roast-600">
              Map these variants to see your complete roast schedule
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
