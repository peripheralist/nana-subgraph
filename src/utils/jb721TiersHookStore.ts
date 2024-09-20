import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import {
  JB721TiersHookStore,
  JB721TiersHookStore__tierOfResultValue0Struct,
} from "../../generated/JB721TiersHookDeployer/JB721TiersHookStore";
import { address_jb721TiersHookStore } from "../contractAddresses";

export function getAllTiers(
  address: Address
): JB721TiersHookStore__tierOfResultValue0Struct[] {
  const logTag = `getAllTiers`;

  const jb721TiersHookStoreContract = JB721TiersHookStore.bind(
    Address.fromBytes(Bytes.fromHexString(address_jb721TiersHookStore!))
  );

  const maxTierCall = jb721TiersHookStoreContract.try_maxTierIdOf(address);
  if (maxTierCall.reverted) {
    // Will revert for non-tiered tokens, among maybe other reasons
    log.error(`[${logTag}] maxTierIdOf() reverted for hook {}`, [
      address.toHexString(),
    ]);
    return [];
  }

  const tiers: JB721TiersHookStore__tierOfResultValue0Struct[] = [];

  // NOTE: assumes tier IDs are all sequential.
  for (
    let i = BigInt.fromI32(1);
    i <= maxTierCall.value;
    i = i.plus(BigInt.fromI32(1))
  ) {
    const tierCall = jb721TiersHookStoreContract.try_tierOf(address, i, true);

    if (tierCall.reverted) {
      // Will revert for non-tiered tokens, among maybe other reasons
      log.error(`[${logTag}] tierOf() reverted for hook {}, id: {}`, [
        address.toHexString(),
        i.toString(),
      ]);
      continue;
    }

    tiers.push(tierCall.value);
  }

  return tiers;
}
