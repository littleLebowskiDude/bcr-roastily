import { fetchVariantMappings } from "./repository";
import type { Order, OrderItem } from "./types";
import type { ShopifyOrderSummary } from "./shopify";

const normalizeVariantId = (value: string | number | null | undefined) => {
  const raw = String(value ?? "");
  const gidMatch = raw.split("/").filter(Boolean).pop();
  return gidMatch ?? raw;
};

export async function mapShopifyOrdersToInternal(
  shopifyOrders: ShopifyOrderSummary[],
): Promise<Order[]> {
  const mappings = await fetchVariantMappings();
  return shopifyOrders.map((order) => {
    const orderId = `shopify_${order.id}`;
    const items: OrderItem[] = order.lineItems.map((line, index) => {
      const variantId = String(line.variantId);
      const normalizedVariantId = normalizeVariantId(variantId);
      const mapping = mappings.find((item) => {
        const normalizedMappingId = normalizeVariantId(item.variantId);
        return item.variantId === variantId || normalizedMappingId === normalizedVariantId;
      });
      return {
        id: `shopify_${order.id}_${line.variantId}_${index}`,
        variantId: String(line.variantId),
        productName: line.productName,
        sizeG: line.sizeG || mapping?.sizeG || 0,
        grindType: line.grindType,
        quantity: line.quantity,
        mappedCoffeeId: mapping?.coffeeId ?? "unknown",
        mappedIsBlend: mapping?.isBlend ?? false,
      };
    });

    return {
      id: orderId,
      source: "shopify",
      sourceOrderId: order.name,
      customerName: order.customerName,
      status: "included",
      createdAt: order.createdAt,
      updatedAt: order.createdAt,
      items,
    };
  });
}
