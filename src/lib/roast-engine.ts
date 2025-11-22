import { BATCH_SIZE_G } from "./constants";
import type {
  BaggingLine,
  Blend,
  BlendBucket,
  Coffee,
  OnHandStock,
  Order,
  PickListLine,
  RoastComputation,
  RoastResult,
} from "./types";

const bucketKey = (type: "coffee" | "blend", id: string) => `${type}:${id}`;

type EngineInput = {
  coffees: Coffee[];
  blends: Blend[];
  orders: Order[];
  onHand: OnHandStock[];
};

type CoffeeMap = Map<string, Coffee>;
type BlendMap = Map<string, Blend>;

const toCoffeeMap = (coffees: Coffee[]): CoffeeMap =>
  coffees.reduce((map, coffee) => map.set(coffee.id, coffee), new Map<string, Coffee>());

const toBlendMap = (blends: Blend[]): BlendMap =>
  blends.reduce((map, blend) => map.set(blend.id, blend), new Map<string, Blend>());

export function calculateRoastPlan(input: EngineInput): RoastComputation {
  const coffeeMap = toCoffeeMap(input.coffees);
  const blendMap = toBlendMap(input.blends);
  const onHandMap = new Map<string, number>();
  input.onHand.forEach((entry) =>
    onHandMap.set(bucketKey(entry.bucketType, entry.bucketId), entry.onHandRoastedG),
  );

  const coffeeNeeds = new Map<string, { roasted: number; blendId?: string }>();
  const blendBuckets = new Map<string, BlendBucket>();
  const baggingLines = new Map<string, BaggingLine>();
  const pickList: PickListLine[] = [];

  const activeOrders = input.orders.filter((order) => order.status !== "skipped");

  const consumeOnHand = (type: "coffee" | "blend", id: string, required: number) => {
    const key = bucketKey(type, id);
    const available = onHandMap.get(key) ?? 0;
    const used = Math.min(available, required);
    const remaining = required - used;
    onHandMap.set(key, Math.max(0, available - used));
    return remaining;
  };

  activeOrders.forEach((order) => {
    order.items.forEach((item) => {
      const neededRoasted = item.sizeG * item.quantity;
      pickList.push({
        orderId: order.id,
        orderName: order.sourceOrderId,
        itemLabel: item.productName,
        quantity: item.quantity,
        sizeG: item.sizeG,
        grindType: item.grindType,
      });

      const baggingKey = `${item.productName}-${item.sizeG}-${item.grindType}`;
      const bagging = baggingLines.get(baggingKey) ?? {
        key: baggingKey,
        label: item.productName,
        sizeG: item.sizeG,
        grindType: item.grindType,
        quantity: 0,
        totalRoastedG: 0,
      };
      bagging.quantity += item.quantity;
      bagging.totalRoastedG += neededRoasted;
      baggingLines.set(baggingKey, bagging);

      if (item.mappedIsBlend) {
        const blend = blendMap.get(item.mappedCoffeeId);
        if (!blend) return;
        const afterBlendOnHand = consumeOnHand("blend", blend.id, neededRoasted);
        if (afterBlendOnHand <= 0) return;
        blend.components.forEach((component) => {
          const componentRoasted = afterBlendOnHand * (component.percentage / 100);
          const afterOnHand = consumeOnHand("coffee", component.coffeeId, componentRoasted);
          if (afterOnHand <= 0) return;
          const current = coffeeNeeds.get(component.coffeeId);
          coffeeNeeds.set(component.coffeeId, {
            roasted: (current?.roasted ?? 0) + afterOnHand,
            blendId: blend.id,
          });
          const blendBucket = blendBuckets.get(blend.id) ?? {
            blendId: blend.id,
            blendName: blend.name,
            requiredRoastedG: 0,
            actualRoastedG: 0,
            surplusG: 0,
          };
          blendBucket.requiredRoastedG += componentRoasted;
          blendBuckets.set(blend.id, blendBucket);
        });
      } else {
        const afterOnHand = consumeOnHand("coffee", item.mappedCoffeeId, neededRoasted);
        if (afterOnHand <= 0) return;
        const current = coffeeNeeds.get(item.mappedCoffeeId);
        coffeeNeeds.set(item.mappedCoffeeId, {
          roasted: (current?.roasted ?? 0) + afterOnHand,
        });
      }
    });
  });

  const results: RoastResult[] = [];
  let totalRoastedRequiredG = 0;
  let totalGreenRequiredG = 0;
  let totalDrops = 0;

  coffeeNeeds.forEach(({ roasted, blendId }, coffeeId) => {
    const coffee = coffeeMap.get(coffeeId);
    if (!coffee) return;
    const roastLoss = coffee.roastLossPercentage / 100;
    const greenRequired = roasted / (1 - roastLoss);
    const drops = Math.ceil(greenRequired / BATCH_SIZE_G);
    const totalGreen = drops * BATCH_SIZE_G;
    const expectedRoasted = totalGreen * (1 - roastLoss);
    const surplus = expectedRoasted - roasted;

    const blend = blendId ? blendMap.get(blendId) : undefined;
    const result: RoastResult = {
      coffeeId,
      coffeeName: coffee.name,
      blendId,
      blendName: blend?.name,
      roastedNeededG: roasted,
      roastLossPercentage: coffee.roastLossPercentage,
      greenRequiredG: greenRequired,
      dropsRequired: drops,
      totalGreenG: totalGreen,
      expectedRoastedG: expectedRoasted,
      surplusG: surplus,
    };
    results.push(result);

    const targetBucketKey = blendId ? bucketKey("blend", blendId) : bucketKey("coffee", coffeeId);
    const current = onHandMap.get(targetBucketKey) ?? 0;
    onHandMap.set(targetBucketKey, current + surplus);

    if (blendId) {
      const blendBucket = blendBuckets.get(blendId);
      if (blendBucket) {
        blendBucket.actualRoastedG += expectedRoasted;
        blendBucket.surplusG = blendBucket.actualRoastedG - blendBucket.requiredRoastedG;
        blendBuckets.set(blendId, blendBucket);
      }
    }

    totalRoastedRequiredG += roasted;
    totalGreenRequiredG += greenRequired;
    totalDrops += drops;
  });

  const updatedOnHand: OnHandStock[] = Array.from(onHandMap.entries()).map(
    ([key, value]) => {
      const [bucketType, bucketId] = key.split(":") as ["coffee" | "blend", string];
      return { bucketType, bucketId, onHandRoastedG: value };
    },
  );

  return {
    results: results.sort((a, b) => a.coffeeName.localeCompare(b.coffeeName)),
    blendBuckets: Array.from(blendBuckets.values()),
    onHand: updatedOnHand,
    bagging: Array.from(baggingLines.values()),
    pickList,
    totals: {
      roastedRequiredG: totalRoastedRequiredG,
      greenRequiredG: totalGreenRequiredG,
      drops: totalDrops,
    },
  };
}
