import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import { Banny721TokenUriResolver } from "../../generated/Banny721TokenUriResolver/Banny721TokenUriResolver";
import { bannyNftHookAddress } from "../constants";
import { address_banny721TokenUriResolver } from "../contractAddresses";

export function getSvgOf(tierId: BigInt): string | null {
  const logTag = "getSvgOf";

  // Get raw SVG contents
  if (!address_banny721TokenUriResolver) {
    log.error(`[${logTag}] missing address_banny721TokenUriResolver`, []);
    return null;
  } else {
    const resolverContract = Banny721TokenUriResolver.bind(
      Address.fromBytes(Bytes.fromHexString(address_banny721TokenUriResolver!))
    );

    const zeroTokenId = tierId.times(BigInt.fromI32(1000000000)); // 0th token id https://github.com/Bananapus/nana-721-hook/blob/3e951d9f91b777161c1a1af68be99c9c4c4ab25e/src/JB721TiersHookStore.sol#L1070

    const svgOfCall = resolverContract.try_svgOf(
      bannyNftHookAddress,
      zeroTokenId,
      false,
      false
    );

    if (svgOfCall.reverted) {
      // Will revert for non-tiered tokens, among maybe other reasons
      // Logged on 3/3/24 v8.1.7: ERRO [jb721_v3_4:handleTransfer] tierOf() reverted for address 0xa8e6d676895b0690751ab1eaee09e15a3905d1b5, tierId 2, data_source: JB721Delegate3_4, sgd: 2599, subgraph_id: QmNT7qKcjCnvnPt7xNUr1azCkNBC64hrupuL1maedavFT1, component: SubgraphInstanceManager > UserMapping
      log.error(
        `[${logTag}] reverted for resolver address {}, hook: {}, tokenId {}`,
        [
          address_banny721TokenUriResolver!,
          bannyNftHookAddress.toHexString(),
          zeroTokenId.toString(),
        ]
      );
      return null;
    } else {
      return svgOfCall.value;
    }
  }
}
