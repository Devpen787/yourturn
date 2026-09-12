import { createPrepareRetainedRecoveryAdapter } from "../hedera-agent-kit/prepare-retained-recovery.ts";
import type { RecoveryOperation } from "../ledger/recovery-mandate-operation.ts";

type PrepareFactory = typeof createPrepareRetainedRecoveryAdapter;

export function createSingleBeginComposition(input: {
  prepareDependencies: Parameters<PrepareFactory>[0];
  /** Test seam only; production omits this. */
  prepareFactory?: PrepareFactory;
}) {
  return Object.freeze({
    async run(args: {
      operation: RecoveryOperation;
      paymentAuthorization: { signatureHex: string };
      revalidate(operation: Readonly<RecoveryOperation>): Promise<void>;
    }) {
      if (args.operation.phase !== "claimed") throw new Error("CLAIMED_OPERATION_REQUIRED");
      if (typeof args.revalidate !== "function") throw new Error("REVALIDATION_REQUIRED");
      const base = input.prepareDependencies.resolveCanonicalState;
      const adapter = (input.prepareFactory ?? createPrepareRetainedRecoveryAdapter)({
        ...input.prepareDependencies,
        resolveCanonicalState: async operation => {
          await args.revalidate(Object.freeze({ ...operation }));
          return base(Object.freeze({ ...operation }));
        },
      });
      return adapter.prepareAndRetain({
        operation: Object.freeze({ ...args.operation }),
        paymentAuthorization: { signatureHex: args.paymentAuthorization.signatureHex },
      });
    },
  });
}
