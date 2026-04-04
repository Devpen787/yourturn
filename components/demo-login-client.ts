"use client";

export type DemoLoginRole = "issuer" | "guestA" | "guestB";

export async function postDemoLogin(
  role: DemoLoginRole
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/auth/demo-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
  };
  if (!data.ok) {
    return { ok: false, error: data.error || res.statusText };
  }
  return { ok: true };
}
