import crypto from "crypto";
import { getLineConfig } from "@/lib/env";

/**
 * Verifies the `x-line-signature` header per LINE's spec: HMAC-SHA256 of
 * the raw request body using the channel secret, base64-encoded. Must be
 * computed against the exact raw bytes received — never against a
 * re-serialized JSON object, since that can differ byte-for-byte from
 * what LINE signed.
 */
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;

  const config = getLineConfig();
  if (!config) return false;

  const expected = crypto.createHmac("sha256", config.channelSecret).update(rawBody).digest("base64");

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export interface LineTextMessage {
  type: "text";
  text: string;
}

/**
 * Sends a reply using the LINE Messaging API reply endpoint. Reply tokens
 * are single-use and expire quickly, so a failure here (e.g. a retried
 * webhook delivery reusing an already-consumed token) is logged and
 * swallowed rather than thrown — the webhook route must still return 200
 * so LINE does not keep retrying.
 */
export async function replyToLine(replyToken: string, messages: LineTextMessage[]): Promise<void> {
  const config = getLineConfig();
  if (!config) {
    console.error("[line] replyToLine called without LINE credentials configured");
    return;
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.channelAccessToken}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    });

    if (!response.ok) {
      console.error(`[line] reply failed with HTTP ${response.status}`);
    }
  } catch (error) {
    console.error("[line] reply request threw an error", error);
  }
}
