import { Address, DataSourceContext, log } from "@graphprotocol/graph-ts";

import { JB721TiersHook } from "../../generated/JB721TiersHookDeployer/JB721TiersHook";
import { HookDeployed } from "../../generated/JB721TiersHookDeployer/JB721TiersHookDeployer";
import { NFTCollection, NFTTier } from "../../generated/schema";
import { JB721TiersHook as JB721TiersHookTemplate } from "../../generated/templates";
import { getSvgOf } from "../utils/banny721Resolver";
import { idForNFTTier } from "../utils/ids";
import { getAllTiers } from "../utils/jb721TiersHookStore";

export function handleHookDeployed(event: HookDeployed): void {
  const logTag = "jb721TiersHookDeployer:handleHookDeployed";

  const address = event.params.hook;

  /**
   * Create a new dataSource to track NFT mints & transfers
   */
  const jb721TiersHookContext = new DataSourceContext();
  jb721TiersHookContext.setBigInt("projectId", event.params.projectId);
  JB721TiersHookTemplate.createWithContext(address, jb721TiersHookContext);

  /**
   * Create collection entity
   */
  const collection = new NFTCollection(address.toHexString());
  collection.address = address;
  collection.projectId = event.params.projectId.toI32();
  collection.project = event.params.projectId.toString();
  collection.createdAt = event.block.timestamp.toI32();

  const jb721TiersHookContract = JB721TiersHook.bind(
    Address.fromBytes(address)
  );

  // Name
  const nameCall = jb721TiersHookContract.try_name();
  if (nameCall.reverted) {
    log.error(`[${logTag}] name() reverted for {}`, [address.toHexString()]);
    return;
  }
  collection.name = nameCall.value;

  // Symbol
  const symbolCall = jb721TiersHookContract.try_symbol();
  if (symbolCall.reverted) {
    log.error(`[${logTag}] symbol() reverted for {}`, [address.toHexString()]);
    return;
  }
  collection.symbol = symbolCall.value;

  collection.save();

  /**
   * Create entity for each tier in collection
   */
  const tiers = getAllTiers(address);

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];

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
    nftTier.category = tier.category;
    nftTier.createdAt = event.block.timestamp.toI32();
    nftTier.svg = getSvgOf(tier.id);

    nftTier.save();
  }
}
