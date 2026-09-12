import assert from "node:assert/strict";
import { resolveRecoveryRoyalty, validateRecoveryRoyaltyReceipt,
  royaltyPolicySchema, royaltyEconomicsSchema, bookingFeeMetadataSchema,
} from "../lib/hedera-agent-kit/recovery-royalty.ts";

let passed = 0;
const check = (name, test) => { test(); passed += 1; console.log(`PASS ${name}`); };
const base = () => ({
  grossAtomicUnits: "45000000", holderAccountId: "0.0.10", buyerAccountId: "0.0.20",
  bookingTokenId: "0.0.30",
  policy: { numerator: "1", denominator: "10", collectorAccountId: "0.0.40" },
  metadata: { tokenId: "0.0.30", treasuryAccountId: "0.0.50", feeScheduleKey: null,
    fixedFees: [], fractionalFees: [], royaltyFees: [{ numerator: "1", denominator: "10",
      collectorAccountId: "0.0.40", allCollectorsAreExempt: false, fallbackFee: null }] },
});
const denial = (name, mutate, code) => check(name, () => {
  const input = base(); mutate(input);
  assert.throws(() => resolveRecoveryRoyalty(input), { message: `ROYALTY_${code}` });
});
const rate = (numerator, denominator, gross = "45000000") => {
  const input = base(); input.grossAtomicUnits = gross;
  Object.assign(input.policy, { numerator, denominator });
  Object.assign(input.metadata.royaltyFees[0], { numerator, denominator });
  return input;
};

