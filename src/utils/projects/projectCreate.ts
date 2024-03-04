import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  Project,
  ProjectCreateEvent,
  ProtocolLog,
} from "../../../generated/schema";
import { BIGINT_0, PROTOCOL_ID } from "../../constants";
import { ProjectEventKey } from "../../enums";
import { saveNewProjectEvent } from "../entities/projectEvent";
import { newProtocolLog } from "../entities/protocolLog";
import { idForProjectTx } from "../ids";

export function handleProjectCreate(
  event: ethereum.Event,
  projectId: BigInt,
  owner: Address,
  caller: Address,
  handle: string | null = null
): void {
  const project = new Project(projectId.toString());
  if (!project) return;

  project.latestFundingCycle = BIGINT_0.toI32();
  project.projectId = projectId.toI32();
  project.trendingScore = BIGINT_0;
  project.trendingVolume = BIGINT_0;
  project.trendingPaymentsCount = BIGINT_0.toI32();
  project.owner = owner;
  project.creator = event.transaction.from;
  project.deployer = caller;
  project.createdAt = event.block.timestamp.toI32();
  project.volume = BIGINT_0;
  project.volumeUSD = BIGINT_0;
  project.redeemVolume = BIGINT_0;
  project.redeemVolumeUSD = BIGINT_0;
  project.currentBalance = BIGINT_0;
  project.paymentsCount = 0;
  project.contributorsCount = 0;
  project.redeemCount = 0;
  project.nftsMintedCount = 0;
  project.tokenSupply = BIGINT_0;
  project.handle = handle;
  project.save();

  const projectCreateEvent = new ProjectCreateEvent(
    idForProjectTx(projectId, event)
  );
  projectCreateEvent.project = project.id;
  projectCreateEvent.projectId = projectId.toI32();
  projectCreateEvent.timestamp = event.block.timestamp.toI32();
  projectCreateEvent.txHash = event.transaction.hash;
  projectCreateEvent.caller = caller;
  projectCreateEvent.from = event.transaction.from;
  projectCreateEvent.save();

  saveNewProjectEvent(
    event,
    projectId,
    projectCreateEvent.id,
    ProjectEventKey.projectCreateEvent
  );

  /**
   * We only need to create any ProtocolLog once since there will only
   * ever be one entity. We might as well do it here when the first
   * project is created.
   */

  let protocolLog = ProtocolLog.load(PROTOCOL_ID);
  if (!protocolLog) {
    protocolLog = newProtocolLog();
  }
  protocolLog.projectsCount = protocolLog.projectsCount + 1;
  protocolLog.save();
}
