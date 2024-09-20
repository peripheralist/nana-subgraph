import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

export const PROTOCOL_ID = "1";
export const MAX_REDEMPTION_RATE = 10_000;
export const BITS_8 = 0b11111111;
export const BITS_16 = 0b1111111111111111;
export const BIGINT_0 = BigInt.fromI32(0);
export const BIGINT_1 = BigInt.fromI32(1);
export const ADDRESS_ZERO = Address.fromHexString(
  "0x0000000000000000000000000000000000000000"
);

/**
 * Trending calculations are complex. to alleviate indexing computation load, we don't run calculations on blocks with timestamps older than this
 */
export const BEGIN_TRENDING_TIMESTAMP = 1652328000;

export const BIGINT_WAD = BigInt.fromString("1000000000000000000");

export const V1_CURRENCY_USD = BigInt.fromI32(1);
export const V2V3_CURRENCY_ETH = BigInt.fromI32(1);
export const V2V3_CURRENCY_USD = BigInt.fromI32(2);

// latest hook address can be found in HookDeployed events emitted by jb721TiersHookDeployer
// e.g. https://etherscan.io/address/<deployer-address>#events
export const bannyNftHookAddress = Address.fromBytes(
  Bytes.fromHexString("0x53434b548f2644ae74ae12ff4156bf951261157b")
);
