import { createPrepareRetainedRecoveryAdapter } from "../hedera-agent-kit/prepare-retained-recovery.ts";
import type { RecoveryOperation } from "../ledger/recovery-mandate-operation.ts";

export function createSingleBeginComposition(input: {
  prepareDependencies: Parameters<typeof createPrepareRetainedRecoveryAdapter>[0];
}) {
  return Object.freeze({
    async run(args: {
      operation: RecoveryOperation;
      paymentAuthorization: { signatureHex: string };
      revalidate(operation: Readonly<RecoveryOperation>): Promise<void>;
    }) {
      if (args.operation.phase !== "claimed") throw new Error("CLAIMED_OPERATION_REQUIRED");
      const base = input.prepareDependencies.resolveCanonicalState;
      const adapter = createPrepareRetainedRecoveryAdapter({
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
