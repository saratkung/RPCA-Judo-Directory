/**
 * Central place to read and validate environment variables.
 * Importing this file in a Client Component is a build error by design —
 * it is only ever imported from server-side modules (lib/sheets.ts,
 * lib/line.ts, route handlers).
 */

export interface SheetsConfig {
  spreadsheetId: string;
  range: string;
  serviceAccountEmail: string;
  privateKey: string;
}

export function getSheetsConfig(): SheetsConfig | null {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
  const range = process.env.GOOGLE_SHEETS_RANGE || "Members!A:H";

  if (!spreadsheetId || !serviceAccountEmail || !rawPrivateKey) {
    return null;
  }

  // .env files store the key with literal "\n" sequences; convert them
  // back into real newlines so the PEM block parses correctly.
  const privateKey = rawPrivateKey.includes("\\n")
    ? rawPrivateKey.replace(/\\n/g, "\n")
    : rawPrivateKey;

  return { spreadsheetId, range, serviceAccountEmail, privateKey };
}

export interface LineConfig {
  channelSecret: string;
  channelAccessToken: string;
}

export function getLineConfig(): LineConfig | null {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelSecret || !channelAccessToken) {
    return null;
  }

  return { channelSecret, channelAccessToken };
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
