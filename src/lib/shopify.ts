import "server-only";

type ShopifyCustomer = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  default_address?: {
    first_name?: string | null;
    last_name?: string | null;
    name?: string | null;
    company?: string | null;
  } | null;
};

type ShopifyAddress = {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
};

type ShopifyLineItem = {
  quantity: number;
  variant_id: number;
  title: string;
  variant_title?: string | null;
  grams: number;
};

type ShopifyOrder = {
  id: number;
  name: string;
  created_at: string;
  current_total_price: string;
  currency: string;
  customer?: ShopifyCustomer | null;
  line_items: ShopifyLineItem[];
  financial_status?: string | null;
  fulfillment_status?: string | null;
  billing_address?: ShopifyAddress | null;
  shipping_address?: ShopifyAddress | null;
};

export type ShopifyOrderSummary = {
  id: number;
  name: string;
  createdAt: string;
  customerName: string;
  email?: string;
  totalPrice: string;
  currency: string;
  lineItemCount: number;
  financialStatus?: string;
  lineItems: {
    variantId: number;
    productName: string;
    sizeG: number;
    quantity: number;
    grindType: string;
  }[];
};

export type ShopifyFetchResult = {
  orders: ShopifyOrderSummary[];
  error?: string;
  status?: number;
};

const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
const accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
const apiVersion = process.env.SHOPIFY_API_VERSION ?? "2024-07";

const formatCustomerName = (order: ShopifyOrder) => {
  const { customer, billing_address, shipping_address } = order;

  // Try customer record
  if (customer) {
    const names = [customer.first_name, customer.last_name].filter(Boolean);
    if (names.length) return names.join(" ");
  }

  // Try customer's default address
  if (customer?.default_address) {
    const names = [customer.default_address.first_name, customer.default_address.last_name].filter(Boolean);
    if (names.length) return names.join(" ");
    if (customer.default_address.name) return customer.default_address.name;
  }

  // Try billing address
  if (billing_address) {
    const names = [billing_address.first_name, billing_address.last_name].filter(Boolean);
    if (names.length) return names.join(" ");
    if (billing_address.name) return billing_address.name;
  }

  // Try shipping address
  if (shipping_address) {
    const names = [shipping_address.first_name, shipping_address.last_name].filter(Boolean);
    if (names.length) return names.join(" ");
    if (shipping_address.name) return shipping_address.name;
  }

  // Fall back to company name if available
  if (customer?.default_address?.company) return customer.default_address.company;

  // Fall back to email if available
  if (customer?.email) return customer.email;

  return "Guest checkout";
};

export async function fetchUnfulfilledOrders(): Promise<ShopifyFetchResult> {
  if (!storeDomain || !accessToken) {
    return {
      orders: [],
      error:
        "Missing Shopify configuration. Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_API_ACCESS_TOKEN.",
      status: 500,
    };
  }

  const query = new URLSearchParams({
    status: "open",
    fulfillment_status: "unfulfilled",
    limit: "250",
    order: "created_at desc",
  });

  const endpoint = `https://${storeDomain}/admin/api/${apiVersion}/orders.json?${query.toString()}`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        orders: [],
        error: `Shopify responded with ${response.status}: ${body || response.statusText
          }`,
        status: response.status,
      };
    }

    const payload = (await response.json()) as { orders: ShopifyOrder[] };

    const orders: ShopifyOrderSummary[] = (payload.orders || [])
      .filter((order) => order.fulfillment_status === null || order.fulfillment_status === "partial")
      .map((order) => ({
        id: order.id,
        name: order.name,
        createdAt: order.created_at,
        customerName: formatCustomerName(order),
        email: order.customer?.email ?? undefined,
        totalPrice: order.current_total_price,
        currency: order.currency,
        lineItemCount: order.line_items.reduce(
          (count, item) => count + item.quantity,
          0,
        ),
        financialStatus: order.financial_status ?? undefined,
        lineItems: order.line_items.map((item) => ({
          variantId: item.variant_id,
          productName: `${item.title}${item.variant_title ? ` - ${item.variant_title}` : ""}`,
          sizeG: item.grams || 0,
          quantity: item.quantity,
          grindType: item.variant_title ?? "Whole bean",
        })),
      }));

    return { orders };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Shopify API error";
    return { orders: [], error: message, status: 500 };
  }
}
