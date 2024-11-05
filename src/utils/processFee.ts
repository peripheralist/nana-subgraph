import { BigInt, log } from "@graphprotocol/graph-ts";

import { PayEvent } from "../../generated/schema";
import { idForPrevPayEvent } from "./ids";

export function handleProcessFee(projectId: BigInt): void {
  const id = idForPrevPayEvent();
  const pay = PayEvent.loadInBlock(id);
  if (!pay) {
    log.error("[handleProcessFee] Missing PayEvent. ID:{}", [id]);
    return;
  }
  // Sanity check to ensure pay event was to juicebox project
  if (pay.projectId != 1) return;
  pay.feeFromProject = projectId.toI32();
  pay.save();
}
