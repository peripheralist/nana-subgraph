import { StoreAutoIssuanceAmount } from "../../generated/RevDeployer/REVDeployer";
import { StoreAutoIssuanceAmountEvent } from "../../generated/schema";
import { idForProjectEvent } from "../utils/ids";

export function handleStoreAutoIssuanceAmount(
  event: StoreAutoIssuanceAmount
): void {
  const ev = new StoreAutoIssuanceAmountEvent(
    idForProjectEvent(
      event.params.revnetId,
      event.transaction.hash,
      event.transactionLogIndex
    )
  );

  ev.revnetId = event.params.revnetId;
  ev.beneficiary = event.params.beneficiary;
  ev.count = event.params.count;
  ev.stageId = event.params.stageId;
  ev.caller = event.params.caller;

  ev.save();
}
