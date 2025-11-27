import "server-only";

type ShopifyCustomer = {
  id?: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  default_address?: ShopifyAddress | null;
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
  billing_address?: ShopifyAddress | null;
  shipping_address?: ShopifyAddress | null;
  line_items: ShopifyLineItem[];
  financial_status?: string | null;
  fulfillment_status?: string | null;
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

const formatAddressName = (address?: ShopifyAddress | null) => {
  if (!address) return null;
  if (address.name?.trim()) return address.name.trim();
  const parts = [address.first_name, address.last_name]
    .filter(Boolean)
    .map((part) => part!.trim())
    .filter(Boolean);
  return parts.length ? parts.join(" ") : null;
};

const formatCustomerName = (order: ShopifyOrder) => {
  const customer = order.customer;
  const names = [customer?.first_name, customer?.last_name]
    .filter(Boolean)
    .map((part) => part!.trim())
    .filter(Boolean);
  if (names.length) return names.join(" ");

  const customerDefaultName = formatAddressName(customer?.default_address);
  if (customerDefaultName) return customerDefaultName;

  const shippingName = formatAddressName(order.shipping_address);
  if (shippingName) return shippingName;

  const billingName = formatAddressName(order.billing_address);
  if (billingName) return billingName;

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
    fields:
      "id,name,created_at,current_total_price,currency,customer,billing_address,shipping_address,line_items,financial_status,fulfillment_status",
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
