import { fetchVariantMappings } from "./repository";
import type { Order, OrderItem } from "./types";
import type { ShopifyOrderSummary } from "./shopify";

export async function mapShopifyOrdersToInternal(
  shopifyOrders: ShopifyOrderSummary[],
): Promise<Order[]> {
  const mappings = await fetchVariantMappings();
  return shopifyOrders.map((order) => {
    const orderId = `shopify_${order.id}`;
    const items: OrderItem[] = order.lineItems.map((line, index) => {
      const mapping = mappings.find(
        (item) => item.variantId === String(line.variantId),
      );
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
