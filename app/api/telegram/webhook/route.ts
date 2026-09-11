import { NextResponse } from "next/server";
import {
  RecoveryMandateAuthorityBoundaryError,
  withRecoveryMandateAuthorityMutation,
  type RecoveryMandateAuthorityBoundaryStore,
} from "@/lib/ledger/recovery-mandate-authority-boundary";
import { getRedis } from "@/lib/store/redis";
import {
  handleTelegramUpdate,
  parseTelegramCommand,
  type TelegramUpdate,
} from "@/lib/telegram/concierge";
import { fail } from "@/lib/validation/api";

export const runtime = "nodejs";

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function allowedChatIds(): Set<string> {
  return new Set(
    (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function botTokenConfigured(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    throw new Error(`Telegram sendMessage failed: ${res.status} ${await res.text()}`);
  }
}

export async function POST(req: Request) {
  try {
    const fixtureDryRun =
      req.headers.get("x-yourturn-telegram-fixture") === "true";
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (configuredSecret) {
      const received = req.headers.get("x-telegram-bot-api-secret-token");
      if (received !== configuredSecret) {
        return NextResponse.json(fail("Invalid Telegram webhook secret.", "FORBIDDEN"), {
          status: 403,
        });
      }
    }
    const update = (await req.json()) as TelegramUpdate;
    const allowed = allowedChatIds();
    const chatId =
      update.message?.chat?.id != null ? String(update.message.chat.id) : null;
    const allowMutations =
      !fixtureDryRun && process.env.TELEGRAM_ALLOW_MUTATIONS === "true";
    if (!fixtureDryRun && (allowMutations || botTokenConfigured()) && allowed.size === 0) {
      return NextResponse.json(
        fail(
          "TELEGRAM_ALLOWED_CHAT_IDS is required for live Telegram delivery or mutation.",
          "NOT_CONFIGURED"
        ),
        { status: 503 }
      );
    }
    const isAllowed = fixtureDryRun || (chatId != null && (allowed.size === 0 || allowed.has(chatId)));
    if (!isAllowed) {
      return NextResponse.json(
        fail("Telegram chat is not allowlisted.", "FORBIDDEN"),
        { status: 403 }
      );
    }

    const command = parseTelegramCommand(update.message?.text ?? "");
    const execute = () =>
      handleTelegramUpdate(update, {
        appBaseUrl: appBaseUrl(),
        allowMutations,
      });

    let result;
    if (
      allowMutations &&
      (command.kind === "approve_listing" || command.kind === "approve_refund") &&
      command.serial != null
    ) {
      result = await withRecoveryMandateAuthorityMutation({
        store: getRedis() as unknown as RecoveryMandateAuthorityBoundaryStore,
        bookingSerial: command.serial,
        mutate: execute,
      });
    } else {
      result = await execute();
    }

    if (!fixtureDryRun && result.chatId && process.env.TELEGRAM_BOT_TOKEN) {
      for (const message of result.messages) {
        await sendTelegramMessage(result.chatId, message);
      }
    }
    return NextResponse.json({
      ok: true as const,
      dryRun: fixtureDryRun || !botTokenConfigured(),
      result,
    });
  } catch (error) {
    if (error instanceof RecoveryMandateAuthorityBoundaryError) {
      return NextResponse.json(fail(error.message, "CONFLICT"), { status: 409 });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(fail(message, "INTERNAL_ERROR"), { status: 500 });
  }
}
