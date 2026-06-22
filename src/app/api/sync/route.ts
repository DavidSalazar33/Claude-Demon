import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await runSync();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("Sync failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
