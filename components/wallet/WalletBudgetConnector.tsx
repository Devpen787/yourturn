"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getHashscanTxUrl } from "@/lib/hedera/hashscan";

type WalletBudgetConfig = {
  ok: boolean;
  network: string;
  usdcTokenId: string;
  spenderAccountId: string | null;
  allowanceAtomicUnits: string;
  allowanceUsdc: string;
  reownProjectConfigured: boolean;
};

type WalletAccount = {
  address?: string;
  type?: string;
  isConnected?: boolean;
};

type WalletAllowanceRequest = {
  ok: boolean;
  transactionList?: string;
  error?: string;
};

function normalizeHederaAccountId(address?: string): string | null {
  if (!address) return null;
  if (/^\d+\.\d+\.\d+$/.test(address)) return address;
  const parts = address.split(":");
  const last = parts[parts.length - 1];
  return /^\d+\.\d+\.\d+$/.test(last) ? last : null;
}

function txIdFromWalletResult(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const maybe = result as { transactionId?: unknown; txId?: unknown };
  if (typeof maybe.transactionId === "string") return maybe.transactionId;
  if (typeof maybe.txId === "string") return maybe.txId;
  return null;
}

export function WalletBudgetConnector({
  actorLabel,
  className,
}: {
  actorLabel: string;
  className?: string;
}) {
  const [config, setConfig] = useState<WalletBudgetConfig | null>(null);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"config" | "connect" | "approve" | null>("config");
  const appKitRef = useRef<any>(null);
  const providerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadConfig() {
      try {
        const res = await fetch("/api/wallet-budget/config", { method: "GET" });
        const data = (await res.json()) as WalletBudgetConfig;
        if (!cancelled) setConfig(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(null);
      }
    }
    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const connectedAccountId = useMemo(
    () => normalizeHederaAccountId(account?.address),
    [account?.address]
  );
  const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;
  const canUseWallet =
    !!projectId && !!config?.spenderAccountId && !!config?.usdcTokenId;

  async function ensureAppKit() {
    if (appKitRef.current && providerRef.current) {
      return { appKit: appKitRef.current, provider: providerRef.current };
    }
    if (!projectId) {
      throw new Error("NEXT_PUBLIC_REOWN_PROJECT_ID is not configured.");
    }

    const [
      { createAppKit },
      { HederaAdapter },
      { HederaProvider },
      {
        HederaChainDefinition,
        hederaNamespace,
      },
    ] = await Promise.all([
      import("@reown/appkit"),
      import("@hashgraph/hedera-wallet-connect/dist/reown/adapter"),
      import("@hashgraph/hedera-wallet-connect/dist/reown/providers"),
      import("@hashgraph/hedera-wallet-connect/dist/reown/utils"),
    ]);

    const metadata = {
      name: "YourTurn Concierge",
      description: "Policy-gated booked-right recovery on Hedera testnet.",
      url: window.location.origin,
      icons: [`${window.location.origin}/favicon.ico`],
    };
    const universalProvider = await HederaProvider.init({
      projectId,
      metadata,
    });
    const hederaNativeAdapter = new HederaAdapter({
      projectId,
      networks: [HederaChainDefinition.Native.Testnet],
      namespace: hederaNamespace,
    });
    const appKit = createAppKit({
      adapters: [hederaNativeAdapter],
      universalProvider,
      projectId,
      metadata,
      networks: [HederaChainDefinition.Native.Testnet],
    } as any);

    appKit.subscribeAccount((nextAccount: WalletAccount) => {
      setAccount(nextAccount?.address ? nextAccount : null);
    });
    appKitRef.current = appKit;
    providerRef.current = universalProvider;
    return { appKit, provider: universalProvider };
  }

  async function connectWallet() {
    setLoading("connect");
    setError(null);
    setStatus(null);
    try {
      const { appKit } = await ensureAppKit();
      await appKit.open();
      setStatus("Wallet modal opened. Choose a Hedera testnet wallet account.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  async function approveAllowance() {
    if (!config?.spenderAccountId) {
      setError("Concierge spender account is not configured.");
      return;
    }
    if (!connectedAccountId) {
      setError("Connect a Hedera account before approving a wallet budget.");
      return;
    }
    setLoading("approve");
    setError(null);
    setTxId(null);
    setStatus(null);
    try {
      const { provider } = await ensureAppKit();
      const requestRes = await fetch("/api/wallet-budget/allowance-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerAccountId: connectedAccountId }),
      });
      const request = (await requestRes.json()) as WalletAllowanceRequest;
      if (!requestRes.ok || !request.ok || !request.transactionList) {
        throw new Error(request.error || "Could not prepare wallet allowance transaction.");
      }
      const result = await provider.hedera_signAndExecuteTransaction({
        signerAccountId: `hedera:testnet:${connectedAccountId}`,
        transactionList: request.transactionList,
      });
      const nextTxId = txIdFromWalletResult(result);
      setTxId(nextTxId);
      setStatus(
        nextTxId
          ? `Wallet approved a bounded ${config.allowanceUsdc} USDC Concierge budget.`
          : "Wallet returned an approval response."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-cyan-100 bg-cyan-50/65 p-4 text-sm text-slate-700",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">Wallet-funded policy budget</p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
            Optional Hedera WalletConnect path for {actorLabel}: approve a bounded
            USDC allowance before Concierge can spend through policy and x402 limits.
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-cyan-900 ring-1 ring-cyan-200">
          Hedera WalletConnect
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Asset</dt>
          <dd className="font-medium text-slate-950">
            USDC {config?.usdcTokenId ?? "loading"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Budget</dt>
          <dd className="font-medium text-slate-950">
            {config?.allowanceUsdc ?? "5"} USDC
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Wallet</dt>
          <dd className="break-words font-medium text-slate-950">
            {connectedAccountId ?? account?.address ?? "Not connected"}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          loading={loading === "connect"}
          loadingLabel="Opening wallet..."
          disabled={loading === "config" || !canUseWallet}
          onClick={() => void connectWallet()}
        >
          Connect wallet
        </Button>
        <Button
          type="button"
          variant="primary"
          loading={loading === "approve"}
          loadingLabel="Waiting for wallet..."
          disabled={!canUseWallet || !connectedAccountId || loading === "config"}
          onClick={() => void approveAllowance()}
        >
          Approve USDC budget
        </Button>
      </div>

      {!canUseWallet ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
          Wallet approval is disabled until `NEXT_PUBLIC_REOWN_PROJECT_ID`,
          `HEDERA_TREASURY_ID`, and USDC config are present.
        </p>
      ) : null}
      {status ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-950">
          {status}
          {txId ? (
            <>
              {" "}
              <a
                className="font-medium underline underline-offset-2"
                href={getHashscanTxUrl(txId)}
                target="_blank"
                rel="noreferrer"
              >
                View on HashScan
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-950">
          {error}
        </p>
      ) : null}
    </div>
  );
}
