import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature, replyToLine } from "@/lib/line";
import { buildReplyForText } from "@/lib/line-commands";
import { isRateLimited } from "@/lib/rate-limit";

interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
}

/**
 * LINE Messaging API webhook. Must verify the signature against the raw
 * request body before parsing JSON — LINE signs the exact bytes sent.
 * Always returns 200 for a structurally valid, signed request so LINE
 * does not keep retrying delivery, even when an individual event is
 * ignored or its command is unrecognized.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: { events?: LineWebhookEvent[] };
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const events = payload.events ?? [];

  await Promise.all(
    events.map((event) =>
      handleEvent(event).catch((error) => {
        console.error("[line webhook] failed to handle event", error);
      })
    )
  );

  return NextResponse.json({ ok: true });
}

async function handleEvent(event: LineWebhookEvent): Promise<void> {
  // Only text messages carry a command; ignore follow/unfollow/join,
  // postbacks, images, stickers, etc. without replying.
  if (event.type !== "message" || event.message?.type !== "text" || !event.replyToken) {
    return;
  }

  const userId = event.source?.userId ?? "unknown";
  if (isRateLimited(`line:${userId}`, 10, 60_000)) {
    return;
  }

  const reply = await buildReplyForText(event.message.text ?? "");
  if (!reply) return;

  await replyToLine(event.replyToken, reply);
}

/**
 * LINE's webhook "Verify" button in the console sends a POST, not a GET,
 * but this GET is kept as a harmless health check for manual checks.
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
