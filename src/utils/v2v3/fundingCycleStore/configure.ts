import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";

import { Project } from "../../../../generated/schema";
import { ProjectEventKey } from "../../../enums";
import { newPV2ConfigureEvent } from "../../entities/configureEvent";
import {
  extrapolateLatestFC,
  newFundingCycle,
} from "../../entities/fundingCycle";
import { saveNewProjectEvent } from "../../entities/projectEvent";

export function handleV2V3Configure(
  event: ethereum.Event,
  projectId: BigInt,
  duration: BigInt,
  weight: BigInt,
  fcWeight: BigInt, // actual weight of the funding cycle, not weight emitted from event which may be different
  discountRate: BigInt,
  ballot: Address,
  mustStartAtOrAfter: BigInt,
  startTimestamp: BigInt,
  configuration: BigInt,
  metadata: BigInt,
  number: BigInt,
  basedOn: BigInt,
  caller: Address
): void {
  const configureEvent = newPV2ConfigureEvent(
    event,
    projectId,
    duration,
    weight,
    discountRate,
    ballot,
    mustStartAtOrAfter,
    configuration,
    caller
  );
  configureEvent.save();

  saveNewProjectEvent(
    event,
    projectId,
    configureEvent.id,
    ProjectEventKey.configureEvent
  );

  extrapolateLatestFC(projectId, event.block.timestamp);

  const fc = newFundingCycle(
    projectId,
    number,
    basedOn,
    metadata,
    startTimestamp,
    duration,
    fcWeight,
    discountRate,
    ballot,
    configuration,
    mustStartAtOrAfter
  );
  fc.configureEvent = configureEvent.id;
  fc.save();

  const project = Project.load(projectId.toString());
  if (project) {
    project.latestFundingCycle = number.toI32();
    project.save();
  }
}
