import { appendFileSync } from "node:fs";

const MIRROR = "https://testnet.mirrornode.hedera.com/api/v1";
const usdcTokenId = "0.0.429274";
const minimumAtomicUnits = 40_000_000n;
const bookingTokenId = process.env.BOOKED_RIGHTS_TOKEN_ID ?? "0.0.8505698";
const guestA = process.env.HEDERA_GUEST_A_ID ?? "0.0.8504405";
const treasury = process.env.HEDERA_TREASURY_ID ?? "0.0.8504300";
const receiver = process.env.HEDERA_GUEST_B_ID ?? "0.0.8504715";

if ((process.env.HEDERA_NETWORK ?? "testnet").toLowerCase() !== "testnet") {
  throw new Error("usdc_recovery_role_preflight_refuses_non_testnet");
}

async function mirrorJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`mirror_http_${response.status}:${url}`);
  return response.json();
}

async function state(accountId) {
  const nftUrl = `${MIRROR}/accounts/${accountId}/nfts?token.id=${bookingTokenId}&limit=100`;
  const tokenUrl = `${MIRROR}/accounts/${accountId}/tokens?token.id=${usdcTokenId}&limit=1`;
  const [nfts, tokens] = await Promise.all([mirrorJson(nftUrl), mirrorJson(tokenUrl)]);
  const booking = (nfts.nfts ?? []).find((nft) => nft.token_id === bookingTokenId);
  const usdc = (tokens.tokens ?? []).find((token) => token.token_id === usdcTokenId);
  return {
    accountId,
    bookingSerial: booking ? Number(booking.serial_number) : null,
    usdcAssociated: Boolean(usdc),
    usdcAtomicUnits: usdc ? BigInt(usdc.balance) : 0n,
    nftMirror: nftUrl,
    usdcMirror: tokenUrl,
  };
}

const [guestAState, treasuryState] = await Promise.all([
  state(guestA),
  state(treasury),
]);

const candidates = [
  { holder: guestAState, spender: treasuryState },
  { holder: treasuryState, spender: guestAState },
];
const selected = candidates.find(
  ({ holder, spender }) =>
    Number.isSafeInteger(holder.bookingSerial) &&
    holder.bookingSerial > 0 &&
    spender.usdcAtomicUnits >= minimumAtomicUnits
);

const publicState = {
  network: "testnet",
  bookingTokenId,
  receiverAccountId: receiver,
  usdcTokenId,
  requiredUsdcAtomicUnits: minimumAtomicUnits.toString(),
  accounts: [guestAState, treasuryState].map((item) => ({
    accountId: item.accountId,
    bookingSerial: item.bookingSerial,
    usdcAssociated: item.usdcAssociated,
    usdcAtomicUnits: item.usdcAtomicUnits.toString(),
    nftMirror: item.nftMirror,
    usdcMirror: item.usdcMirror,
  })),
};

if (!selected) {
  console.log(JSON.stringify({ ok: false, status: "no_viable_existing_keyed_role_pair", ...publicState }, null, 2));
  process.exit(3);
}

const githubEnv = process.env.GITHUB_ENV;
if (!githubEnv) throw new Error("GITHUB_ENV is required for role preflight");
appendFileSync(
  githubEnv,
  [
    `HEDERA_RECOVERY_HOLDER_ID=${selected.holder.accountId}`,
    `HEDERA_RECOVERY_SPENDER_ID=${selected.spender.accountId}`,
    `HEDERA_DELEGATION_SERIAL=${selected.holder.bookingSerial}`,
  ].join("\n") + "\n"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      status: "viable_existing_keyed_role_pair_selected",
      ...publicState,
      selected: {
        holderAccountId: selected.holder.accountId,
        spenderAccountId: selected.spender.accountId,
        serial: selected.holder.bookingSerial,
        spenderUsdcAtomicUnits: selected.spender.usdcAtomicUnits.toString(),
      },
    },
    null,
    2
  )
);
