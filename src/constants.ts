import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

export const PROTOCOL_ID = "1";
export const BIGINT_0 = BigInt.fromI32(0);
export const ADDRESS_ZERO = Address.fromHexString(
  "0x0000000000000000000000000000000000000000"
);

/**
 * Trending calculations are complex. to alleviate indexing computation load, we don't run calculations on blocks with timestamps older than this
 */
export const BEGIN_TRENDING_TIMESTAMP = 1710000000; // March 9 2024

export const BIGINT_WAD = BigInt.fromString("1000000000000000000");

export const CURRENCY_ETH = BigInt.fromI32(1);
export const CURRENCY_USD = BigInt.fromI32(2);

// latest hook address can be found in HookDeployed events emitted by jb721TiersHookDeployer
// e.g. https://etherscan.io/address/<deployer-address>#events
export const bannyNftHookAddress = Address.fromBytes(
  Bytes.fromHexString("0xa62531c7057c74fe47f68cb76c08e1ef3c8a60ee")
);
