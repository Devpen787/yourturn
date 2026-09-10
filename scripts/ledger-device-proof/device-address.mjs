#!/usr/bin/env node
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DeviceActionStatus,
  DeviceManagementKitBuilder,
} = require("@ledgerhq/device-management-kit");
const { SignerEthBuilder } = require("@ledgerhq/device-signer-kit-ethereum");
const {
  nodeHidTransportFactory,
} = require("@ledgerhq/device-transport-kit-node-hid");

const DERIVATION_PATH = "44'/60'/0'/0/0";

function usage() {
  console.log(`YourTurn Ledger signer-enrollment bootstrap

Usage:
  node device-address.mjs

Connect and unlock the Ledger. The Ethereum app may be opened by DMK.
The device will display the address for confirmation. This prints only the
public EVM address to enroll locally as LEDGER_GUEST_A_SIGNER_ADDRESS or
LEDGER_GUEST_B_SIGNER_ADDRESS; it never writes server configuration itself.
`);
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  usage();
  process.exit(0);
}

async function firstDevice(dmk) {
  return await new Promise((resolve, reject) => {
    let subscription;
    const timer = setTimeout(() => {
      subscription?.unsubscribe();
      reject(new Error("no Ledger device discovered within 30 seconds"));
    }, 30_000);
    subscription = dmk.listenToAvailableDevices({}).subscribe({
      next(devices) {
        if (!Array.isArray(devices) || devices.length === 0) return;
        clearTimeout(timer);
        subscription?.unsubscribe();
        resolve(devices[0]);
      },
      error(error) {
        clearTimeout(timer);
        reject(error);
      },
    });
  });
}

async function main() {
  const dmk = new DeviceManagementKitBuilder()
    .addTransport(nodeHidTransportFactory)
    .build();
  let sessionId = null;
  try {
    const device = await firstDevice(dmk);
    sessionId = await dmk.connect({ device });
    const signer = new SignerEthBuilder({ dmk, sessionId }).build();
    const action = signer.getAddress(DERIVATION_PATH, {
      checkOnDevice: true,
      returnChainCode: false,
      skipOpenApp: false,
    });

    const output = await new Promise((resolve, reject) => {
      action.observable.subscribe({
        next(state) {
          if (state.status === DeviceActionStatus.Pending) {
            const interaction = state.intermediateValue?.requiredUserInteraction;
            if (interaction) console.log(`device interaction: ${interaction}`);
          } else if (state.status === DeviceActionStatus.Completed) {
            resolve(state.output);
          } else if (state.status === DeviceActionStatus.Error) {
            reject(state.error);
          }
        },
        error: reject,
      });
    });

    if (!output?.address) throw new Error("Ledger returned no EVM address");
    console.log(`public Ledger EVM address: ${output.address}`);
    console.log(`derivation path: ${DERIVATION_PATH}`);
    console.log("Copy only this public address into trusted local server enrollment; never paste a seed/private key into GitHub.");
  } finally {
    if (sessionId) {
      try {
        await dmk.disconnect({ sessionId });
      } catch {}
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
