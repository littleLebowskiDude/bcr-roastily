import crypto from "node:crypto";
import { listVariantMappings } from "./store";
import type { Order, OrderItem } from "./types";
import type { ShopifyOrderSummary } from "./shopify";

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export function mapShopifyOrdersToInternal(
  shopifyOrders: ShopifyOrderSummary[],
): Order[] {
  const mappings = listVariantMappings();
  return shopifyOrders.map((order) => {
    const items: OrderItem[] = order.lineItems.map((line, index) => {
      const mapping = mappings.find(
        (item) => item.variantId === String(line.variantId),
      );
      return {
        id: `${order.id}_${index}`,
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
      id: makeId("order"),
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
