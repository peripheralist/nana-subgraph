import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

import { ProjectEvent } from "../../../generated/schema";
import { ProjectEventKey } from "../../enums";
import { idForProjectEvent } from "../ids";

/**
 * Differs from next function because terminal prop isn't optional.
 *
 * By only using this function in Terminal contract handlers, we can
 * avoid forgetting to pass the `terminal` arg.
 */
export function saveNewProjectTerminalEvent(
  event: ethereum.Event,
  projectId: BigInt,
  id: string,
  key: ProjectEventKey,
  caller: Bytes | null = null
): void {
  saveNewProjectEvent(event, projectId, id, key, caller);
}

export function saveNewProjectEvent(
  event: ethereum.Event,
  projectId: BigInt,
  id: string,
  key: ProjectEventKey,
  caller: Bytes | null = null
): void {
  const projectEvent = new ProjectEvent(
    idForProjectEvent(
      projectId,
      event.transaction.hash,
      event.transactionLogIndex
    )
  );
  projectEvent.projectId = projectId.toI32();
  projectEvent.timestamp = event.block.timestamp.toI32();
  projectEvent.project = projectId.toString();
  projectEvent.caller = caller;
  projectEvent.from = event.transaction.from;

  switch (key) {
    case ProjectEventKey.addToBalanceEvent:
      projectEvent.addToBalanceEvent = id;
      break;
    case ProjectEventKey.burnEvent:
      projectEvent.burnEvent = id;
      break;
    case ProjectEventKey.deployedERC20Event:
      projectEvent.deployedERC20Event = id;
      break;
    case ProjectEventKey.distributePayoutsEvent:
      projectEvent.distributePayoutsEvent = id;
      break;
    case ProjectEventKey.distributeReservedTokensEvent:
      projectEvent.distributeReservedTokensEvent = id;
      break;
    case ProjectEventKey.distributeToPayoutSplitEvent:
      projectEvent.distributeToPayoutSplitEvent = id;
      break;
    case ProjectEventKey.distributeToReservedTokenSplitEvent:
      projectEvent.distributeToReservedTokenSplitEvent = id;
      break;
    case ProjectEventKey.mintTokensEvent:
      projectEvent.mintTokensEvent = id;
      break;
    case ProjectEventKey.payEvent:
      projectEvent.payEvent = id;
      break;
    case ProjectEventKey.projectCreateEvent:
      projectEvent.projectCreateEvent = id;
      break;
    case ProjectEventKey.cashOutEvent:
      projectEvent.cashOutEvent = id;
      break;
    case ProjectEventKey.useAllowanceEvent:
      projectEvent.useAllowanceEvent = id;
      break;
  }

  projectEvent.save();
}
