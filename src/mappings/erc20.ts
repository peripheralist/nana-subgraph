import { BigInt, dataSource } from "@graphprotocol/graph-ts";

import { BurnEvent, Participant } from "../../generated/schema";
import { Transfer } from "../../generated/templates/ERC20/ERC20";
import { ADDRESS_ZERO, BIGINT_0 } from "../constants";
import { ProjectEventKey } from "../enums";
import {
  newParticipant,
  updateParticipantBalance,
} from "../utils/entities/participant";
import { saveNewProjectEvent } from "../utils/entities/projectEvent";
import { idForParticipant, idForProjectTx } from "../utils/ids";

export function handleERC20Transfer(event: Transfer): void {
  const context = dataSource.context();
  const projectId = BigInt.fromI32(context.getI32("projectId"));

  const sender = Participant.load(
    idForParticipant(projectId, event.params.from)
  );

  if (sender) {
    sender.erc20Balance = sender.erc20Balance.minus(event.params.value);

    updateParticipantBalance(sender);

    sender.save();
  }

  const receiverId = idForParticipant(projectId, event.params.to);
  let receiver = Participant.load(receiverId);
  if (!receiver) receiver = newParticipant(projectId, event.params.to);

  receiver.erc20Balance = receiver.erc20Balance.plus(event.params.value);

  updateParticipantBalance(receiver);

  receiver.save();

  if (event.params.to == ADDRESS_ZERO) {
    const burnEvent = new BurnEvent(idForProjectTx(projectId, event));
    burnEvent.timestamp = event.block.timestamp.toI32();
    burnEvent.txHash = event.transaction.hash;
    burnEvent.projectId = projectId.toI32();
    burnEvent.project = projectId.toString();
    burnEvent.holder = event.params.from;
    burnEvent.amount = event.params.value;
    burnEvent.stakedAmount = BIGINT_0;
    burnEvent.erc20Amount = event.params.value;
    burnEvent.from = event.params.from;
    burnEvent.save();

    saveNewProjectEvent(
      event,
      projectId,
      burnEvent.id,
      ProjectEventKey.burnEvent
    );
  }
}
