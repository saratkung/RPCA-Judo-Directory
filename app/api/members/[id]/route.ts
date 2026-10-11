import { NextResponse } from "next/server";
import { getPublicMemberById, SheetsUnavailableError } from "@/lib/members-service";
import { isValidMemberId } from "@/lib/validate";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidMemberId(id)) {
    return NextResponse.json({ error: "รหัสสมาชิกไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const member = await getPublicMemberById(id);
    if (!member) {
      return NextResponse.json({ error: "ไม่พบสมาชิก" }, { status: 404 });
    }
    return NextResponse.json({ member });
  } catch (error) {
    if (error instanceof SheetsUnavailableError) {
      console.error("[api/members/:id]", error.message);
    } else {
      console.error("[api/members/:id] unexpected error", error);
    }
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลสมาชิกได้ในขณะนี้" }, { status: 503 });
  }
}
