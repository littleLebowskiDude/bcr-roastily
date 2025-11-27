import type { Order } from "./types";

export type UnmappedOrderItem = {
  orderId: string;
  orderName: string;
  variantId: string;
  productName: string;
  quantity: number;
  mappedCoffeeId?: string;
};

export function collectUnmappedOrderItems(orders: Order[]): UnmappedOrderItem[] {
  return orders.flatMap((order) =>
    order.items
      .filter((item) => item.mappedCoffeeId === "unknown" || !item.mappedCoffeeId)
      .map((item) => ({
        orderId: order.id,
        orderName: order.sourceOrderId,
        variantId: item.variantId,
        productName: item.productName,
        quantity: item.quantity,
        mappedCoffeeId: item.mappedCoffeeId,
      })),
  );
}

export function groupUnmappedVariants(unmappedItems: UnmappedOrderItem[]) {
  const grouped = new Map<
    string,
    { variantId: string; productName: string; totalQuantity: number; orders: Set<string> }
  >();

  unmappedItems.forEach((item) => {
    const existing =
      grouped.get(item.variantId) ??
      {
        variantId: item.variantId,
        productName: item.productName,
        totalQuantity: 0,
        orders: new Set<string>(),
      };

    existing.totalQuantity += item.quantity;
    existing.orders.add(item.orderName);
    grouped.set(item.variantId, existing);
  });

  return Array.from(grouped.values()).map((entry) => ({
    variantId: entry.variantId,
    productName: entry.productName,
    totalQuantity: entry.totalQuantity,
    orders: Array.from(entry.orders).sort(),
  }));
}
