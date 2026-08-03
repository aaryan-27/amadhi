import { NextResponse } from "next/server";
import { searchService } from "@/lib/search";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  if (!rateLimit(`search:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const suggestions = await searchService.autocomplete(q);
  return NextResponse.json(
    { suggestions },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=120" } }
  );
}
