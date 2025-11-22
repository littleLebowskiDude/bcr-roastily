import { NextResponse } from "next/server";
import { createCoffee, fetchSettingsSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim().length > 0 ? body.name.trim() : null;
  const roastLossPercentage =
    typeof body.roastLossPercentage === "number"
      ? body.roastLossPercentage
      : Number(body.roastLossPercentage);
  const costPerKg =
    typeof body.costPerKg === "number" ? body.costPerKg : Number(body.costPerKg ?? "");

  if (!name || Number.isNaN(roastLossPercentage)) {
    return NextResponse.json(
      { error: "Name and roastLossPercentage are required" },
      { status: 400 },
    );
  }

  await createCoffee({
    name,
    roastLossPercentage,
    costPerKg: Number.isNaN(costPerKg) ? undefined : costPerKg,
  });

  const settings = await fetchSettingsSnapshot();
  return NextResponse.json({ settings }, { status: 201 });
}
