"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { BrandMark, BrandWordmark } from "@/components/brand-lab/brandLogoVariants";
import { Button } from "@/components/ui/Button";
import { LiveFeedback } from "@/components/ui/LiveFeedback";
import { useToast } from "@/components/providers/ToastProvider";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";
import type { BookingActorRef } from "@/lib/types/booking-port";
import {
  glassInset,
  glassMutedCallout,
  glassPanel,
  glassPillMuted,
  glassSection,
} from "@/lib/ui/glass-classes";

export type BrandLabAgentMode = "lab" | "customerOnly";

type DemoActorId = "guestA" | "guestB" | "issuer";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
};

type PreviewState = {
  action: string;
  previewId: string;
  summary: string;
  details: Record<string, unknown>;
  expiresAt: string;
};

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDetails(details: Record<string, unknown>): string[] {
  const rows: string[] = [];
  for (const [k, v] of Object.entries(details)) {
    if (v === null || v === undefined) continue;
    const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
    rows.push(`${label}: ${String(v)}`);
  }
  return rows.slice(0, 8);
}

async function postAgent<T>(path: string, body: object): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

const SCRIPTED_PREVIEW: PreviewState = {
  action: "book",
  previewId: "lab-demo-preview-token",
  summary: "Book serial 2 for 20 ℏ as Person A (demo).",
  details: {
    serial: 2,
    buyerAccountId: "0.0.700001",
    priceHbar: 20,
  },
  expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
};

