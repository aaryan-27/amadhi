import { NextResponse } from "next/server";

// Disabled placeholder — bulk import is handled by
// scripts/import-master-data.mjs. Safe to delete this file.
export async function GET() {
  return NextResponse.json({ error: "gone" }, { status: 410 });
}
