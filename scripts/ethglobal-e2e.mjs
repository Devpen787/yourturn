import { readFileSync } from "node:fs";

const base = process.env.ETHGLOBAL_E2E_BASE_URL ?? "http://localhost:3000";
const mirrorBase = (
  process.env.NEXT_PUBLIC_MIRROR_BASE ??
  "https://testnet.mirrornode.hedera.com/api/v1"
).replace(/\/$/, "");

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

function assert(ok, label, detail = {}) {
  if (!ok) {
    throw new Error(`${label} failed: ${JSON.stringify(detail, null, 2)}`);
  }
  return { label, ok: true, detail };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function assertAppReachable() {
  try {
    const res = await fetch(`${base}/login`);
    assert(res.ok, "local app health check", {
      status: res.status,
      url: `${base}/login`,
    });
  } catch (error) {
    throw new Error(
      `ETHGlobal E2E needs the app running at ${base}. Start it with "npm run dev:clean" in another terminal, then rerun "npm run ethglobal:e2e". Original error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function makeClient() {
  let cookie = "";
  return {
    async request(path, { method = "GET", body } = {}) {
      const res = await fetch(`${base}${path}`, {
        method,
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];
      let data;
      try {
        data = await res.json();
      } catch {
        data = await res.text();
      }
      return { res, data };
    },
    async login(role) {
      const out = await this.request("/api/auth/demo-login", {
        method: "POST",
        body: { role },
      });
      return assert(out.res.ok && out.data?.ok, `login ${role}`, {
        status: out.res.status,
        data: out.data,
      });
    },
  };
}

async function main() {
  loadEnvLocal();
  await assertAppReachable();
  const checks = [];
  const issuer = makeClient();
  const guestA = makeClient();
  const guestB = makeClient();

  checks.push(await issuer.login("issuer"));
  checks.push(await guestA.login("guestA"));
  checks.push(await guestB.login("guestB"));

  const now = Date.now();
  const plan = {
    issuerName: "YourTurn Recovery Studio",
    slots: [
      {
        slotId: `eth-main-${now}`,
        title: "Recovery Flow Pilates",
        startTime: new Date(now + 36 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(now + 37 * 60 * 60 * 1000).toISOString(),
        location: "Studio A",
        primaryPriceHbar: 21,
        resaleAllowed: true,
        policy: {
          resaleAllowed: true,
          ownerRoyaltyPercent: 10,
          releaseAllowed: true,
          waitlistEnabled: true,
          scheduleAutomationEnabled: true,
          version: 2,
          label: "ETHGlobal recovery policy v2",
        },
      },
      {
        slotId: `eth-no-resale-${now}`,
        title: "No Resale Mobility",
        startTime: new Date(now + 38 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(now + 39 * 60 * 60 * 1000).toISOString(),
        location: "Studio B",
        primaryPriceHbar: 18,
        resaleAllowed: false,
        policy: {
          resaleAllowed: false,
          ownerRoyaltyPercent: 10,
          releaseAllowed: true,
          waitlistEnabled: true,
          scheduleAutomationEnabled: true,
          version: 2,
          label: "No resale booked policy v2",
        },
      },
      {
        slotId: `eth-open-${now}`,
        title: "Open Recovery Check",
        startTime: new Date(now + 40 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(now + 41 * 60 * 60 * 1000).toISOString(),
        location: "Studio C",
        primaryPriceHbar: 16,
        resaleAllowed: true,
        policy: {
          resaleAllowed: true,
          ownerRoyaltyPercent: 8,
          releaseAllowed: true,
          waitlistEnabled: true,
          scheduleAutomationEnabled: true,
          version: 2,
          label: "Open recovery policy v2",
        },
      },
    ],
  };

  let out = await issuer.request("/api/session-plan", {
    method: "POST",
    body: plan,
  });
  checks.push(
    assert(out.res.ok && out.data?.ok, "issuer saves ETHGlobal session plan", {
      status: out.res.status,
      data: out.data,
    })
  );

  out = await issuer.request("/api/reset-demo", { method: "POST" });
  checks.push(
    assert(
      out.res.ok && out.data?.ok && out.data.serials?.length === 3,
      "issuer reset creates fresh serials",
      { status: out.res.status, data: out.data }
    )
  );
  const [serialMain, serialNoResale, serialOpen] = out.data.serials;

  out = await guestB.request("/api/recovery/preview", {
    method: "POST",
    body: { actor: "guestB", serial: serialMain, askPriceHbar: 21 },
  });
  checks.push(
    assert(
      out.data?.status === "blocked" && out.data.code === "NOT_HELD",
      "unheld recovery is blocked",
      out.data
    )
  );

  out = await guestA.request("/api/book", {
    method: "POST",
    body: { actor: "guestA", serial: serialMain },
  });
  checks.push(
    assert(out.res.ok && out.data?.ok, "Person A books main serial", {
      status: out.res.status,
      data: out.data,
    })
  );
  const mainBookTx = out.data.txId ?? out.data.transactionId;

  out = await guestB.request("/api/recovery/preview", {
    method: "POST",
    body: { actor: "guestB", serial: serialMain, askPriceHbar: 21 },
  });
  checks.push(
    assert(
      out.data?.status === "blocked" && out.data.code === "NOT_CURRENT_HOLDER",
      "non-holder recovery is blocked",
      out.data
    )
  );

  out = await guestA.request("/api/book", {
    method: "POST",
    body: { actor: "guestA", serial: serialNoResale },
  });
  checks.push(
    assert(out.res.ok && out.data?.ok, "Person A books no-resale serial", {
      status: out.res.status,
      data: out.data,
    })
  );

  out = await guestA.request("/api/recovery/preview", {
    method: "POST",
    body: { actor: "guestA", serial: serialNoResale, askPriceHbar: 18 },
  });
  checks.push(
    assert(
      out.data?.status === "blocked" && out.data.code === "RESALE_NOT_ALLOWED",
      "resale-disabled recovery is blocked by snapshot",
      out.data
    )
  );

  out = await guestA.request("/api/recovery/preview", {
    method: "POST",
    body: {
      actor: "guestA",
      serial: serialNoResale,
      action: "cancel_release_refund",
    },
  });
  checks.push(
    assert(
      out.res.ok &&
        out.data?.status === "recommended" &&
        out.data.action === "cancel_release_refund" &&
        out.data.refund?.refundHbar === 18,
      "Person A refund release preview recommended",
      { status: out.res.status, data: out.data }
    )
  );
  const refundPreviewId = out.data.previewId;

  out = await guestA.request("/api/recovery/confirm", {
    method: "POST",
    body: { actor: "guestA", previewId: refundPreviewId },
  });
  checks.push(
    assert(
      out.res.ok &&
        out.data?.ok &&
        out.data.receipt?.action === "cancel_release_refund" &&
        out.data.receipt?.refundHbar === 18 &&
        out.data.receipt?.releaseTxId &&
        out.data.receipt?.burnTxId,
      "Person A confirms real test HBAR refund release",
      { status: out.res.status, data: out.data }
    )
  );
  const refundReceipt = out.data.receipt;

  let refundUsedPreview;
  for (let i = 0; i < 6; i += 1) {
    out = await guestA.request("/api/recovery/preview", {
      method: "POST",
      body: {
        actor: "guestA",
        serial: serialNoResale,
        action: "cancel_release_refund",
      },
    });
    refundUsedPreview = out.data;
    if (out.data?.status === "blocked" && out.data.code === "USED") break;
    await sleep(5_000);
  }
  checks.push(
    assert(
      refundUsedPreview?.status === "blocked" && refundUsedPreview.code === "USED",
      "refund release closes no-resale pass",
      refundUsedPreview
    )
  );

  out = await guestA.request("/api/recovery/preview", {
    method: "POST",
    body: { actor: "guestA", serial: serialMain, askPriceHbar: 21 },
  });
  checks.push(
    assert(
      out.res.ok && out.data?.status === "recommended" && out.data.previewId,
      "Person A recovery preview recommended",
      { status: out.res.status, data: out.data }
    )
  );

  out = await guestA.request("/api/recovery/confirm", {
    method: "POST",
    body: { actor: "guestA", previewId: out.data.previewId },
  });
  checks.push(
    assert(
      out.res.ok && out.data?.ok && out.data.receipt?.scheduleProof?.scheduleId,
      "Person A confirms recovery and creates schedule",
      { status: out.res.status, data: out.data }
    )
  );
  const receipt = out.data.receipt;

  out = await guestA.request("/api/recovery/preview", {
    method: "POST",
    body: { actor: "guestA", serial: serialMain, askPriceHbar: 21 },
  });
  checks.push(
    assert(
      out.data?.status === "already_listed",
      "already-listed recovery routes to listing",
      out.data
    )
  );

  let inspected;
  for (let i = 0; i < 12; i += 1) {
    out = await guestA.request("/api/automation/inspect", {
      method: "POST",
      body: { actor: "guestA", serial: serialMain },
    });
    if (!out.res.ok || !out.data?.ok) {
      throw new Error(`inspect failed ${out.res.status}: ${JSON.stringify(out.data)}`);
    }
    inspected = out.data;
    if (out.data.proof?.scheduleProof?.status === "executed") break;
    await sleep(10_000);
  }
  checks.push(
    assert(
      inspected?.proof?.scheduleProof?.status === "executed",
      "Schedule proof reaches executed status",
      inspected?.proof?.scheduleProof
    )
  );

  out = await guestB.request("/api/resale-buy", {
    method: "POST",
    body: { actor: "guestB", serial: serialMain },
  });
  checks.push(
    assert(out.res.ok && out.data?.ok, "Person B buys listed pass", {
      status: out.res.status,
      data: out.data,
    })
  );
  const buyTx = out.data.txId ?? out.data.transactionId;

  out = await issuer.request("/api/mark-used", {
    method: "POST",
    body: { serial: serialMain },
  });
  checks.push(
    assert(out.res.ok && out.data?.ok !== false, "Issuer marks main serial used", {
      status: out.res.status,
      data: out.data,
    })
  );
  const markUsedTx = out.data.transferTxId ?? out.data.txId ?? out.data.transactionId;

  let usedPreview;
  for (let i = 0; i < 6; i += 1) {
    out = await guestB.request("/api/recovery/preview", {
      method: "POST",
      body: { actor: "guestB", serial: serialMain, askPriceHbar: 21 },
    });
    usedPreview = out.data;
    if (out.data?.status === "blocked" && out.data.code === "USED") break;
    await sleep(5_000);
  }
  checks.push(
    assert(
      usedPreview?.status === "blocked" && usedPreview.code === "USED",
      "used recovery is blocked after Mirror catches up",
      usedPreview
    )
  );

  out = await guestA.request("/api/recovery/preview", {
    method: "POST",
    body: { actor: "guestA", serial: serialOpen, askPriceHbar: 16 },
  });
  checks.push(
    assert(
      out.data?.status === "blocked" && out.data.code === "NOT_HELD",
      "unheld open pass remains blocked",
      out.data
    )
  );

  const nft = await fetch(`${mirrorBase}/tokens/0.0.8505698/nfts/${serialMain}`).then(
    (res) => res.json()
  );
  checks.push(
    assert(
      nft.deleted === true && nft.account_id === null,
      "Mirror NFT is deleted after mark used",
      nft
    )
  );

  return {
    serials: { serialMain, serialNoResale, serialOpen },
    txs: {
      mainBookTx,
      buyTx,
      markUsedTx,
      refundReleaseTx: refundReceipt.releaseTxId,
      refundBurnTx: refundReceipt.burnTxId,
      refundAuditTx: refundReceipt.auditTxId,
    },
    refundReceiptId: refundReceipt.receiptId,
    receiptId: receipt.receiptId,
    schedule: inspected.proof.scheduleProof,
    checks,
  };
}

main()
  .then((summary) => {
    const compact = {
      ok: true,
      serials: summary.serials,
      txs: summary.txs,
      refundReceiptId: summary.refundReceiptId,
      receiptId: summary.receiptId,
      schedule: summary.schedule,
      checks: summary.checks.map((check) => check.label),
    };
    console.log(
      JSON.stringify(
        process.env.ETHGLOBAL_E2E_VERBOSE === "true" ? summary : compact,
        null,
        2
      )
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
