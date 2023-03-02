import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";

import { JBPrices } from "../../../generated/V2JBETHPaymentTerminal/JBPrices";
import {
  BIGINT_WAD,
  V2V3_CURRENCY_ETH,
  V2V3_CURRENCY_USD,
} from "../../constants";
import { address_v2_jbPrices } from "../../contractAddresses";

export function v2USDPriceForEth(ethAmount: BigInt): BigInt | null {
  if (!address_v2_jbPrices) return null;

  const pricesContract = JBPrices.bind(
    Address.fromBytes(Bytes.fromHexString(address_v2_jbPrices!))
  );

  const priceForCall = pricesContract.try_priceFor(
    V2V3_CURRENCY_USD,
    V2V3_CURRENCY_ETH,
    BigInt.fromI32(18)
  );
  if (priceForCall.reverted) {
    log.error("[v2USDPriceForEth] priceFor() reverted", []);
    return null;
  }

  return ethAmount.times(priceForCall.value).div(BIGINT_WAD);
}
