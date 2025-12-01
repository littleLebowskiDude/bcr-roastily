"use server";

import { syncOrdersFromShopify } from "@/lib/roast-sessions";
import { revalidatePath } from "next/cache";

export async function syncOrders() {
    const result = await syncOrdersFromShopify();
    revalidatePath("/");
    return result;
}
