import { ProtocolLog } from "../../../generated/schema";
import { BIGINT_0, PROTOCOL_ID } from "../../constants";

export function newProtocolLog(): ProtocolLog {
  const protocolLog = new ProtocolLog(PROTOCOL_ID);
  protocolLog.projectsCount = 0;
  protocolLog.volume = BIGINT_0;
  protocolLog.volumeUSD = BIGINT_0;
  protocolLog.volumeRedeemed = BIGINT_0;
  protocolLog.volumeRedeemedUSD = BIGINT_0;
  protocolLog.paymentsCount = 0;
  protocolLog.redeemCount = 0;
  protocolLog.erc20Count = 0;
  protocolLog.trendingLastUpdatedTimestamp = 0;
  return protocolLog;
}
