export type Coffee = {
  id: string;
  name: string;
  roastLossPercentage: number;
  costPerKg?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BlendComponent = {
  coffeeId: string;
  percentage: number;
};

export type Blend = {
  id: string;
  name: string;
  components: BlendComponent[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VariantMapping = {
  variantId: string;
  coffeeId: string;
  isBlend: boolean;
  sizeG: number;
  grindType: string;
};

export type OrderItem = {
  id: string;
  variantId: string;
  productName: string;
  sizeG: number;
  grindType: string;
  quantity: number;
  mappedCoffeeId: string;
  mappedIsBlend: boolean;
};

export type Order = {
  id: string;
  roastSessionId?: string;
  source: "shopify" | "xero" | "manual";
  sourceOrderId: string;
  customerName: string;
  status: "imported" | "skipped" | "included";
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type OnHandStock = {
  bucketType: "coffee" | "blend";
  bucketId: string;
  onHandRoastedG: number;
};

export type RoastResult = {
  coffeeId: string;
  coffeeName: string;
  blendId?: string;
  blendName?: string;
  roastedNeededG: number;
  roastLossPercentage: number;
  greenRequiredG: number;
  dropsRequired: number;
  totalGreenG: number;
  expectedRoastedG: number;
  surplusG: number;
};

export type BlendBucket = {
  blendId: string;
  blendName: string;
  requiredRoastedG: number;
  actualRoastedG: number;
  surplusG: number;
};

export type BaggingLine = {
  key: string;
  label: string;
  sizeG: number;
  grindType: string;
  quantity: number;
  totalRoastedG: number;
};

export type PickListLine = {
  orderId: string;
  orderName: string;
  itemLabel: string;
  quantity: number;
  sizeG: number;
  grindType: string;
};

export type RoastComputation = {
  results: RoastResult[];
  blendBuckets: BlendBucket[];
  onHand: OnHandStock[];
  bagging: BaggingLine[];
  pickList: PickListLine[];
  totals: {
    roastedRequiredG: number;
    greenRequiredG: number;
    drops: number;
  };
};

export type RoastSession = {
  id: string;
  sessionDate: string;
  createdAt: string;
  updatedAt: string;
  orders: Order[];
  onHand: OnHandStock[];
  lastCalculatedAt?: string;
  computation?: RoastComputation;
};
