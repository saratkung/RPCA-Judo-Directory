import { unstable_cache } from "next/cache";
import { fetchMemberRows, MEMBERS_CACHE_TAG, MEMBERS_REVALIDATE_SECONDS, SheetsUnavailableError } from "@/lib/sheets";
import { sampleMemberRows } from "@/data/sample-members";
import type {
  DataSource,
  Member,
  MemberRow,
  MemberSearchFilters,
  MembersResult,
  PublicMember,
} from "@/lib/types";

export { SheetsUnavailableError };

function rowToMember(row: MemberRow): Member {
  return {
    memberId: row.member_id.trim(),
    fullName: row.full_name.trim(),
    rank: row.rank.trim(),
    nickname: row.nickname.trim(),
    generation: row.generation.trim(),
    clubPosition: row.club_position.trim(),
    phone: row.phone.trim(),
    photoUrl: row.photo_url.trim(),
  };
}

function toPublicMember(member: Member): PublicMember {
  const { phone, ...rest } = member;
  void phone;
  return rest;
}

/**
 * Drops rows without a member_id (and warns, rather than inventing a new
 * id — an id must stay stable across reads since it's used in URLs) and
 * keeps only the first row for any duplicated member_id.
 */
function dedupeAndValidate(rows: MemberRow[]): Member[] {
  const seen = new Set<string>();
  const members: Member[] = [];

  for (const row of rows) {
    const member = rowToMember(row);

    if (!member.memberId) {
      console.warn(
        `[members-service] ข้ามแถวที่ไม่มี member_id (full_name="${member.fullName || "ไม่ระบุ"}") — กรุณาเพิ่ม member_id ในชีต`
      );
      continue;
    }

    if (seen.has(member.memberId)) {
      console.warn(
        `[members-service] พบ member_id ซ้ำ: "${member.memberId}" — ใช้ข้อมูลแถวแรกที่พบเท่านั้น`
      );
      continue;
    }

    seen.add(member.memberId);
    members.push(member);
  }

  return members;
}

interface MembersSnapshot {
  members: Member[];
  source: DataSource;
  fetchedAt: string;
}

/**
 * Fetches + parses the member list and caches the result (together with
 * the timestamp of that fetch) for MEMBERS_REVALIDATE_SECONDS under
 * MEMBERS_CACHE_TAG. Caching the timestamp alongside the data — rather
 * than stamping `new Date()` on every request — is what lets the UI show
 * a "last updated" time that is honestly tied to when data was actually
 * read from Google Sheets, not when a visitor happened to load the page.
 * Errors are not cached, so the next request retries against Sheets.
 */
const getMembersSnapshot = unstable_cache(
  async (): Promise<MembersSnapshot> => {
    const rows = await fetchMemberRows();
    const fetchedAt = new Date().toISOString();
    if (rows === null) {
      return { members: dedupeAndValidate(sampleMemberRows), source: "sample", fetchedAt };
    }
    return { members: dedupeAndValidate(rows), source: "sheet", fetchedAt };
  },
  ["members-snapshot"],
  { revalidate: MEMBERS_REVALIDATE_SECONDS, tags: [MEMBERS_CACHE_TAG] }
);

async function loadMembers(): Promise<MembersSnapshot> {
  try {
    return await getMembersSnapshot();
  } catch (error) {
    if (error instanceof SheetsUnavailableError) throw error;
    throw new SheetsUnavailableError("เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างอ่านข้อมูลสมาชิก", error);
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function matchesFilters(member: Member, filters: MemberSearchFilters): boolean {
  if (filters.generation && member.generation !== filters.generation) return false;
  if (filters.position && member.clubPosition !== filters.position) return false;

  if (filters.query) {
    const q = normalize(filters.query);
    if (!q) return true;
    const haystacks = [
      member.fullName,
      member.nickname,
      member.rank,
      member.generation,
      member.clubPosition,
    ].map(normalize);
    return haystacks.some((h) => h.includes(q));
  }

  return true;
}

function sortSmart(values: string[]): string[] {
  const unique = Array.from(new Set(values.filter((v) => v.length > 0)));
  const allNumeric = unique.every((v) => /^\d+$/.test(v));
  if (allNumeric) {
    return unique.sort((a, b) => Number(a) - Number(b));
  }
  return unique.sort((a, b) => a.localeCompare(b, "th"));
}

export async function getMembersResult(filters: MemberSearchFilters = {}): Promise<MembersResult> {
  const { members, source, fetchedAt } = await loadMembers();

  const generations = sortSmart(members.map((m) => m.generation));
  const positions = sortSmart(members.map((m) => m.clubPosition));

  const filtered = members.filter((m) => matchesFilters(m, filters));

  return {
    members: filtered.map(toPublicMember),
    total: filtered.length,
    source,
    lastUpdated: fetchedAt,
    generations,
    positions,
  };
}

export async function getPublicMemberById(memberId: string): Promise<PublicMember | null> {
  const trimmedId = memberId.trim();
  if (!trimmedId) return null;
  const { members } = await loadMembers();
  const found = members.find((m) => m.memberId === trimmedId);
  return found ? toPublicMember(found) : null;
}

/**
 * Shared by the LINE webhook. Deliberately returns PublicMember (no
 * phone field at all) so a phone number can never be sent through chat.
 */
export async function searchMembersForChat(
  filters: MemberSearchFilters,
  limit = 5
): Promise<{ results: PublicMember[]; totalMatches: number }> {
  const { members } = await loadMembers();
  const filtered = members.filter((m) => matchesFilters(m, filters));
  return {
    results: filtered.slice(0, limit).map(toPublicMember),
    totalMatches: filtered.length,
  };
}
