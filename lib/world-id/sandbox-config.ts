export const WORLD_ID_SANDBOX_APP_ID =
  "app_ba495b56fa36135edd63753effe511f7" as const;

export const WORLD_ID_SANDBOX_RP_ID = "rp_c3e6060f9b2b5593" as const;

// Fixed server-owned action for the ETHOnline Sandbox proof. Do not accept an
// arbitrary action from the client: the RP signer must not become a signing
// oracle for unrelated World ID requests.
export const WORLD_ID_SANDBOX_ACTION = "yourturn-recovery-sandbox-2026" as const;

// Public, non-identifying context bound into the proof. This is deliberately
// stable and contains no customer account, wallet, or World human identifier.
export const WORLD_ID_SANDBOX_SIGNAL = "yourturn-ethonline-recovery-v1" as const;

export const WORLD_ID_SANDBOX_ENVIRONMENT = "sandbox" as const;
