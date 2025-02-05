import { Address, Bytes, log } from "@graphprotocol/graph-ts";
import {
  DecorateBanny,
  SetSvgBaseUri,
  SetSvgContent,
  SetProductName,
} from "../../generated/Banny721TokenUriResolver/Banny721TokenUriResolver";
import { JB721TiersHook } from "../../generated/JB721TiersHookDeployer/JB721TiersHook";
import { DecorateBannyEvent, NFT, NFTTier } from "../../generated/schema";
import { bannyNftHookAddress } from "../constants";
import { getSvgOf } from "../utils/banny721Resolver";
import { idForDecorateBannyEvent, idForNFT, idForNFTTier } from "../utils/ids";
import { getAllTiers } from "../utils/jb721TiersHookStore";
import { address_jb721TiersHookStore } from "../contractAddresses";
import { JB721TiersHookStore } from "../../generated/JB721TiersHookDeployer/JB721TiersHookStore";

export function handleSetProductName(event: SetProductName): void {
  const address = bannyNftHookAddress;
  const id = idForNFTTier(address, event.params.upc);
  const nftTier = NFTTier.load(id);

  if (!nftTier) {
    log.error(
      `[handleSetProductName] Missing NFTTier with id: {} (block: {})`,
      [id, event.block.number.toString()]
    );
    return;
  }

  // Get resolvedUri from tier call
  if (!address_jb721TiersHookStore) {
    log.error(`[handleSetProductName] missing address_jb721TiersHookStore`, []);
    return;
  }

  const jb721TiersHookStoreContract = JB721TiersHookStore.bind(
    Address.fromBytes(Bytes.fromHexString(address_jb721TiersHookStore!))
  );

  const tierCall = jb721TiersHookStoreContract.try_tierOf(
    address,
    event.params.upc,
    true
  );

  if (tierCall.reverted) {
    // Will revert for non-tiered tokens, among maybe other reasons
    // Logged on 3/3/24 v8.1.7: ERRO [jb721_v3_4:handleTransfer] tierOf() reverted for address 0xa8e6d676895b0690751ab1eaee09e15a3905d1b5, tierId 2, data_source: JB721Delegate3_4, sgd: 2599, subgraph_id: QmNT7qKcjCnvnPt7xNUr1azCkNBC64hrupuL1maedavFT1, component: SubgraphInstanceManager > UserMapping
    log.error(
      `[handleSetProductName] tierOf() reverted for address {}, tierId {} (block {})`,
      [
        address.toHexString(),
        event.params.upc.toString(),
        event.block.number.toString(),
      ]
    );
  } else {
    nftTier.resolvedUri = tierCall.value.resolvedUri;
    nftTier.encodedIpfsUri = tierCall.value.encodedIPFSUri;
    nftTier.svg = getSvgOf(event.params.upc);

    nftTier.save();
  }
}

export function handleSetSvgBaseUri(event: SetSvgBaseUri): void {
  const address = bannyNftHookAddress;

  const tiers = getAllTiers(address);

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];

    const id = idForNFTTier(address, tier.id);

    const nftTier = NFTTier.load(id);
    if (!nftTier) {
      log.error(`[handleSetSvgBaseUri] Missing NFTTier with id: {}`, [id]);
      continue;
    }

    nftTier.encodedIpfsUri = tier.encodedIPFSUri;
    nftTier.resolvedUri = tier.resolvedUri;
    nftTier.svg = getSvgOf(tier.id);

    nftTier.save();
  }
}

export function handleSetSvgContent(event: SetSvgContent): void {
  const tierId = event.params.upc;

  const idOfTier = idForNFTTier(bannyNftHookAddress, tierId);

  const tier = NFTTier.load(idOfTier);

  if (tier) {
    tier.svg = getSvgOf(tierId);
    tier.save();
  }
}

export function handleDecorateBanny(event: DecorateBanny): void {
  const tokenId = event.params.nakedBannyId;

  const bannyToken = NFT.load(idForNFT(bannyNftHookAddress, tokenId));

  if (!bannyToken) {
    log.error(
      "[banny721TokenUriResolver:handleDecorateBanny] missing token with ID:{}",
      [tokenId.toString()]
    );
    return;
  }

  const jb721TiersHookContract = JB721TiersHook.bind(
    Address.fromBytes(bannyNftHookAddress)
  );

  const tokenUriCall = jb721TiersHookContract.try_tokenURI(tokenId);
  if (tokenUriCall.reverted) {
    log.error(
      "[banny721TokenUriResolver:handleDecorateBanny] tokenURI() reverted for tokenId:{}",
      [tokenId.toString()]
    );
    return;
  }

  bannyToken.tokenUri = tokenUriCall.value;

  bannyToken.save();

  const decorateEvent = new DecorateBannyEvent(
    idForDecorateBannyEvent(event.transaction.hash, event.transactionLogIndex)
  );
  decorateEvent.timestamp = event.block.timestamp.toI32();
  decorateEvent.txHash = event.transaction.hash;
  decorateEvent.caller = event.params.caller;
  decorateEvent.nakedBannyId = event.params.nakedBannyId;
  decorateEvent.outfitIds = event.params.outfitIds;
  decorateEvent.worldId = event.params.worldId;
  decorateEvent.save();
}
