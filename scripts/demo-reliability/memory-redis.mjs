/**
 * In-memory stand-in for the Redis surface the recovery path uses.
 *
 * EXPLICIT LIMITS — this double does NOT prove:
 *   - key expiry / TTL behaviour (`ex` is recorded, never enforced);
 *   - real Redis Lua atomicity;
 *   - concurrency, multi-client races, or eviction;
 *   - Upstash/Vercel KV transport behaviour.
 * It reproduces only the single-threaded logical semantics of GET / SET NX /
 * and the three authority-boundary scripts. Any claim about atomicity or
 * expiry must come from a real Redis, not from this file.
 */
export function createMemoryRedis() {
  const kv = new Map();
  const ttlSeen = new Map();
  return {
    /** @returns keys, for assertions only */
    keys: (prefix = "") => [...kv.keys()].filter((k) => k.startsWith(prefix)),
    has: (key) => kv.has(key),
    ttlRecorded: (key) => ttlSeen.get(key) ?? null,
    rawDelete: (key) => kv.delete(key),

    async get(key) {
      const v = kv.get(key);
      return v === undefined ? null : v;
    },
    async set(key, value, options = {}) {
      if (options.nx && kv.has(key)) return null;
      if (options.ex != null) ttlSeen.set(key, options.ex); // recorded, NOT enforced
      kv.set(key, value);
      return "OK";
    },
    async eval(script, keys, args) {
      const cur = () => {
        const raw = kv.get(keys[0]);
        return raw == null ? 0 : Number(raw);
      };
      if (script.includes("if (current % 2) ~= 0 then\n  return -1") && !script.includes("expected")) {
        const c = cur();
        if (!Number.isFinite(c)) return -2;
        if (c % 2 !== 0) return -1;
        const next = c + 1; kv.set(keys[0], String(next)); return next;
      }
      if (script.includes("current ~= expected or (current % 2) == 0")) {
        const c = cur(), e = Number(args[0]);
        if (!Number.isFinite(c) || !Number.isFinite(e) || c !== e || c % 2 === 0) return -1;
        const next = c + 1; kv.set(keys[0], String(next)); return next;
      }
      if (script.includes('local stored = redis.call("SET", KEYS[2]')) {
        const c = cur(), e = Number(args[0]);
        if (!Number.isFinite(c) || !Number.isFinite(e) || c !== e || c % 2 !== 0) return -1;
        if (kv.has(keys[1])) return 0;
        kv.set(keys[1], args[1]); return 1;
      }
      throw new Error("memory-redis: unrecognised script");
    },
  };
}

/**
 * Models what `app/api/reset-demo/route.ts` ACTUALLY does.
 *
 * The route is a NETWORK-MUTATING BOOTSTRAP, not a Redis/UI reset:
 *   clearAllListings/clearAutomationProofs/clearRecoveryReceipts, then
 *   `mintSlotNfts(tokenId, metas)` -> NEW serials, then saveSlots(rebuilt).
 *
 * Therefore a real reset yields a DIFFERENT booking serial every time. The
 * earlier double restored the seed serial, which the route never does.
 *
 * It deliberately clears NO ledger/world/hedera namespace, because the route
 * does not. Consumed-replay evidence and monotonic authority versions survive
 * on purpose — deleting them is exactly what #17 forbids without Security review.
 *
 * `mintSlotNfts` is a real Hedera mint. Offline we only model its RESULT
 * (fresh serials); this is not proof that minting succeeds.
 */
export function modelResetDemoBootstrap(redis, appState) {
  appState.listings = [];
  appState.automationProofs = [];
  appState.recoveryReceipts = [];
  const before = appState.nextSerial;
  appState.slots = appState.slotsSeed.map((seed, i) => ({
    ...seed,
    serial: appState.nextSerial + i, // models mintSlotNfts() returning NEW serials
    holder: "maya",
  }));
  appState.nextSerial += appState.slotsSeed.length;
  return {
    mintedSerials: appState.slots.map((s) => s.serial),
    previousNextSerial: before,
    clearedAppCollections: ["listings", "automationProofs", "recoveryReceipts"],
    retainedAuthorityKeys: redis
      .keys("")
      .filter((k) =>
        k.startsWith("bookedrights:ledger:") ||
        k.startsWith("ethonline:hedera:") ||
        k.startsWith("bookedrights:world-agentkit:")),
  };
}
