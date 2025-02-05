import { DataSourceContext, log } from "@graphprotocol/graph-ts";
import { ERC20 } from "../../generated/templates";
import { ProjectEventKey } from "../enums";
import {
  Burn,
  ClaimTokens,
  DeployERC20,
  Mint,
  TransferCredits,
} from "../../generated/JBTokens/JBTokens";
import {
  BurnEvent,
  DeployedERC20Event,
  Participant,
  Project,
} from "../../generated/schema";
import {
  newParticipant,
  updateParticipantBalance,
} from "../utils/entities/participant";
import { idForParticipant, idForProjectTx } from "../utils/ids";
import { saveNewProjectEvent } from "../utils/entities/projectEvent";
import { BIGINT_0 } from "../constants";

export function handleMint(event: Mint): void {
  /**
   * We're only concerned with updating unclaimed token balance.
   * "Claimed" ERC20 tokens will be handled separately.
   */
  if (event.params.tokensWereClaimed) return;

  const projectId = event.params.projectId;

  const receiverId = idForParticipant(projectId, event.params.holder);
  let receiver = Participant.load(receiverId);
  if (!receiver) {
    receiver = newParticipant(projectId, event.params.holder);
  }

  receiver.stakedBalance = receiver.stakedBalance.plus(event.params.count);

  updateParticipantBalance(receiver);

  receiver.save();

  const project = Project.load(projectId.toString());
  if (project) {
    project.tokenSupply = project.tokenSupply.plus(event.params.count);
    project.save();
  }
}

export function handleDeployERC20(event: DeployERC20): void {
  const projectId = event.params.projectId;
  const project = Project.load(projectId.toString());

  if (!project) {
    log.error("[handleDeployERC20] Missing project. ID:{}", [
      projectId.toString(),
    ]);
    return;
  }

  const deployedERC20Event = new DeployedERC20Event(
    idForProjectTx(projectId, event)
  );
  if (deployedERC20Event) {
    deployedERC20Event.project = project.id;
    deployedERC20Event.projectId = project.projectId;
    deployedERC20Event.symbol = event.params.symbol;
    deployedERC20Event.address = event.params.token;
    deployedERC20Event.timestamp = event.block.timestamp.toI32();
    deployedERC20Event.txHash = event.transaction.hash;
    deployedERC20Event.caller = event.params.caller;
    deployedERC20Event.from = event.transaction.from;
    deployedERC20Event.save();

    saveNewProjectEvent(
      event,
      projectId,
      deployedERC20Event.id,
      ProjectEventKey.deployedERC20Event
    );
  }

  const erc20Context = new DataSourceContext();
  erc20Context.setI32("projectId", projectId.toI32());
  ERC20.createWithContext(event.params.token, erc20Context);
}

export function handleTransferCredits(event: TransferCredits): void {
  const projectId = event.params.projectId;

  const project = Project.load(projectId.toString());
  if (!project) {
    log.error("[handleTransferCredits] Missing project. ID:{}", [
      projectId.toString(),
    ]);
    return;
  }

  const sender = Participant.load(
    idForParticipant(projectId, event.params.holder)
  );
  if (sender) {
    sender.stakedBalance = sender.stakedBalance.minus(event.params.count);

    updateParticipantBalance(sender);

    sender.save();
  }

  const receiverId = idForParticipant(projectId, event.params.recipient);
  let receiver = Participant.load(receiverId);
  if (!receiver) {
    receiver = newParticipant(projectId, event.params.recipient);
  }

  receiver.stakedBalance = receiver.stakedBalance.plus(event.params.count);

  updateParticipantBalance(receiver);

  receiver.save();
}

export function handleBurn(event: Burn): void {
  const projectId = event.params.projectId;
  const holderId = idForParticipant(projectId, event.params.holder);
  const participant = Participant.load(holderId);

  if (!participant) {
    log.error("[handleBurn] Missing participant. ID:{}", [holderId]);
    return;
  }

  let burnedStakedAmount = BIGINT_0;

  // Only update stakedBalance, since erc20Balance will be updated by erc20 handler
  if (event.params.count.gt(participant.stakedBalance)) {
    burnedStakedAmount = participant.stakedBalance;
    participant.stakedBalance = BIGINT_0;
  } else {
    burnedStakedAmount = event.params.count;
    participant.stakedBalance = participant.stakedBalance.minus(
      event.params.count
    );
  }
  participant.save();

  updateParticipantBalance(participant);

  participant.save();

  const burnEvent = new BurnEvent(idForProjectTx(projectId, event));
  burnEvent.holder = event.params.holder;
  burnEvent.project = projectId.toString();
  burnEvent.projectId = projectId.toI32();
  burnEvent.timestamp = event.block.timestamp.toI32();
  burnEvent.txHash = event.transaction.hash;
  burnEvent.amount = event.params.count;
  burnEvent.stakedAmount = burnedStakedAmount;
  burnEvent.erc20Amount = BIGINT_0;
  burnEvent.caller = event.params.caller;
  burnEvent.from = event.transaction.from;
  burnEvent.save();
  saveNewProjectEvent(
    event,
    projectId,
    burnEvent.id,
    ProjectEventKey.burnEvent
  );

  const project = Project.load(projectId.toString());
  if (project) {
    project.tokenSupply = project.tokenSupply.minus(event.params.count);
    project.save();
  }
}

export function handleClaimTokens(event: ClaimTokens): void {
  const projectId = event.params.projectId;
  const idOfParticipant = idForParticipant(projectId, event.params.holder);
  const participant = Participant.load(idOfParticipant);

  if (!participant) {
    log.error("[handleClaim] Missing participant. ID:{}", [
      idOfParticipant,
    ]);
    return;
  }

  participant.stakedBalance = participant.stakedBalance.minus(
    event.params.count
  );

  updateParticipantBalance(participant);

  participant.save();
}
