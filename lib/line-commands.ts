import { searchMembersForChat } from "@/lib/members-service";
import { sanitizeText } from "@/lib/validate";
import { getAppUrl } from "@/lib/env";
import type { PublicMember } from "@/lib/types";
import type { LineTextMessage } from "@/lib/line";

const CHAT_RESULT_LIMIT = 5;

const HELP_TEXT = [
  "คำสั่งที่ใช้ได้:",
  "• \"ทำเนียบสมาชิก\" — เปิดเว็บไซต์ทำเนียบ",
  "• \"ค้นหา [ชื่อหรือชื่อเล่น]\" — ค้นหาสมาชิก เช่น ค้นหา สมชาย",
  "• \"รุ่น [หมายเลขรุ่น]\" — ดูสมาชิกในรุ่นนั้น เช่น รุ่น 78",
  "• \"ช่วยเหลือ\" — แสดงคำสั่งทั้งหมด",
].join("\n");

function formatMemberLine(member: PublicMember, appUrl: string): string {
  const parts = [member.rank, member.fullName].filter(Boolean).join(" ");
  const nickname = member.nickname ? ` (${member.nickname})` : "";
  const generation = member.generation ? ` รุ่น ${member.generation}` : "";
  const position = member.clubPosition ? ` — ${member.clubPosition}` : "";
  const link = `${appUrl}/members/${encodeURIComponent(member.memberId)}`;
  return `${parts}${nickname}${generation}${position}\n${link}`;
}

async function formatSearchReply(
  filters: { query?: string; generation?: string },
  appUrl: string,
  emptyMessage: string
): Promise<string> {
  const { results, totalMatches } = await searchMembersForChat(filters, CHAT_RESULT_LIMIT);

  if (totalMatches === 0) {
    return emptyMessage;
  }

  const lines = results.map((member) => formatMemberLine(member, appUrl));

  if (totalMatches > results.length) {
    lines.push(`พบทั้งหมด ${totalMatches} คน แสดง ${results.length} รายการแรก กรุณาระบุชื่อให้เจาะจงขึ้น`);
  }

  return lines.join("\n\n");
}

/**
 * Parses one incoming text message into a reply. Returns null when the
 * message does not match any known command — the webhook route should
 * not reply at all in that case (avoids spamming unrelated chat).
 */
export async function buildReplyForText(rawText: string): Promise<LineTextMessage[] | null> {
  const text = sanitizeText(rawText, 200);
  const appUrl = getAppUrl();

  if (text === "ทำเนียบสมาชิก") {
    return [{ type: "text", text: `ทำเนียบสมาชิกชมรมยูโด:\n${appUrl}` }];
  }

  if (text === "ช่วยเหลือ") {
    return [{ type: "text", text: HELP_TEXT }];
  }

  if (text === "ค้นหา") {
    return [{ type: "text", text: "กรุณาพิมพ์ชื่อหรือชื่อเล่นที่ต้องการค้นหา เช่น ค้นหา สมชาย" }];
  }

  const searchMatch = text.match(/^ค้นหา\s+(.+)$/u);
  if (searchMatch) {
    const query = sanitizeText(searchMatch[1], 100);
    if (!query) {
      return [{ type: "text", text: "กรุณาพิมพ์ชื่อหรือชื่อเล่นที่ต้องการค้นหา เช่น ค้นหา สมชาย" }];
    }
    const reply = await formatSearchReply(
      { query },
      appUrl,
      `ไม่พบสมาชิกที่ตรงกับ "${query}"`
    );
    return [{ type: "text", text: reply }];
  }

  if (text === "รุ่น") {
    return [{ type: "text", text: "กรุณาระบุหมายเลขรุ่น เช่น รุ่น 78" }];
  }

  const generationMatch = text.match(/^รุ่น\s+(.+)$/u);
  if (generationMatch) {
    const generation = sanitizeText(generationMatch[1], 50);
    if (!generation) {
      return [{ type: "text", text: "กรุณาระบุหมายเลขรุ่น เช่น รุ่น 78" }];
    }
    const reply = await formatSearchReply(
      { generation },
      appUrl,
      `ไม่พบสมาชิกรุ่น ${generation}`
    );
    return [{ type: "text", text: reply }];
  }

  return null;
}
