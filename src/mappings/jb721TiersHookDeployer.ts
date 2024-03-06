import {
  Address,
  BigInt,
  Bytes,
  DataSourceContext,
  log,
} from "@graphprotocol/graph-ts";

import { HookDeployed } from "../../generated/JB721TiersHookDeployer/JB721TiersHookDeployer";
import { JB721TiersHook as JB721TiersHookTemplate } from "../../generated/templates";
import { JB721TiersHook } from "../../generated/JB721TiersHookDeployer/JB721TiersHook";
import { JB721TiersHookStore } from "../../generated/JB721TiersHookDeployer/JB721TiersHookStore";
// import { JB721Delegate3_4 } from "../../../generated/JBTiered721DelegateDeployer3_4/JB721Delegate3_4";
import { address_jb721TiersHookStore } from "../contractAddresses";
import { NFTCollection, NFTTier } from "../../generated/schema";
import { idForNFTTier } from "../utils/ids";

export function handleHookDeployed(event: HookDeployed): void {
  const address = event.params.newHook;

  /**
   * Create a new dataSource to track NFT mints & transfers
   */
  const jbTiered721DelegateContext = new DataSourceContext();
  jbTiered721DelegateContext.setBigInt("projectId", event.params.projectId);
  JB721TiersHookTemplate.createWithContext(address, jbTiered721DelegateContext);

  /**
   * Create collection entity
   */
  const collection = new NFTCollection(address.toHexString());
  collection.address = address;
  collection.projectId = event.params.projectId.toI32();
  collection.project = event.params.projectId.toString();
  collection.createdAt = event.block.timestamp.toI32();

  const jb721HookContract = JB721TiersHook.bind(Address.fromBytes(address));

  // Name
  const nameCall = jb721HookContract.try_name();
  if (nameCall.reverted) {
    log.error(
      "[jbTiered721DelegateDeployer_3_4:handleDelegateDeployed] name() reverted for {}",
      [address.toHexString()]
    );
    return;
  }
  collection.name = nameCall.value;

  // Symbol
  const symbolCall = jb721HookContract.try_symbol();
  if (symbolCall.reverted) {
    log.error(
      "[jbTiered721DelegateDeployer_3_4:handleDelegateDeployed] symbol() reverted for {}",
      [address.toHexString()]
    );
    return;
  }
  collection.symbol = symbolCall.value;

  collection.save();

  /**
   * Create entity for each tier in collection
   */
  if (!address_jb721TiersHookStore) {
    log.error(
      "[jb721TiersHookDeployer:handleHookDeployed] missing address_jb721TiersHookStore",
      []
    );
    return;
  }
  const jbTiered721DelegateStoreContract = JB721TiersHookStore.bind(
    Address.fromBytes(Bytes.fromHexString(address_jb721TiersHookStore!))
  );

  const maxTierCall = jbTiered721DelegateStoreContract.try_maxTierIdOf(address);
  if (maxTierCall.reverted) {
    // Will revert for non-tiered tokens, among maybe other reasons
    log.error(
      "[jb721TiersHookDeployer:handleHookDeployed] maxTier() reverted for {}",
      [address.toHexString()]
    );
    return;
  }

  const tiersCall = jbTiered721DelegateStoreContract.try_tiersOf(
    address,
    [], // Empty array to get all categories
    true,
    BigInt.fromI32(1),
    maxTierCall.value
  );
  if (tiersCall.reverted) {
    // Will revert for non-tiered tokens, among maybe other reasons
    log.error(
      "[jbTiered721DelegateDeployer:handleDelegateDeployed] tiers() reverted for address {}",
      [address.toHexString()]
    );
    return;
  }

  for (let i = 0; i < tiersCall.value.length; i++) {
    const tier = tiersCall.value[i];

    const nftTier = new NFTTier(idForNFTTier(address, tier.id));
    nftTier.collection = address.toHexString();
    nftTier.tierId = tier.id.toI32();
    nftTier.allowOwnerMint = tier.allowOwnerMint;
    nftTier.cannotBeRemoved = tier.cannotBeRemoved;
    nftTier.votingUnits = tier.votingUnits;
    nftTier.price = tier.price;
    nftTier.encodedIpfsUri = tier.encodedIPFSUri;
    nftTier.resolvedUri = tier.resolvedUri;
    nftTier.initialSupply = tier.initialSupply;
    nftTier.remainingSupply = tier.initialSupply;
    nftTier.reserveFrequency = tier.reserveFrequency;
    nftTier.reserveBeneficiary = tier.reserveBeneficiary;
    nftTier.transfersPausable = tier.transfersPausable;
    nftTier.collection = address.toHexString();
    if (tier.category) nftTier.category = tier.category.toI32();
    nftTier.createdAt = event.block.timestamp.toI32();
    nftTier.save();
  }
}
