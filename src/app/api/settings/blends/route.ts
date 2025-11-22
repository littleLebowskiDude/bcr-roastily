import { NextResponse } from "next/server";
import { createBlend, fetchSettingsSnapshot } from "@/lib/repository";
import type { BlendComponent } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim().length > 0 ? body.name.trim() : null;
  const components: BlendComponent[] = Array.isArray(body.components)
    ? body.components
        .map((comp: any) => ({
          coffeeId: String(comp.coffeeId ?? ""),
          percentage: Number(comp.percentage),
        }))
        .filter((comp) => comp.coffeeId && !Number.isNaN(comp.percentage) && comp.percentage > 0)
    : [];

  if (!name || !components.length) {
    return NextResponse.json(
      { error: "Name and at least one component are required" },
      { status: 400 },
    );
  }

  await createBlend({ name, components });
  const settings = await fetchSettingsSnapshot();
  return NextResponse.json({ settings }, { status: 201 });
}
