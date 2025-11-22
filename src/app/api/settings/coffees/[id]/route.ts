import { NextResponse } from "next/server";
import { archiveCoffee, fetchSettingsSnapshot, updateCoffee } from "@/lib/repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function PUT(request: Request, context: RouteContext) {
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

  await updateCoffee(context.params.id, {
    name,
    roastLossPercentage,
    costPerKg: Number.isNaN(costPerKg) ? undefined : costPerKg,
  });

  const settings = await fetchSettingsSnapshot();
  return NextResponse.json({ settings });
}

export async function DELETE(_request: Request, context: RouteContext) {
  await archiveCoffee(context.params.id);
  const settings = await fetchSettingsSnapshot();
  return NextResponse.json({ settings });
}
