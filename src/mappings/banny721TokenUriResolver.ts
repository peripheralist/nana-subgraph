import { Address, log } from "@graphprotocol/graph-ts";
import {
  DecorateBanny,
  SetSvgBaseUri,
  SetSvgContent,
} from "../../generated/Banny721TokenUriResolver/Banny721TokenUriResolver";
import { JB721TiersHook } from "../../generated/JB721TiersHookDeployer/JB721TiersHook";
import { DecorateBannyEvent, NFT, NFTTier } from "../../generated/schema";
import { bannyNftHookAddress } from "../constants";
import { getSvgOf } from "../utils/banny721Resolver";
import { idForDecorateBannyEvent, idForNFT, idForNFTTier } from "../utils/ids";
import { getAllTiers } from "../utils/jb721TiersHookStore";

export function handleSetSvgBaseUri(event: SetSvgBaseUri): void {
  const address = bannyNftHookAddress;

  const tiers = getAllTiers(address);

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];

    const id = idForNFTTier(address, tier.id);

    const nftTier = NFTTier.load(id);
    if (!nftTier) {
      log.error(
        `banny721TokenUriResolver:handleSetSvgBaseUri Missing NFTTier with id: {}`,
        [id]
      );
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
