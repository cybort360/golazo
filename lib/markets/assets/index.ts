import { MARKET_FLAGS } from "@/lib/markets/flags";
import { GOLAZO_SPL, NATIVE_SOL, type AssetDescriptor } from "@/lib/markets/assets/types";

export * from "@/lib/markets/assets/types";

/**
 * Select the active settlement asset based on feature flags. Native SOL is a
 * documented placeholder and is never returned while its flag is off; if it is
 * somehow enabled, we still refuse because no implementation exists yet.
 */
export function activeAsset(): AssetDescriptor {
  if (MARKET_FLAGS.enableNativeSolSettlement) {
    if (!NATIVE_SOL.implemented) {
      throw new Error(
        "native-SOL settlement is not implemented; enable NEXT_PUBLIC_ENABLE_DEVNET_SPL_ESCROW instead",
      );
    }
    return NATIVE_SOL;
  }
  return GOLAZO_SPL;
}