check("45 gross at 10 percent credits seller 40.5 and collector 4.5", () => {
  const result = resolveRecoveryRoyalty(base());
  assert.equal(result.sellerNetAtomicUnits, "40500000");
  assert.equal(result.royaltyAmountAtomicUnits, "4500000");
  assert.equal(result.exemption, "none");
  assert.equal(royaltyEconomicsSchema.safeParse(result).success, true);
});
check("32 gross at 10 percent yields 28.8 below active 30 minimum", () => {
  const result = resolveRecoveryRoyalty({ ...base(), grossAtomicUnits: "32000000" });
  assert.equal(result.sellerNetAtomicUnits, "28800000");
  assert.ok(BigInt(result.sellerNetAtomicUnits) < 30000000n);
});
for (const [numerator, denominator, fee, net] of [
  ["1", "20", "2250000", "42750000"], ["1", "4", "11250000", "33750000"],
  ["1", "1", "45000000", "0"],
]) check(`owner permits ${numerator}/${denominator} without 10 percent cap`, () => {
  const result = resolveRecoveryRoyalty(rate(numerator, denominator));
  assert.equal(result.royaltyAmountAtomicUnits, fee); assert.equal(result.sellerNetAtomicUnits, net);
});
check("zero owner policy requires empty chain fee schedule", () => {
  const input = base(); input.policy = { numerator: "0", denominator: "100", collectorAccountId: null };
  input.metadata.royaltyFees = [];
  assert.equal(resolveRecoveryRoyalty(input).sellerNetAtomicUnits, "45000000");
});
check("equivalent chain fraction preserves provider representation", () => {
  const input = base(); input.policy.numerator = "10"; input.policy.denominator = "100";
  const result = resolveRecoveryRoyalty(input);
  assert.equal(result.numerator, "10"); assert.equal(result.denominator, "100");
});
for (const [gross, fee] of [["1", "0"], ["9", "0"], ["10", "1"], ["11", "1"]]) {
  check(`integer flooring at gross ${gross}`, () => {
    const result = resolveRecoveryRoyalty(rate("1", "10", gross));
    assert.equal(result.royaltyAmountAtomicUnits, fee);
    assert.equal(BigInt(result.sellerNetAtomicUnits) + BigInt(fee), BigInt(gross));
  });
}
check("int64 maximum and intermediate multiplication remain exact", () => {
  const max = "9223372036854775807";
  const result = resolveRecoveryRoyalty(rate(max, max, max));
  assert.equal(result.royaltyAmountAtomicUnits, max); assert.equal(result.sellerNetAtomicUnits, "0");
});
for (const bad of ["9223372036854775808", "-1", "01", "1.0", "1e6", "", "0"]) {
  denial(`invalid gross ${JSON.stringify(bad)}`, x => { x.grossAtomicUnits = bad; }, "INPUT_INVALID");
}
for (const [key, bad] of [["numerator", "9223372036854775808"], ["numerator", "11"],
  ["numerator", "-1"], ["denominator", "0"], ["denominator", "01"], ["denominator", "no"]]) {
  denial(`invalid policy ${key}=${bad}`, x => { x.policy[key] = bad; }, "POLICY_INVALID");
}
denial("nonzero policy without collector", x => { x.policy.collectorAccountId = null; }, "POLICY_INVALID");
denial("zero policy with collector", x => { x.policy.numerator = "0"; }, "POLICY_INVALID");
denial("missing policy", x => { delete x.policy; }, "POLICY_INVALID");
denial("unknown policy field", x => { x.policy.recommendedOnly = true; }, "POLICY_INVALID");
denial("different chain fraction", x => { x.metadata.royaltyFees[0].denominator = "20"; }, "POLICY_MISMATCH");
denial("different chain collector", x => { x.metadata.royaltyFees[0].collectorAccountId = "0.0.41"; }, "POLICY_MISMATCH");
denial("missing positive chain fee", x => { x.metadata.royaltyFees = []; }, "POLICY_MISMATCH");
denial("zero policy with nonzero chain fee", x => {
  x.policy = { numerator: "0", denominator: "1", collectorAccountId: null };
}, "POLICY_MISMATCH");
denial("wrong booking token metadata", x => { x.metadata.tokenId = "0.0.31"; }, "TOKEN_MISMATCH");
denial("missing metadata", x => { delete x.metadata; }, "METADATA_INVALID");
denial("missing fee category", x => { delete x.metadata.fixedFees; }, "METADATA_INVALID");
denial("mutable chain fee schedule", x => { x.metadata.feeScheduleKey = "key"; }, "METADATA_INVALID");
denial("fixed fee", x => { x.metadata.fixedFees = [{}]; }, "METADATA_INVALID");
denial("fractional fee", x => { x.metadata.fractionalFees = [{}]; }, "METADATA_INVALID");
denial("second royalty", x => { x.metadata.royaltyFees.push({ ...x.metadata.royaltyFees[0] }); }, "METADATA_INVALID");
denial("fallback royalty", x => { x.metadata.royaltyFees[0].fallbackFee = {}; }, "METADATA_INVALID");
denial("unknown metadata category", x => { x.metadata.extraFees = []; }, "METADATA_INVALID");
denial("unknown royalty field", x => { x.metadata.royaltyFees[0].ignored = true; }, "METADATA_INVALID");
denial("seller buyer collision", x => { x.buyerAccountId = x.holderAccountId; }, "ROLE_COLLISION");
denial("buyer collector unsupported", x => { x.buyerAccountId = "0.0.40"; }, "BUYER_COLLECTOR_UNSUPPORTED");
for (const [holder, exemption] of [["0.0.50", "treasury"], ["0.0.40", "collector"]]) {
  for (const allCollectorsAreExempt of [false, true]) {
    check(`sender ${exemption} exemption with allCollectorsAreExempt=${allCollectorsAreExempt}`, () => {
      const input = base(); input.holderAccountId = holder;
      input.metadata.royaltyFees[0].allCollectorsAreExempt = allCollectorsAreExempt;
      const result = resolveRecoveryRoyalty(input);
      assert.equal(result.exemption, exemption); assert.equal(result.royaltyAmountAtomicUnits, "0");
      assert.equal(result.sellerNetAtomicUnits, "45000000");
    });
  }
}
check("agent collector is not seller exemption", () => {
  // Agent is 0.0.40. Its role is deliberately absent from the royalty interface.
  assert.equal(resolveRecoveryRoyalty(base()).royaltyAmountAtomicUnits, "4500000");
});
check("metadata hash includes complete normalized policy and stable ordering", () => {
  const input = base(); const original = resolveRecoveryRoyalty(input);
  input.metadata = Object.fromEntries(Object.entries(input.metadata).reverse());
  input.metadata.royaltyFees[0] = Object.fromEntries(Object.entries(input.metadata.royaltyFees[0]).reverse());
  assert.equal(resolveRecoveryRoyalty(input).feeMetadataHash, original.feeMetadataHash);
  input.metadata.royaltyFees[0].allCollectorsAreExempt = true;
  assert.notEqual(resolveRecoveryRoyalty(input).feeMetadataHash, original.feeMetadataHash);
});
check("exported schemas reject hidden fields and invalid int64 identities", () => {
  assert.equal(royaltyPolicySchema.safeParse({ ...base().policy, other: true }).success, false);
  assert.equal(bookingFeeMetadataSchema.safeParse({ ...base().metadata, treasuryAccountId: "0.0.9223372036854775808" }).success, false);
});

