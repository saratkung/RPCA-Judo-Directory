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
};

/**
 * Maps columns by header name rather than fixed position so that adding
 * new columns to the sheet in the future does not break parsing.
 */
function parseRows(rows: unknown[][]): MemberRow[] {
  const [headerRow, ...dataRows] = rows;
  const header = (headerRow ?? []).map((cell) => String(cell ?? "").trim().toLowerCase());

  const columnIndex: Partial<Record<keyof MemberRow, number>> = {};
  header.forEach((name, index) => {
    const key = COLUMN_ALIASES[name];
    if (key && columnIndex[key] === undefined) {
      columnIndex[key] = index;
    }
  });

  const cell = (row: unknown[], key: keyof MemberRow): string => {
    const index = columnIndex[key];
    if (index === undefined) return "";
    const value = row[index];
    if (value === undefined || value === null) return "";
    return String(value).trim();
  };

  return dataRows
    .filter((row) => row.some((value) => String(value ?? "").trim() !== ""))
    .map((row) => ({
      member_id: cell(row, "member_id"),
      full_name: cell(row, "full_name"),
      rank: cell(row, "rank"),
      nickname: cell(row, "nickname"),
      generation: cell(row, "generation"),
      club_position: cell(row, "club_position"),
      phone: cell(row, "phone"),
      photo_url: cell(row, "photo_url"),
    }));
}
