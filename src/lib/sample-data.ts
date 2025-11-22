import { BATCH_SIZE_G } from "./constants";
import type {
  BaggingLine,
  Blend,
  Coffee,
  OnHandStock,
  Order,
  VariantMapping,
} from "./types";

const now = () => new Date().toISOString();

export const sampleCoffees: Coffee[] = [
  {
    id: "coffee_brazil",
    name: "Brazil Serra Negra",
    roastLossPercentage: 18,
    costPerKg: 16.5,
    active: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "coffee_colombia",
    name: "Colombia Huila",
    roastLossPercentage: 16,
    costPerKg: 17.25,
    active: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "coffee_guatemala",
    name: "Guatemala Huehue",
    roastLossPercentage: 17.5,
    costPerKg: 17.8,
    active: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "coffee_honduras",
    name: "Honduras Comayagua",
    roastLossPercentage: 17,
    costPerKg: 16.9,
    active: true,
    createdAt: now(),
    updatedAt: now(),
  },
];

export const sampleBlends: Blend[] = [
  {
    id: "blend_smooth_criminal",
    name: "Smooth Criminal",
    components: [
      { coffeeId: "coffee_brazil", percentage: 40 },
      { coffeeId: "coffee_honduras", percentage: 30 },
      { coffeeId: "coffee_colombia", percentage: 30 },
    ],
    active: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "blend_weekend",
    name: "Weekender",
    components: [
      { coffeeId: "coffee_brazil", percentage: 50 },
      { coffeeId: "coffee_guatemala", percentage: 25 },
      { coffeeId: "coffee_colombia", percentage: 25 },
    ],
    active: true,
    createdAt: now(),
    updatedAt: now(),
  },
];

export const sampleVariantMappings: VariantMapping[] = [
  {
    variantId: "var_sc_250_whole",
    coffeeId: "blend_smooth_criminal",
    isBlend: true,
    sizeG: 250,
    grindType: "Whole bean",
  },
  {
    variantId: "var_sc_250_espresso",
    coffeeId: "blend_smooth_criminal",
    isBlend: true,
    sizeG: 250,
    grindType: "Espresso",
  },
  {
    variantId: "var_sc_1kg_whole",
    coffeeId: "blend_smooth_criminal",
    isBlend: true,
    sizeG: 1000,
    grindType: "Whole bean",
  },
  {
    variantId: "var_colombia_250_whole",
    coffeeId: "coffee_colombia",
    isBlend: false,
    sizeG: 250,
    grindType: "Whole bean",
  },
  {
    variantId: "var_brazil_1kg_espresso",
    coffeeId: "coffee_brazil",
    isBlend: false,
    sizeG: 1000,
    grindType: "Espresso",
  },
  {
    variantId: "var_weekend_1kg_whole",
    coffeeId: "blend_weekend",
    isBlend: true,
    sizeG: 1000,
    grindType: "Whole bean",
  },
];

export const initialOnHand: OnHandStock[] = [
  { bucketType: "coffee", bucketId: "coffee_brazil", onHandRoastedG: 1_600 },
  { bucketType: "coffee", bucketId: "coffee_colombia", onHandRoastedG: 800 },
  { bucketType: "coffee", bucketId: "coffee_guatemala", onHandRoastedG: 0 },
  { bucketType: "coffee", bucketId: "coffee_honduras", onHandRoastedG: 0 },
  { bucketType: "blend", bucketId: "blend_smooth_criminal", onHandRoastedG: 2_000 },
  { bucketType: "blend", bucketId: "blend_weekend", onHandRoastedG: 0 },
];

export const sampleOrders: Order[] = [
  {
    id: "order_1012",
    source: "shopify",
    sourceOrderId: "#1012",
    customerName: "John Smith",
    status: "included",
    createdAt: now(),
    updatedAt: now(),
    items: [
      {
        id: "item_1012_1",
        variantId: "var_sc_250_whole",
        productName: "Smooth Criminal Blend 250g",
        sizeG: 250,
        grindType: "Whole bean",
        quantity: 12,
        mappedCoffeeId: "blend_smooth_criminal",
        mappedIsBlend: true,
      },
      {
        id: "item_1012_2",
        variantId: "var_colombia_250_whole",
        productName: "Colombia Huila 250g",
        sizeG: 250,
        grindType: "Whole bean",
        quantity: 6,
        mappedCoffeeId: "coffee_colombia",
        mappedIsBlend: false,
      },
    ],
  },
  {
    id: "order_1013",
    source: "shopify",
    sourceOrderId: "#1013",
    customerName: "Sarah L",
    status: "included",
    createdAt: now(),
    updatedAt: now(),
    items: [
      {
        id: "item_1013_1",
        variantId: "var_sc_250_espresso",
        productName: "Smooth Criminal Blend 250g Espresso",
        sizeG: 250,
        grindType: "Espresso",
        quantity: 18,
        mappedCoffeeId: "blend_smooth_criminal",
        mappedIsBlend: true,
      },
      {
        id: "item_1013_2",
        variantId: "var_brazil_1kg_espresso",
        productName: "Brazil Serra Negra 1kg",
        sizeG: 1000,
        grindType: "Espresso",
        quantity: 3,
        mappedCoffeeId: "coffee_brazil",
        mappedIsBlend: false,
      },
    ],
  },
  {
    id: "order_1014",
    source: "shopify",
    sourceOrderId: "#1014",
    customerName: "Taylor Coffee",
    status: "included",
    createdAt: now(),
    updatedAt: now(),
    items: [
      {
        id: "item_1014_1",
        variantId: "var_weekend_1kg_whole",
        productName: "Weekender Blend 1kg",
        sizeG: 1000,
        grindType: "Whole bean",
        quantity: 4,
        mappedCoffeeId: "blend_weekend",
        mappedIsBlend: true,
      },
      {
        id: "item_1014_2",
        variantId: "var_colombia_250_whole",
        productName: "Colombia Huila 250g",
        sizeG: 250,
        grindType: "Whole bean",
        quantity: 4,
        mappedCoffeeId: "coffee_colombia",
        mappedIsBlend: false,
      },
    ],
  },
];

export const sampleBaggingLines: BaggingLine[] = [
  {
    key: "Smooth Criminal 250g Whole bean",
    label: "Smooth Criminal 250g Whole bean",
    sizeG: 250,
    grindType: "Whole bean",
    quantity: 12,
    totalRoastedG: 3_000,
  },
];

export const defaultBatchSizeG = BATCH_SIZE_G;