const receipt = () => {
  const input = base();
  const expected = { operationId: "op-1", transactionId: "0.0.60@1700000000.000000000",
    transactionMemo: `yt:pay:v2:${"a".repeat(64)}`,
    bookingTokenId: input.bookingTokenId, serial: 213, holderAccountId: input.holderAccountId,
    buyerAccountId: input.buyerAccountId, settlementTokenId: "0.0.429274",
    grossAtomicUnits: input.grossAtomicUnits, economics: resolveRecoveryRoyalty(input) };
  const observed = { operationId: expected.operationId, transactionId: expected.transactionId,
    transactionMemo: expected.transactionMemo, status: "SUCCESS",
    nftTransfers: [{ tokenId: input.bookingTokenId, serial: 213,
      senderAccountId: input.holderAccountId, receiverAccountId: input.buyerAccountId }],
    tokenTransfers: [{ tokenId: "0.0.429274", accountId: "0.0.20", amountAtomicUnits: "-45000000" },
      { tokenId: "0.0.429274", accountId: "0.0.10", amountAtomicUnits: "40500000" },
      { tokenId: "0.0.429274", accountId: "0.0.40", amountAtomicUnits: "4500000" }] };
  return { expected, observed };
};
check("exact final normalized receipt returns immutable economics without assessed fee fields", () => {
  const { expected, observed } = receipt(); observed.tokenTransfers.reverse();
  const result = validateRecoveryRoyaltyReceipt(expected, observed);
  assert.deepEqual(result, expected.economics); assert.ok(Object.isFrozen(result));
});
for (const [name, mutate] of [
  ["operation", x => { x.operationId = "other"; }],
  ["transaction", x => { x.transactionId = "0.0.60@1700000001.000000000"; }],
  ["commitment memo", x => { x.transactionMemo = `yt:pay:v2:${"b".repeat(64)}`; }],
  ["absent commitment memo", x => { delete x.transactionMemo; }],
  ["non-success", x => { x.status = "PENDING"; }],
  ["NFT serial", x => { x.nftTransfers[0].serial += 1; }],
  ["NFT receiver", x => { x.nftTransfers[0].receiverAccountId = "0.0.90"; }],
  ["duplicate NFT", x => { x.nftTransfers.push({ ...x.nftTransfers[0] }); }],
  ["missing NFT", x => { x.nftTransfers = []; }],
  ["seller gross instead of net", x => { x.tokenTransfers[1].amountAtomicUnits = "45000000"; }],
  ["wrong collector", x => { x.tokenTransfers[2].accountId = "0.0.90"; }],
  ["wrong token", x => { x.tokenTransfers[0].tokenId = "0.0.90"; }],
  ["extra token row", x => { x.tokenTransfers.push({ ...x.tokenTransfers[0] }); }],
  ["duplicate token account", x => { x.tokenTransfers[1] = { ...x.tokenTransfers[0] }; }],
  ["missing collector row", x => { x.tokenTransfers.pop(); }],
  ["unknown receipt field", x => { x.ignoredTransfers = []; }],
]) check(`receipt rejects ${name}`, () => {
  const { expected, observed } = receipt(); mutate(observed);
  assert.throws(() => validateRecoveryRoyaltyReceipt(expected, observed), /^Error: ROYALTY_/);
});
check("receipt rejects inconsistent expected math", () => {
  const { expected, observed } = receipt();
  expected.economics = { ...expected.economics, royaltyAmountAtomicUnits: "0" };
  assert.throws(() => validateRecoveryRoyaltyReceipt(expected, observed), /ROYALTY_RECEIPT_ECONOMICS_MISMATCH/);
});
for (const scenario of ["zero", "treasury", "collector", "floor-to-zero", "100-percent"]) {
  check(`receipt exactly handles ${scenario} credits`, () => {
    const input = base();
    if (scenario === "zero") {
      input.policy = { numerator: "0", denominator: "1", collectorAccountId: null };
      input.metadata.royaltyFees = [];
    }
    if (scenario === "treasury") input.holderAccountId = input.metadata.treasuryAccountId;
    if (scenario === "collector") input.holderAccountId = input.policy.collectorAccountId;
    if (scenario === "floor-to-zero") input.grossAtomicUnits = "1";
    if (scenario === "100-percent") {
      input.policy.denominator = "1"; input.metadata.royaltyFees[0].denominator = "1";
    }
    const { expected, observed } = receipt();
    expected.holderAccountId = input.holderAccountId;
    expected.grossAtomicUnits = input.grossAtomicUnits;
    expected.economics = resolveRecoveryRoyalty(input);
    observed.nftTransfers[0].senderAccountId = input.holderAccountId;
    observed.tokenTransfers = [{ tokenId: expected.settlementTokenId, accountId: input.buyerAccountId,
      amountAtomicUnits: `-${input.grossAtomicUnits}` }];
    if (expected.economics.sellerNetAtomicUnits !== "0") observed.tokenTransfers.push({
      tokenId: expected.settlementTokenId, accountId: input.holderAccountId,
      amountAtomicUnits: expected.economics.sellerNetAtomicUnits });
    if (expected.economics.royaltyAmountAtomicUnits !== "0") observed.tokenTransfers.push({
      tokenId: expected.settlementTokenId, accountId: input.policy.collectorAccountId,
      amountAtomicUnits: expected.economics.royaltyAmountAtomicUnits });
    assert.deepEqual(validateRecoveryRoyaltyReceipt(expected, observed), expected.economics);
  });
}
console.log(JSON.stringify({ status: "PASS", checks: passed, scope: "LOCAL_PURE_ROYALTY_AND_NORMALIZED_RECEIPT_ONLY" }));
