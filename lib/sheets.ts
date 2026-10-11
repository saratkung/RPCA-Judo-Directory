import crypto from "crypto";
import { JWT } from "google-auth-library";
import { getSheetsConfig } from "@/lib/env";
import type { MemberRow } from "@/lib/types";

export const MEMBERS_CACHE_TAG = "members";
export const MEMBERS_REVALIDATE_SECONDS = 45;

export class SheetsUnavailableError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "SheetsUnavailableError";
  }
}

let cachedClient: { client: JWT; email: string } | null = null;

function getAuthClient(email: string, privateKey: string): JWT {
  if (cachedClient && cachedClient.email === email) {
    return cachedClient.client;
  }
  const client = new JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  cachedClient = { client, email };
  return client;
}

/**
 * Reads the raw rows (including the header row) from the configured
 * Google Sheet. Returns `null` when Google Sheets is not configured so
 * callers can fall back to sample data instead of failing.
 */
export async function fetchMemberRows(): Promise<MemberRow[] | null> {
  const config = getSheetsConfig();
  if (!config) return null;

  const client = getAuthClient(config.serviceAccountEmail, config.privateKey);

  let accessToken: string | null | undefined;
  try {
    const tokenResponse = await client.authorize();
    accessToken = tokenResponse.access_token;
  } catch (error) {
    throw new SheetsUnavailableError(
      "ไม่สามารถยืนยันตัวตนกับ Google Sheets ได้ กรุณาตรวจสอบ Service Account",
      error
    );
  }

  if (!accessToken) {
    throw new SheetsUnavailableError("ไม่ได้รับ Access Token จาก Google");
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(
    config.range
  )}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      // Next.js caches this fetch and shares it across requests; the
      // manual "refresh" button revalidates the MEMBERS_CACHE_TAG.
      next: {
        revalidate: MEMBERS_REVALIDATE_SECONDS,
        tags: [MEMBERS_CACHE_TAG],
      },
    });
  } catch (error) {
    throw new SheetsUnavailableError("ไม่สามารถเชื่อมต่อ Google Sheets API ได้", error);
  }

  if (!response.ok) {
    throw new SheetsUnavailableError(`Google Sheets API ตอบกลับผิดพลาด (HTTP ${response.status})`);
  }

  const data = (await response.json()) as { values?: unknown[][] };
  const rows = data.values ?? [];
  if (rows.length === 0) return [];

  return parseRows(rows);
}

const COLUMN_ALIASES: Record<string, keyof MemberRow> = {
  member_id: "member_id",
  full_name: "full_name",
  rank: "rank",
  nickname: "nickname",
  generation: "generation",
  club_position: "club_position",
  phone: "phone",
  photo_url: "photo_url",
  // Thai headers used by the club's existing roster sheet.
  รหัสสมาชิก: "member_id",
  "ชื่อ-สกุล": "full_name",
  "ชื่อ - สกุล": "full_name",
  ชื่อนามสกุล: "full_name",
  ยศ: "rank",
  รุ่น: "generation",
  ชื่อเล่น: "nickname",
  ตำแหน่ง: "club_position",
  ตำแหน่งในชมรม: "club_position",
  เบอร์โทรศัพท์: "phone",
  เบอร์โทร: "phone",
  รูปภาพ: "photo_url",
  รูป: "photo_url",
};

/**
 * Maps columns by header name (case-insensitive for Latin headers) so
 * that adding new columns in the future does not break parsing.
 *
 * The club's existing roster sheet has a merged "ยศ ชื่อ - สกุล" (rank /
 * first name / last name) header cell. The Sheets API only returns that
 * label on the merge's first column — the next two columns read back
 * with an empty header — so that specific 3-column pattern is detected
 * positionally and combined into rank + full_name.
 */
function parseRows(rows: unknown[][]): MemberRow[] {
  const [headerRow, ...dataRows] = rows;
  const header = (headerRow ?? []).map((cell) => String(cell ?? "").trim());

  const columnIndex: Partial<Record<keyof MemberRow, number>> = {};
  header.forEach((name, index) => {
    const key = COLUMN_ALIASES[name.toLowerCase()] ?? COLUMN_ALIASES[name];
    if (key && columnIndex[key] === undefined) {
      columnIndex[key] = index;
    }
  });

  let compositeNameIndices: { first: number; last: number } | null = null;
  if (columnIndex.full_name === undefined) {
    const rankLabelIndex = header.findIndex((h) => h.startsWith("ยศ"));
    if (rankLabelIndex !== -1 && header[rankLabelIndex + 1] === "" && header[rankLabelIndex + 2] === "") {
      if (columnIndex.rank === undefined) columnIndex.rank = rankLabelIndex;
      compositeNameIndices = { first: rankLabelIndex + 1, last: rankLabelIndex + 2 };
    }
  }

  // Only true when no member_id column exists at all — a blank cell in
  // an existing member_id column is left blank on purpose so
  // members-service can warn the admin instead of silently papering
  // over it.
  const hasMemberIdColumn = columnIndex.member_id !== undefined;

  const cell = (row: unknown[], key: keyof MemberRow): string => {
    const index = columnIndex[key];
    if (index === undefined) return "";
    const value = row[index];
    if (value === undefined || value === null) return "";
    return String(value).trim();
  };

  return dataRows
    .filter((row) => row.some((value) => String(value ?? "").trim() !== ""))
    .map((row) => {
      const generation = cell(row, "generation");
      const rank = cell(row, "rank");

      let fullName = cell(row, "full_name");
      if (!fullName && compositeNameIndices) {
        const first = String(row[compositeNameIndices.first] ?? "").trim();
        const last = String(row[compositeNameIndices.last] ?? "").trim();
        fullName = [first, last].filter(Boolean).join(" ");
      }

      let memberId = cell(row, "member_id");
      if (!memberId && !hasMemberIdColumn) {
        memberId = deriveMemberId({ generation, rank, fullName });
      }

      return {
        member_id: memberId,
        full_name: fullName,
        rank,
        nickname: cell(row, "nickname"),
        generation,
        club_position: cell(row, "club_position"),
        phone: cell(row, "phone"),
        photo_url: cell(row, "photo_url"),
      };
    });
}

/**
 * Stable fallback id for sheets with no member_id column at all. Derived
 * from fields that rarely change, so the same person keeps the same
 * profile URL across reads instead of a new id being minted every time.
 */
function deriveMemberId(fields: { generation: string; rank: string; fullName: string }): string {
  const key = `${fields.generation}|${fields.rank}|${fields.fullName}`.trim();
  const hash = crypto.createHash("sha1").update(key).digest("hex").slice(0, 10);
  return `M${hash}`;
}
