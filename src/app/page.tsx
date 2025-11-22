import { fetchUnfulfilledOrders } from "@/lib/shopify";

export const revalidate = 0;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatCurrency = (value: string, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value || 0));

export default async function Home() {
  const result = await fetchUnfulfilledOrders();
  const orders = result.orders ?? [];
  const error = result.error;

  const currency = orders[0]?.currency ?? "USD";
  const totalValue = orders.reduce(
    (sum, order) => sum + Number(order.totalPrice || 0),
    0,
  );
  const totalLineItems = orders.reduce(
    (sum, order) => sum + order.lineItemCount,
    0,
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-10 flex flex-col gap-3 border-b border-slate-200 pb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">
            Roast flow
          </p>
          <h1 className="text-4xl font-semibold text-slate-900">
            Shopify open orders
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            A minimal dashboard that pulls unfulfilled Shopify orders via the
            Admin API. Wire this into your roast planning to know exactly how
            many drops to prep today.
          </p>
        </header>

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            <p className="font-semibold">Shopify connection error</p>
            <p>{error}</p>
          </div>
        ) : (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm text-slate-500">Open orders</p>
                <p className="text-3xl font-semibold text-slate-900">
                  {orders.length}
                </p>
                <p className="text-xs text-slate-500">
                  Unfulfilled & status=open
                </p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm text-slate-500">Line items to roast</p>
                <p className="text-3xl font-semibold text-slate-900">
                  {totalLineItems}
                </p>
                <p className="text-xs text-slate-500">
                  Sum of quantities across open orders
                </p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm text-slate-500">Order value</p>
                <p className="text-3xl font-semibold text-slate-900">
                  {formatCurrency(totalValue.toString(), currency)}
                </p>
                <p className="text-xs text-slate-500">Current total price</p>
              </div>
            </section>

            <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Unfulfilled orders
                  </p>
                  <p className="text-xs text-slate-500">
                    Live pull from Shopify Admin API
                  </p>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {orders.length} open
                </div>
              </div>

              {orders.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-slate-500">
                  No open orders found.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <article
                      key={order.id}
                      className="grid gap-4 px-6 py-5 md:grid-cols-[1.3fr_1.2fr_1fr]"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {order.name}
                          </span>
                          {order.financialStatus ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                              {order.financialStatus}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-slate-500">
                          Placed {formatDate(order.createdAt)}
                        </p>
                      </div>

                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-slate-900">
                          {order.customerName}
                        </p>
                        {order.email ? (
                          <p className="text-slate-500">{order.email}</p>
                        ) : null}
                        <p className="text-slate-500">
                          Items: {order.lineItemCount}
                        </p>
                      </div>

                      <div className="flex flex-col items-start gap-1 text-right md:items-end">
                        <p className="text-lg font-semibold text-slate-900">
                          {formatCurrency(order.totalPrice, order.currency)}
                        </p>
                        <p className="text-xs text-slate-500">ID: {order.id}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
