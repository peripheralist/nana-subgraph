import { Address, log } from "@graphprotocol/graph-ts";
import {
  DecorateBanny,
  SetSvgContent,
} from "../../generated/Banny721TokenUriResolver/Banny721TokenUriResolver";
import { JB721TiersHook } from "../../generated/JB721TiersHookDeployer/JB721TiersHook";
import { NFT, NFTTier } from "../../generated/schema";
import { bannyNftHookAddress } from "../constants";
import { getSvgOf } from "../utils/banny721Resolver";
import { idForNFT, idForNFTTier } from "../utils/ids";

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
}