export function BrandLabAgentPrototype({
  mode = "lab",
}: {
  mode?: BrandLabAgentMode;
}) {
  const toast = useToast();
  const headingId = useId();
  const inputId = `${useId()}-agent-message`;
  const isCustomerOnly = mode === "customerOnly";
  const [assistantOn, setAssistantOn] = useState(true);
  const [liveApi, setLiveApi] = useState(true);
  const [actorId, setActorId] = useState<DemoActorId>("guestA");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: uid(),
      role: "assistant",
      text: "This is a layout preview only: your line is matched by simple rules (not an LLM), and there is no voice. For a few phrases it calls the real read/preview APIs when Live API is on — answers are not open-ended or dependable like ChatGPT. Anything that would move a pass still shows as a card with an explicit confirm.",
    },
  ]);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [approvalStep, setApprovalStep] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const actor: BookingActorRef = useMemo(
    () => ({ kind: "demoActor", id: actorId }),
    [actorId]
  );

  const pushMessage = useCallback((role: ChatMessage["role"], text: string) => {
    setMessages((m) => [...m, { id: uid(), role, text }]);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, preview, approvalStep, completedSummary]);

  const resetThread = useCallback(() => {
    setMessages([
      {
        id: uid(),
        role: "assistant",
        text: "Starting fresh — try a suggested action or a short phrase (still demo routing only).",
      },
    ]);
    setPreview(null);
    setApprovalStep(false);
    setCompletedSummary(null);
    setLastError(null);
  }, []);

  const executeListSlots = useCallback(async () => {
    setBusy("Loading sessions…");
    setLastError(null);
    try {
      if (liveApi) {
        const data = await postAgent<{
          ok: boolean;
          data?: unknown;
          error?: string;
        }>("/api/agent/read", { action: "listSlots" });
        if (!data.ok) {
          throw new Error(data.error ?? "Request failed");
        }
        const slots = data.data as Array<{
          title: string;
          serial: number;
          status: string;
          primaryPriceHbar: number;
          startTime: string;
        }>;
        const lines = slots
          .slice(0, 6)
          .map(
            (s) =>
              `• ${s.title} (#${s.serial}) — ${s.status} — ${s.primaryPriceHbar} ℏ — ${s.startTime.slice(0, 10)}`
          )
          .join("\n");
        pushMessage(
          "assistant",
          slots.length
            ? `Here are sessions (first ${Math.min(6, slots.length)}):\n${lines}`
            : "No slots returned from the API."
        );
      } else {
        pushMessage(
          "assistant",
          "Demo mode — scripted list:\n• Handstand Flow (#1) — AVAILABLE — 20 ℏ\n• Mobility reset (#2) — AVAILABLE — 18 ℏ"
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastError(msg);
      pushMessage("assistant", `I could not load sessions: ${msg}`);
    } finally {
      setBusy(null);
    }
  }, [liveApi, pushMessage]);

  const executeHoldings = useCallback(async () => {
    const label =
      actorId === "guestA"
        ? "Person A"
        : actorId === "guestB"
          ? "Person B"
          : "Issuer";
    setBusy("Checking holdings…");
    setLastError(null);
    try {
      if (liveApi) {
        const data = await postAgent<{
          ok: boolean;
          data?: unknown;
          error?: string;
        }>("/api/agent/read", {
          action: "listHoldings",
          holder: actor,
        });
        if (!data.ok) {
          throw new Error(data.error ?? "Request failed");
        }
        const held = data.data as Array<{ title: string; serial: number; status: string }>;
        pushMessage(
          "assistant",
          held.length
            ? `${label} holds:\n${held.map((h) => `• ${h.title} (#${h.serial}) — ${h.status}`).join("\n")}`
            : `${label} has no passes in this demo.`
        );
      } else {
        pushMessage(
          "assistant",
          `Demo: ${label} holds one pass — Handstand Flow (#1) — HELD.`
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastError(msg);
      pushMessage("assistant", `Holdings lookup failed: ${msg}`);
    } finally {
      setBusy(null);
    }
  }, [actor, actorId, liveApi, pushMessage]);

  const executePreviewBook = useCallback(
    async (serial: number) => {
      setBusy("Building preview…");
      setPreview(null);
      setApprovalStep(false);
      setCompletedSummary(null);
      setLastError(null);
      try {
        if (liveApi) {
          const data = await postAgent<{
            ok: boolean;
            preview?: PreviewState;
            error?: string;
          }>("/api/agent/preview", {
            action: "book",
            buyer: { kind: "demoActor", id: actorId },
            serial,
          });
          if (!data.ok || !data.preview) {
            throw new Error(data.error ?? "Preview failed");
          }
          setPreview(data.preview);
          pushMessage(
            "assistant",
            "Here is a clear summary of that step. If it looks right, continue — you will get one more confirm before anything is final."
          );
        } else {
          setPreview(SCRIPTED_PREVIEW);
          pushMessage(
            "assistant",
            "Here is a sample booking step (offline demo numbers)."
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        pushMessage("assistant", `Preview failed: ${msg}`);
      } finally {
        setBusy(null);
      }
    },
    [actorId, liveApi, pushMessage]
  );

  const routeChatAfterUserMessage = useCallback(
    async (trimmed: string) => {
      const lower = trimmed.toLowerCase();

      if (/^help$|^\?$|^what can you do/i.test(trimmed)) {
        pushMessage(
          "assistant",
          [
            "This panel is not a large language model: only a small set of phrases is understood, and there is no speech input.",
            "Stick to the suggestions or examples below, or wire a real model to the same APIs in production.",
            "If we match a flow, anything that would book or move a pass still uses the review card and confirm steps.",
          ].join("\n")
        );
        return;
      }

      const extractPreviewSerial = (s: string): number | null => {
        const tries = [
          /\bpreview\b[\s\S]{0,64}?\bserial\s*#?(\d+)\b/i,
          /\bbook(?:ing)?\b[\s\S]{0,48}?#(\d+)\b/i,
          /\bbook(?:ing)?\s+(?:serial\s*)?(\d+)\b/i,
          /\bserial\s*#?\s*(\d+)\b[\s\S]{0,32}?\b(?:preview|book)/i,
        ];
        for (const re of tries) {
          const m = s.match(re);
          if (m?.[1]) {
            const n = parseInt(m[1], 10);
            if (Number.isFinite(n) && n > 0) return n;
          }
        }
        return null;
      };

      const wantsPreview =
        /preview|book(?:ing)?|reserve|hold (?:a |the |)slot|sign me up/i.test(
          lower
        );
      const serialFromPhrase = extractPreviewSerial(trimmed);
      if (wantsPreview && serialFromPhrase != null) {
        await executePreviewBook(serialFromPhrase);
        return;
      }

      const wantsHoldings =
        !wantsPreview &&
        /(what (do )?i hold|what passes|my passes|my bookings|list my passes|show (my |)passes)/i.test(
          lower
        );
      if (wantsHoldings) {
        await executeHoldings();
        return;
      }

      if (
        /session|slot|class|available|what'?s on|open|browse|calendar|schedule|week|evening/i.test(
          lower
        )
      ) {
        await executeListSlots();
        return;
      }

      if (wantsPreview && serialFromPhrase == null) {
        pushMessage(
          "assistant",
          "Which session serial should I preview? For example: “Preview booking for serial 1”."
        );
        return;
      }

      pushMessage(
        "assistant",
        "No rule matched that text yet — this demo only understands a few patterns. Try the chips, “What’s open right now?”, or send “help”."
      );
    },
    [
      executeHoldings,
      executeListSlots,
      executePreviewBook,
      pushMessage,
    ]
  );

  const [draft, setDraft] = useState("");

  const sendChatMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      pushMessage("user", trimmed);
      await routeChatAfterUserMessage(trimmed);
    },
    [busy, pushMessage, routeChatAfterUserMessage]
  );

  const onSubmitChat = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const t = draft;
      setDraft("");
      await sendChatMessage(t);
    },
    [draft, sendChatMessage]
  );

  const runExampleWalkthrough = useCallback(async () => {
    if (busy) return;
    setLastError(null);
    setPreview(null);
    setApprovalStep(false);
    setCompletedSummary(null);
    await sendChatMessage("What’s open right now?");
    await new Promise((r) => setTimeout(r, 500));
    await sendChatMessage("Preview booking serial 1");
  }, [busy, sendChatMessage]);

  const requestHumanApproval = useCallback(() => {
    if (!preview) return;
    setApprovalStep(true);
    pushMessage("user", "Yes — go ahead.");
    pushMessage(
      "assistant",
      "Last check: confirm below and we are done."
    );
  }, [preview, pushMessage]);

  const simulateApprove = useCallback(() => {
    if (!preview) return;
    setCompletedSummary(
      `Demo only: in the live product you would see a receipt or link here. Nothing was submitted from this preview page.`
    );
    setPreview(null);
    setApprovalStep(false);
    toast({
      variant: "success",
      message: "Confirmed (demo — no real transaction from this page).",
    });
    pushMessage(
      "assistant",
      "All set for this walkthrough. In production the app would finish the booking and show you proof of the move."
    );
  }, [preview, pushMessage, toast]);

  const dismissPreview = useCallback(() => {
    setPreview(null);
    setApprovalStep(false);
    pushMessage("user", "Not now.");
    pushMessage("assistant", "Okay — cancelled. Ask me something else whenever you like.");
  }, [pushMessage]);

  const showStarterPanel = messages.length === 1 && !preview && !busy;

  return (
    <div
      id={isCustomerOnly ? undefined : "agent-ux"}
      className={cn(
        isCustomerOnly
          ? "mx-auto w-full max-w-md scroll-mt-24"
          : cn(glassPanel, "scroll-mt-24 p-5 md:p-6")
      )}
    >
      {!isCustomerOnly ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/60 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Prototype
            </p>
            <h2 id={headingId} className="mt-1 text-xl font-semibold text-slate-900">
              Assistant-style UI (prototype)
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              Conversation-shaped preview only — not an LLM and not voice. It shows how
              confirmations could look once a real model calls the same APIs. For the
              customer-only frame (no side panel), open{" "}
              <a href="/brand-lab/assistant" className={getButtonClassName("textLink")}>
                /brand-lab/assistant
              </a>
              .
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs font-medium text-slate-500">Panel</span>
            <button
              type="button"
              role="switch"
              aria-checked={assistantOn}
              aria-labelledby={headingId}
              onClick={() => setAssistantOn((v) => !v)}
              className={cn(
                "relative h-8 w-14 rounded-full transition-colors",
                assistantOn ? "bg-brand-mark" : "bg-slate-300"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
                  assistantOn ? "left-7" : "left-1"
                )}
              />
              <span className="sr-only">{assistantOn ? "On" : "Off"}</span>
            </button>
            <span className="text-[10px] text-slate-500">
              {assistantOn ? "Visible" : "Hidden — minimised entry below"}
            </span>
          </div>
        </div>
      ) : null}

      {!isCustomerOnly && !assistantOn ? (
        <div
          className={cn(
            glassMutedCallout,
            "mt-6 flex flex-wrap items-center justify-between gap-3 border-dashed p-4"
          )}
        >
          <p className="text-sm text-slate-600">
            Assistant is off. On a live site this might be a small “Help” chip or
            nothing at all until the user opts in.
          </p>
          <Button type="button" variant="secondary" onClick={() => setAssistantOn(true)}>
            Turn assistant back on
          </Button>
        </div>
      ) : (isCustomerOnly || assistantOn) ? (
        <div
          className={cn(
            "grid gap-6",
            !isCustomerOnly && "mt-6 lg:grid-cols-[minmax(0,1fr)_280px]"
          )}
        >
          {/* Conversation-style prototype (not an LLM) */}
          <div
            className={cn(
              glassSection,
              "flex flex-col overflow-hidden p-0",
              isCustomerOnly
                ? "min-h-[min(560px,calc(100vh-8rem))] max-h-[calc(100vh-6rem)]"
                : "relative min-h-[420px]"
            )}
            role="region"
            aria-label="Assistant prototype — scripted routing, not a live AI"
          >
            <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/50 px-3 py-3 backdrop-blur-sm">
              <div className="flex min-w-0 items-center gap-2">
                <BrandMark variant="calendarTurn" className="h-8 w-8 shrink-0" />
                <div className="min-w-0">
                  <BrandWordmark variant="calendarTurn" className="text-sm font-semibold" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Demo · confirm before final
                  </p>
                </div>
              </div>
              {isCustomerOnly ? (
                <button
                  type="button"
                  onClick={resetThread}
                  className={cn(
                    getButtonClassName("textLink"),
                    "min-h-0 shrink-0 px-2 py-1 text-xs font-medium"
                  )}
                >
                  Start over
                </button>
              ) : null}
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user" && "ml-auto bg-brand-mark text-white",
                    m.role === "assistant" &&
                      "mr-auto border border-slate-100 bg-slate-50 text-slate-800",
                    m.role === "system" &&
                      "mx-auto border border-amber-200/80 bg-amber-50/90 text-center text-xs text-amber-950"
                  )}
                >
                  {m.text.split("\n").map((line, i) => (
                    <span key={i} className="block">
                      {line || "\u00a0"}
                    </span>
                  ))}
                </div>
              ))}

              {showStarterPanel ? (
                <div className={cn(glassInset, "mr-auto max-w-[92%] p-3")}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    What do you want to do?
                  </p>
                  <div
                    className={cn(
                      "mt-2 grid gap-2",
                      isCustomerOnly ? "grid-cols-1" : "sm:grid-cols-3"
                    )}
                  >
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void sendChatMessage("What’s open right now?")}
                      className="rounded-xl border border-slate-200/80 bg-white/60 px-3 py-3 text-left text-sm font-medium text-slate-900 ring-1 ring-slate-900/[0.03] transition-colors hover:border-sky-300/80 hover:bg-sky-50/50 disabled:opacity-50"
                    >
                      See what’s open
                      <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                        Sessions you can book
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void sendChatMessage("What passes do I hold?")}
                      className="rounded-xl border border-slate-200/80 bg-white/60 px-3 py-3 text-left text-sm font-medium text-slate-900 ring-1 ring-slate-900/[0.03] transition-colors hover:border-sky-300/80 hover:bg-sky-50/50 disabled:opacity-50"
                    >
                      My passes
                      <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                        What is already yours
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void runExampleWalkthrough()}
                      className="rounded-xl border border-slate-200/80 bg-white/60 px-3 py-3 text-left text-sm font-medium text-slate-900 ring-1 ring-slate-900/[0.03] transition-colors hover:border-sky-300/80 hover:bg-sky-50/50 disabled:opacity-50"
                    >
                      Show me an example
                      <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                        Walk through a booking
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {preview ? (
              <div className="border-t border-slate-100 px-3 py-3">
                {!approvalStep ? (
                  <div className="rounded-xl border border-sky-200/80 bg-sky-50/90 p-3 ring-1 ring-sky-900/[0.04]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-950">
                      Review this step
                    </p>
                    <p className="mt-1 text-sm font-medium tabular-nums text-slate-900">
                      {preview.summary}
                    </p>
                    <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                      {formatDetails(preview.details).map((row) => (
                        <li key={row}>{row}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[10px] text-slate-500">
                      Offer refreshes after {new Date(preview.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="primary" onClick={requestHumanApproval}>
                        Continue
                      </Button>
                      <Button type="button" variant="muted" onClick={dismissPreview}>
                        Not now
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200/90 bg-amber-50/95 p-3 ring-1 ring-amber-900/[0.06]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-950">
                      Final confirm
                    </p>
                    <p className="mt-1 text-sm text-amber-950">
                      This is the last step — after this, the app would complete the move you saw above.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="primarySuccess"
                        onClick={simulateApprove}
                        aria-label="Confirm (demo only, no real transaction)"
                      >
                        Confirm
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setApprovalStep(false);
                          pushMessage(
                            "assistant",
                            "No problem — the offer is still there if you want to continue."
                          );
                        }}
                      >
                        Change my mind
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {completedSummary ? (
              <div className="border-t border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-950">
                {completedSummary}
              </div>
            ) : null}

            {isCustomerOnly && lastError ? (
              <div className="border-t border-red-100 px-3 py-2">
                <LiveFeedback success={null} error={lastError} />
              </div>
            ) : null}

            <form
              onSubmit={onSubmitChat}
              className="mt-auto border-t border-slate-100 bg-white/95 p-3"
            >
              <label htmlFor={inputId} className="sr-only">
                Try a phrase — demo pattern matching only, not voice or an LLM
              </label>
              <div className="flex gap-2">
                <input
                  id={inputId}
                  type="text"
                  autoComplete="off"
                  placeholder="Try a phrase the demo understands…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={!!busy}
                  className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-focus/35"
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!draft.trim() || !!busy}
                  loading={!!busy}
                  loadingLabel="…"
                >
                  Send
                </Button>
              </div>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Other ways to ask
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(
                  [
                    ["Any evening classes this week?", "Loading sessions…"],
                    ["What passes do I hold?", "Checking holdings…"],
                    ["I want to book serial 1", "Building preview…"],
                    ["Book #2", "Building preview…"],
                  ] as const
                ).map(([phrase, loadLabel]) => (
                  <button
                    key={phrase}
                    type="button"
                    disabled={!!busy}
                    onClick={() => void sendChatMessage(phrase)}
                    className={cn(
                      glassPillMuted,
                      "text-left transition-colors hover:border-slate-300/90 hover:bg-white/70 disabled:opacity-50"
                    )}
                  >
                    {busy === loadLabel ? "…" : phrase}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Controls column (lab only) */}
          {!isCustomerOnly ? (
          <div className={cn(glassInset, "space-y-4 p-4")}>
            <p className="text-xs font-semibold text-slate-800">Internal — testing</p>
            <p className="text-[10px] leading-snug text-slate-500">
              Customers would not see this column. In the real app a similar panel could open from
              Browse or My passes — powered by a real model, not this stub.
            </p>

            <label className="flex cursor-pointer items-center justify-between gap-2 text-sm text-slate-700">
              <span>Live API</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={liveApi}
                onChange={(e) => setLiveApi(e.target.checked)}
              />
            </label>
            <p className="text-[10px] leading-snug text-slate-500">
              Off = canned replies. On = your local server and env.
            </p>

            <div>
              <p className="text-xs font-medium text-slate-600">Who you are (demo)</p>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900"
                value={actorId}
                onChange={(e) => setActorId(e.target.value as DemoActorId)}
              >
                <option value="guestA">Person A (guestA)</option>
                <option value="guestB">Person B (guestB)</option>
                <option value="issuer">Issuer</option>
              </select>
            </div>

            <Button type="button" variant="muted" className="w-full" onClick={resetThread}>
              Reset conversation
            </Button>

            <details className="rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600">
              <summary className="cursor-pointer font-medium text-slate-800">
                Integration notes
              </summary>
              <p className="mt-2 leading-snug">
                Routing here is a thin keyword stub (not an LLM). Production would use a real model and tools
                against{" "}
                <code className="rounded bg-slate-100 px-0.5 font-mono text-[10px]">
                  /api/agent/*
                </code>
                ; confirm stays server-side per docs/AGENT-INTEGRATION.md.
              </p>
            </details>

            {lastError ? <LiveFeedback success={null} error={lastError} /> : null}
          </div>
          ) : null}
        </div>
      ) : null}

      {!isCustomerOnly && assistantOn ? (
        <p className="mt-4 text-center text-[10px] text-slate-400">
          Best placement in product: in-context (slot detail, checkout) or a single help entry
          point — not a separate manual to read first.
        </p>
      ) : null}
    </div>
  );
}
