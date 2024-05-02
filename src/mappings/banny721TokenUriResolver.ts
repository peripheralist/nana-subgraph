import { log } from "@graphprotocol/graph-ts";
import {
  DecorateBanny,
  SetSvgContent,
} from "../../generated/Banny721TokenUriResolver/Banny721TokenUriResolver";
import { DecoratedBanny, NFTTier } from "../../generated/schema";
import { BANNY_CATEGORIES, bannyNftCollection } from "../constants";
import { getSvgOf } from "../utils/banny721Resolver";
import { idForNFT, idForNFTTier } from "../utils/ids";

export function handleSetSvgContent(event: SetSvgContent): void {
  const tierId = event.params.upc;

  const idOfTier = idForNFTTier(bannyNftCollection, tierId);

  const tier = NFTTier.load(idOfTier);

  if (tier) {
    tier.svg = getSvgOf(tierId);
    tier.save();
  }
}

// TODO merge DecoratedBanny functionality with NFT somehow? Or give BannyToken feature parity with NFT, which will require mint/transfer handlers.
export function handleDecorateBanny(event: DecorateBanny): void {
  const id = event.params.nakenBannyId.toString();
  let banny = DecoratedBanny.load(id);

  if (!banny) {
    log.error("[handleDecorateBanny] missing banny token with id {}", [
      event.params.nakenBannyId.toString(),
    ]);

    banny = new DecoratedBanny(id);
    banny.nft = idForNFT(bannyNftCollection, event.params.nakenBannyId);
  }

  for (let i = 0; i < BANNY_CATEGORIES.length; i++) {
    const category = BANNY_CATEGORIES[i];
    const tierId = event.params.outfitIds[i];

    // wish i had a switch statement...
    if (category === "backside") banny.backside = tierId;
    if (category === "fist") banny.fist = tierId;
    if (category === "glasses") banny.glasses = tierId;
    if (category === "head") banny.head = tierId;
    if (category === "headTop") banny.headTop = tierId;
    if (category === "legs") banny.legs = tierId;
    if (category === "mouth") banny.mouth = tierId;
    if (category === "naked") banny.naked = tierId;
    if (category === "necklace") banny.necklace = tierId;
    if (category === "suit") banny.suit = tierId;
    if (category === "suitBottom") banny.suitBottom = tierId;
    if (category === "suitTop") banny.suitTop = tierId;
    if (category === "topping") banny.topping = tierId;
    if (category === "world") banny.world = tierId;
  }

  banny.save();
}
