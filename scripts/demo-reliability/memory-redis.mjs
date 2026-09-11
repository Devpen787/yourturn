/**
 * Faithful in-memory stand-in for the Redis surface the integrated recovery
 * path uses: get / set(nx,ex) / eval of the three authority-boundary scripts.
 *
 * It is deliberately NOT a generic Redis mock. It implements exactly the
 * semantics the real Lua scripts have, so a harness failure means the product
 * semantics failed, not that the fake diverged.
 */
export function createMemoryRedis() {
  const kv = new Map();
  const store = {
    dump: () => new Map(kv),
    keys: (prefix) => [...kv.keys()].filter((k) => k.startsWith(prefix)),
    rawDelete: (key) => kv.delete(key),

    async get(key) {
      const v = kv.get(key);
      return v === undefined ? null : v;
    },
    async set(key, value, options = {}) {
      if (options.nx && kv.has(key)) return null;
      kv.set(key, value);
      return "OK";
    },
    async eval(script, keys, args) {
      const cur = () => {
        const raw = kv.get(keys[0]);
        return raw == null ? 0 : Number(raw);
      };
      // BEGIN: refuse if a mutation is already open (odd), else bump to odd
      if (script.includes('if (current % 2) ~= 0 then\n  return -1') && !script.includes("expected")) {
        const c = cur();
        if (!Number.isFinite(c)) return -2;
        if (c % 2 !== 0) return -1;
        const next = c + 1;
        kv.set(keys[0], String(next));
        return next;
      }
      // END: close the exact open mutation (odd -> even)
      if (script.includes("current ~= expected or (current % 2) == 0")) {
        const c = cur();
        const expected = Number(args[0]);
        if (!Number.isFinite(c) || !Number.isFinite(expected) || c !== expected || c % 2 === 0) return -1;
        const next = c + 1;
        kv.set(keys[0], String(next));
        return next;
      }
      // STORE-ACTIVE-IF-UNCHANGED: only while no mutation is open and version matches
      if (script.includes('local stored = redis.call("SET", KEYS[2]')) {
        const c = cur();
        const expected = Number(args[0]);
        if (!Number.isFinite(c) || !Number.isFinite(expected) || c !== expected || c % 2 !== 0) return -1;
        if (kv.has(keys[1])) return 0;
        kv.set(keys[1], args[1]);
        return 1;
      }
      throw new Error("memory-redis: unrecognised script");
    },
  };
  return store;
}

/**
 * Models EXACTLY what app/api/reset-demo/route.ts does today:
 * clearAllListings + clearAutomationProofs + clearRecoveryReceipts + rebuild slots.
 * It intentionally clears no ledger/hedera/world namespace, because production
 * does not. Do not "improve" this to make the two-run test pass.
 */
export function productionResetDemo(redis, appState) {
  appState.listings = [];
  appState.automationProofs = [];
  appState.recoveryReceipts = [];
  appState.slots = appState.slotsSeed.map((s) => ({ ...s }));
  return {
    clearedNamespaces: ["bookedrights:listings", "automation-proofs", "recovery-receipts", "bookedrights:slots"],
    untouchedNamespaces: redis
      .keys("")
      .filter((k) => k.startsWith("bookedrights:ledger:") || k.startsWith("ethonline:hedera:") || k.startsWith("bookedrights:world-agentkit:")),
  };
}
