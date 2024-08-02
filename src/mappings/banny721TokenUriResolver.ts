import { SetSvgContent } from "../../generated/Banny721TokenUriResolver/Banny721TokenUriResolver";
import { NFTTier } from "../../generated/schema";
import { bannyNftCollection } from "../constants";
import { getSvgOf } from "../utils/banny721Resolver";
import { idForNFTTier } from "../utils/ids";

export function handleSetSvgContent(event: SetSvgContent): void {
  const tierId = event.params.upc;

  const idOfTier = idForNFTTier(bannyNftCollection, tierId);

  const tier = NFTTier.load(idOfTier);

  if (tier) {
    tier.svg = getSvgOf(tierId);
    tier.save();
  }
}
