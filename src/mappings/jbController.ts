import { log } from "@graphprotocol/graph-ts";
import {
  LaunchProject,
  MintTokens,
  SendReservedTokensToSplit,
  SendReservedTokensToSplits,
  SetUri,
} from "../../generated/JBController/JBController";
import {
  DistributeReservedTokensEvent,
  DistributeToReservedTokenSplitEvent,
  MintTokensEvent,
  Project,
} from "../../generated/schema";
import { handleV2V3LaunchProject } from "../utils/projects/launchProject";
import { idForProjectTx } from "../utils/ids";
import { saveNewProjectEvent } from "../utils/entities/projectEvent";
import { ProjectEventKey } from "../enums";

export function handleMintTokens(event: MintTokens): void {
  /**
   * (LEGACY)Note: Receiver balance is updated in the JBTokenStore event handler.
   *
   * The only reason to do this logic in JBController instead of JBTokenStore
   * is to make use of the `memo` field
   */

  const projectId = event.params.projectId;

  const mintTokensEvent = new MintTokensEvent(
    idForProjectTx(projectId, event, true)
  );

  mintTokensEvent.projectId = projectId.toI32();
  mintTokensEvent.amount = event.params.tokenCount;
  mintTokensEvent.beneficiary = event.params.beneficiary;
  mintTokensEvent.caller = event.params.caller;
  mintTokensEvent.from = event.transaction.from;
  mintTokensEvent.memo = event.params.memo;
  mintTokensEvent.project = projectId.toString();
  mintTokensEvent.timestamp = event.block.timestamp.toI32();
  mintTokensEvent.txHash = event.transaction.hash;
  mintTokensEvent.save();

  saveNewProjectEvent(
    event,
    projectId,
    mintTokensEvent.id,
    ProjectEventKey.mintTokensEvent
  );
}

export function handleLaunchProject(event: LaunchProject): void {
  handleV2V3LaunchProject(event.params.projectId, event.params.caller, event.params.projectUri);
}

export function handleSetUri(event: SetUri): void {
  const project = Project.load(event.params.projectId.toString());
  if (!project) {
    log.error("[handleSetUri] Missing project. ID:{}", [
      event.params.projectId.toString(),
    ]);
    return;
  }
  project.metadataUri = event.params.uri;
  project.save();
}

export function handleSendReservedTokensToSplits(
  event: SendReservedTokensToSplits
): void {
  const projectId = event.params.projectId;

  const distributeReservedTokensEvent = new DistributeReservedTokensEvent(
    idForProjectTx(projectId, event)
  );

  distributeReservedTokensEvent.project = projectId.toString();
  distributeReservedTokensEvent.projectId = projectId.toI32();
  distributeReservedTokensEvent.txHash = event.transaction.hash;
  distributeReservedTokensEvent.timestamp = event.block.timestamp.toI32();
  distributeReservedTokensEvent.rulesetCycleNumber = event.params.rulesetCycleNumber.toI32();
  distributeReservedTokensEvent.caller = event.params.caller;
  distributeReservedTokensEvent.from = event.transaction.from;
  distributeReservedTokensEvent.tokenCount = event.params.tokenCount;
  distributeReservedTokensEvent.save();

  saveNewProjectEvent(
    event,
    projectId,
    distributeReservedTokensEvent.id,
    ProjectEventKey.distributeReservedTokensEvent
  );
}

export function handleSendReservedTokensToSplit(
  event: SendReservedTokensToSplit
): void {
  const projectId = event.params.projectId;

  const distributeReservedTokenSplitEvent = new DistributeToReservedTokenSplitEvent(
    idForProjectTx(projectId, event, true)
  );

  // The DistributeReservedTokensEvent will be created in the same TX, so we can generate the event ID here without using logIndex
  distributeReservedTokenSplitEvent.distributeReservedTokensEvent = idForProjectTx(
    projectId,
    event
  );
  distributeReservedTokenSplitEvent.project = projectId.toString();
  distributeReservedTokenSplitEvent.projectId = projectId.toI32();
  distributeReservedTokenSplitEvent.txHash = event.transaction.hash;
  distributeReservedTokenSplitEvent.timestamp = event.block.timestamp.toI32();
  distributeReservedTokenSplitEvent.caller = event.params.caller;
  distributeReservedTokenSplitEvent.from = event.transaction.from;
  distributeReservedTokenSplitEvent.tokenCount = event.params.tokenCount;
  distributeReservedTokenSplitEvent.beneficiary =
    event.params.split.beneficiary;
  distributeReservedTokenSplitEvent.lockedUntil = event.params.split.lockedUntil.toI32();
  distributeReservedTokenSplitEvent.percent = event.params.split.percent.toI32();
  distributeReservedTokenSplitEvent.preferAddToBalance =
    event.params.split.preferAddToBalance;
  distributeReservedTokenSplitEvent.splitProjectId = event.params.split.projectId.toI32();
  distributeReservedTokenSplitEvent.save();

  saveNewProjectEvent(
    event,
    projectId,
    distributeReservedTokenSplitEvent.id,
    ProjectEventKey.distributeToReservedTokenSplitEvent
  );
}

// export function handleLaunchRulesets(event: LaunchRulesets): void {}
