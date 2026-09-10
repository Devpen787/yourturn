"use client";

import { useState } from "react";
import {
  IDKitRequestWidget,
  proofOfHuman,
  type RpContext,
} from "@worldcoin/idkit";

import {
  WORLD_ID_SANDBOX_ACTION,
  WORLD_ID_SANDBOX_APP_ID,
  WORLD_ID_SANDBOX_ENVIRONMENT,
} from "@/lib/world-id/sandbox-config";

type PrepareResponse =
  | {
      ok: true;
      app_id: typeof WORLD_ID_SANDBOX_APP_ID;
      action: typeof WORLD_ID_SANDBOX_ACTION;
      environment: typeof WORLD_ID_SANDBOX_ENVIRONMENT;
      rp_context: RpContext;
    }
  | {
      ok: false;
      code?: string;
      message?: string;
    };

type ProofState =
  | "idle"
  | "preparing"
  | "ready"
  | "verifying"
  | "verified"
  | "error";

export default function WorldSandboxProofPage() {
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [state, setState] = useState<ProofState>("idle");
  const [message, setMessage] = useState(
    "This isolated proof surface uses World ID Sandbox only. No production identity is requested.",
  );

  async function prepareProof() {
    setState("preparing");
    setMessage("Creating a fresh, five-minute Sandbox proof request…");

    try {
      const response = await fetch("/api/world-id/sandbox/rp-context", {
        method: "POST",
        cache: "no-store",
      });
      const result = (await response.json()) as PrepareResponse;

      if (!response.ok || !result.ok) {
        const failure = result as Extract<PrepareResponse, { ok: false }>;
        setState("error");
        setMessage(
          failure.code === "WORLD_ID_RP_SIGNING_KEY_NOT_CONFIGURED"
            ? "Local RP signing key is not configured yet. Add it only to .env.local and restart the local app."
            : failure.message || "Could not create the Sandbox proof request.",
        );
        return;
      }

      setRpContext(result.rp_context);
      setState("ready");
      setMessage(
        "Request ready. Use the World ID Sandbox app to complete the QR/deep-link handoff.",
      );
      setWidgetOpen(true);
    } catch {
      setState("error");
      setMessage("Could not reach the local RP-signature endpoint.");
    }
  }

  async function verifyProof(idkitResponse: unknown) {
    setState("verifying");
    setMessage("Sandbox returned a proof. Verifying it with World…");

    const response = await fetch("/api/world-id/sandbox/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idkitResponse }),
    });

    if (!response.ok) {
      let providerCode = "";
      try {
        const body = (await response.json()) as { providerCode?: string };
        providerCode = body.providerCode ? ` (${body.providerCode})` : "";
      } catch {
        // Keep failure output privacy-safe even if the provider response is not JSON.
      }
      setState("error");
      setMessage(`World rejected the Sandbox proof${providerCode}.`);
      throw new Error("World ID Sandbox backend verification failed");
    }

    setState("verified");
    setMessage(
      "Sandbox proof verified. This is Sandbox evidence only — not production identity or AgentKit execution evidence.",
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-950 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-amber-900">
          Sandbox · Not production
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-sm font-semibold text-blue-700">World ID proof harness</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Verify the YourTurn Sandbox round trip
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            This reviewer surface creates a signed World ID 4.0 request on the
            YourTurn backend, hands it to the Sandbox app, and verifies the
            returned proof with World. It does not expose the RP signing key or
            raw World identity data.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Fact label="Environment" value="Sandbox" />
            <Fact label="Action" value="Recovery proof" />
            <Fact label="Credential" value="Proof of Human" />
          </div>

          <div className="mt-7 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-100">
            <span className="font-semibold text-slate-950">Status:</span>{" "}
            {message}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={prepareProof}
              disabled={state === "preparing" || state === "verifying"}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state === "preparing" ? "Preparing…" : "Start Sandbox verification"}
            </button>
            <span className="text-xs leading-5 text-slate-500">
              Keep the Sandbox app signed in on your phone. A fresh RP request
              expires after five minutes.
            </span>
          </div>

          {state === "verified" && (
            <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
              <div className="font-semibold">Sandbox proof verified</div>
              <p className="mt-1">
                Reviewer-safe evidence may record that the round trip succeeded,
                the Sandbox environment, action, and verification time. Do not
                publish the proof payload, nullifier, RP private key, or a raw
                World human identifier.
              </p>
            </div>
          )}
        </section>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          This page is an isolated ETHOnline proof harness and is not part of the
          frozen YT-01→YT-08 customer journey.
        </p>
      </div>

      {rpContext && (
        <IDKitRequestWidget
          open={widgetOpen}
          onOpenChange={setWidgetOpen}
          app_id={WORLD_ID_SANDBOX_APP_ID}
          action={WORLD_ID_SANDBOX_ACTION}
          rp_context={rpContext}
          allow_legacy_proofs={true}
          preset={proofOfHuman()}
          environment={WORLD_ID_SANDBOX_ENVIRONMENT}
          handleVerify={verifyProof}
          onSuccess={() => {
            setState("verified");
            setMessage(
              "Sandbox proof verified. This is Sandbox evidence only — not production identity or AgentKit execution evidence.",
            );
          }}
          onError={(errorCode) => {
            setState("error");
            setMessage(`World ID Sandbox flow stopped (${String(errorCode)}).`);
          }}
        />
      )}
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
        {label}
      </div>
      <div className="mt-1.5 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}
