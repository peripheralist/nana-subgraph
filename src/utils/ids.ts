import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";

import { ProtocolLog } from "../../generated/schema";
import { PROTOCOL_ID } from "../constants";
import { toHexLowercase } from "./format";

export function idForProjectTx(
  projectId: BigInt,
  event: ethereum.Event,
  useLogIndex: boolean = false // Using log index will ensure ID is unique even if event is emitted multiple times within a single tx
): string {
  return `${projectId.toString()}-${toHexLowercase(event.transaction.hash)}${
    useLogIndex ? "-" + event.logIndex.toString() : ""
  }`;
}

export function idForProjectEvent(
  projectId: BigInt,
  txHash: Bytes,
  logIndex: BigInt
): string {
  return `${projectId.toString()}-${toHexLowercase(
    txHash
  )}-${logIndex.toString()}`;
}

export function idForParticipant(
  projectId: BigInt,
  walletAddress: Bytes
): string {
  return `${projectId.toString()}-${toHexLowercase(walletAddress)}`;
}

/**
 * We use incrementing integers for all pay events, regardless of which
 * version of the contracts being used. This helps us easily look up previous
 * pay events when calculating trending projects, among other things.
 */
export function idForPayEvent(): string {
  const protocolLog = ProtocolLog.load(PROTOCOL_ID);
  if (!protocolLog) {
    log.error("[idForPayEvent] Failed to load protocolLog", []);
    return "0";
  }
  return (protocolLog.paymentsCount + 1).toString();
}

export function idForPrevPayEvent(): string {
  const protocolLog = ProtocolLog.load(PROTOCOL_ID);
  if (!protocolLog) {
    log.error("[idForPrevPayEvent] Failed to load protocolLog", []);
    return "0";
  }
  return protocolLog.paymentsCount.toString();
}

export function idForNFT(address: Address, tokenId: BigInt): string {
  return `${toHexLowercase(address)}-${tokenId.toString()}`;
}

export function idForNFTTier(address: Address, tierId: BigInt): string {
  return `${toHexLowercase(address)}-${tierId.toString()}`;
}

export function idForSplitsPayer(projectId: BigInt, address: Bytes): string {
  return `${projectId.toString()}-${address.toHexString()}`;
}

export function idForPermissionsHolder(
  projectId: BigInt,
  operator: Address
): string {
  return `${projectId.toString()}-${operator.toHexString()}`;
}
