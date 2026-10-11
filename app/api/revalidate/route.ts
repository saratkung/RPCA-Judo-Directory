import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { MEMBERS_CACHE_TAG } from "@/lib/sheets";
import { isRateLimited } from "@/lib/rate-limit";

/**
 * Backs the "refresh" button on the directory page. Read-only (it only
 * forces the next read to go back to Google Sheets) but still rate
 * limited per IP to avoid someone scripting repeated calls.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(`revalidate:${ip}`, 6, 60_000)) {
    return NextResponse.json(
      { error: "กรุณารอสักครู่ก่อนรีเฟรชอีกครั้ง" },
      { status: 429 }
    );
  }

  // { expire: 0 } forces immediate expiration regardless of the normal
  // 45s window — this endpoint exists specifically for "refresh now".
  revalidateTag(MEMBERS_CACHE_TAG, { expire: 0 });
  return NextResponse.json({ ok: true });
}
