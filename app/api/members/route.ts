import { NextRequest, NextResponse } from "next/server";
import { getMembersResult, SheetsUnavailableError } from "@/lib/members-service";
import { sanitizeText } from "@/lib/validate";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = sanitizeText(searchParams.get("q"));
  const generation = sanitizeText(searchParams.get("generation"), 50);
  const position = sanitizeText(searchParams.get("position"), 100);

  try {
    const result = await getMembersResult({
      query: query || undefined,
      generation: generation || undefined,
      position: position || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SheetsUnavailableError) {
      console.error("[api/members]", error.message);
    } else {
      console.error("[api/members] unexpected error", error);
    }
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลสมาชิกได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง" },
      { status: 503 }
    );
  }
}
