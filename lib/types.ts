/**
 * Raw row shape as stored in the Google Sheet "Members" tab.
 * Column order must match GOOGLE_SHEETS_RANGE (A:H by default).
 */
export interface MemberRow {
  member_id: string;
  full_name: string;
  rank: string;
  nickname: string;
  generation: string;
  club_position: string;
  phone: string;
  photo_url: string;
}

/**
 * Full member record used only on the server (may include phone).
 * Never pass this type across a server/client boundary as JSON.
 */
export interface Member {
  memberId: string;
  fullName: string;
  rank: string;
  nickname: string;
  generation: string;
  clubPosition: string;
  phone: string;
  photoUrl: string;
}

/**
 * Member shape that is safe to expose publicly — phone is intentionally
 * omitted at the type level so it cannot leak through the public API,
 * the website, or the LINE bot by accident.
 */
export type PublicMember = Omit<Member, "phone">;

export type DataSource = "sheet" | "sample";

export interface MembersResult {
  members: PublicMember[];
  total: number;
  source: DataSource;
  lastUpdated: string;
  generations: string[];
  positions: string[];
}

export interface MemberSearchFilters {
  query?: string;
  generation?: string;
  position?: string;
}
