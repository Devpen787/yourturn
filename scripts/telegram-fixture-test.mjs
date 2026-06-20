import { readFileSync } from "node:fs";

const base = process.env.ETHGLOBAL_E2E_BASE_URL ?? "http://localhost:3000";

function loadEnvLocal() {
  try {
    const text = readFileSync(".env.local", "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // CI can provide env directly.
  }
}

async function assertAppReachable() {
  try {
    const res = await fetch(`${base}/login`);
    if (!res.ok) throw new Error(`health check returned ${res.status}`);
  } catch (error) {
    throw new Error(
      `Telegram fixture needs the app running at ${base}. Start "npm run dev:clean" in another terminal. Original error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function postFixture(text) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const res = await fetch(`${base}/api/telegram/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-yourturn-telegram-fixture": "true",
      ...(secret ? { "x-telegram-bot-api-secret-token": secret } : {}),
    },
    body: JSON.stringify({
      update_id: Date.now(),
      message: {
        message_id: Date.now(),
        chat: { id: "fixture-chat" },
        from: { id: "fixture-user", username: "fixture" },
        text,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(`${text} failed: ${JSON.stringify(data, null, 2)}`);
  }
  return data.result;
}

function assert(condition, label, detail) {
  if (!condition) {
    throw new Error(`${label} failed: ${JSON.stringify(detail, null, 2)}`);
  }
}

async function main() {
  loadEnvLocal();
  process.env.TELEGRAM_ALLOW_MUTATIONS = "false";
  await assertAppReachable();
  const checks = [];
  for (const text of [
    "/start",
    "/bookings",
    "show my bookings",
    "I can't attend",
    "I can't make booking 123",
    "Someone else can take booking 123",
    "Sell booking 123",
    "I want my money back for booking 123",
    "Refund booking 123",
    "What should I do?",
    "recover booking",
    "recover booking 123",
    "approve listing",
    "approve listing 123",
    "approve listing ref 123",
    "/list 123",
    "approve refund",
    "approve refund 123",
    "/refund 123",
    "what can you do?",
  ]) {
    const result = await postFixture(text);
    assert(result.messages?.length > 0, `${text} returns messages`, result);
    if (text.startsWith("approve")) {
      assert(result.mutated === false, "fixture approval does not mutate", result);
    }
    checks.push({ text, command: result.command, mutated: result.mutated, messages: result.messages });
  }
  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
