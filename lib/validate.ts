const MAX_QUERY_LENGTH = 100;

/**
 * Sanitizes free-text input (search query, member id) coming from the
 * public website or LINE chat before it is used for matching. Strips
 * control characters and caps length — the matching itself is a plain
 * substring/equality check, never used to build HTML or a query string,
 * so this is defense in depth rather than the only protection.
 */
export function sanitizeText(input: unknown, maxLength = MAX_QUERY_LENGTH): string {
  if (typeof input !== "string") return "";
  const withoutControlChars = stripControlChars(input);
  return withoutControlChars.trim().slice(0, maxLength);
}

function stripControlChars(value: string): string {
  let result = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    const isControl = code <= 0x1f || code === 0x7f;
    if (!isControl) result += ch;
  }
  return result;
}

const MEMBER_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

export function isValidMemberId(id: string): boolean {
  return MEMBER_ID_PATTERN.test(id);
}

export const DEFAULT_AVATAR_PATH = "/default-avatar.svg";

/**
 * Returns the given photo URL only if it is a well-formed http(s) URL,
 * otherwise falls back to the default avatar. A sheet cell can contain
 * anything an admin typed — this stops a malformed or non-http value
 * (e.g. "javascript:...") from ever reaching an <img> src.
 */
export function getSafePhotoUrl(url: string | undefined | null): string {
  if (!url) return DEFAULT_AVATAR_PATH;
  try {
    const parsed = new URL(url);
    // https only — matches next.config.ts remotePatterns and avoids
    // mixed-content / unencrypted image loads on an https site.
    if (parsed.protocol === "https:") {
      return parsed.toString();
    }
    return DEFAULT_AVATAR_PATH;
  } catch {
    return DEFAULT_AVATAR_PATH;
  }
}
