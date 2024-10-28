import { StoreAutoMintAmount } from "../../generated/RevDeployer/REVDeployer";
import { StoreAutoMintAmountEvent } from "../../generated/schema";
import { idForProjectEvent } from "../utils/ids";

export function handleStoreAutoMintAmount(event: StoreAutoMintAmount): void {
  const ev = new StoreAutoMintAmountEvent(
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
