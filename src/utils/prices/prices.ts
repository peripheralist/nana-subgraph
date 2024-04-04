import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";

import { JBPrices } from "../../../generated/JBMultiTerminal/JBPrices";
import {
  BIGINT_WAD,
  V2V3_CURRENCY_ETH,
  V2V3_CURRENCY_USD,
} from "../../constants";
import { address_jbPrices } from "../../contractAddresses";

export function usdPriceForEth(
  projectId: BigInt,
  ethAmount: BigInt
): BigInt | null {
  if (!address_jbPrices) return null;

  const pricesContract = JBPrices.bind(
    Address.fromBytes(Bytes.fromHexString(address_jbPrices!))
  );

  const call = pricesContract.try_pricePerUnitOf(
    projectId,
    V2V3_CURRENCY_USD,
    V2V3_CURRENCY_ETH,
    BigInt.fromI32(18)
  );
  if (call.reverted) {
    log.error("[USDPriceForEth] pricePerUnitOf() reverted", []);
    return null;
  }

  return ethAmount.times(call.value).div(BIGINT_WAD);
}
