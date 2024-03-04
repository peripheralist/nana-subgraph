import { BigInt, ethereum } from "@graphprotocol/graph-ts";

import { InitEvent } from "../../../../generated/schema";
import { ProjectEventKey, PV } from "../../../enums";
import { saveNewProjectEvent } from "../../entities/projectEvent";

const pv = PV.PV2;

export function handleV2V3Init(
  event: ethereum.Event,
  projectId: BigInt,
  configuration: BigInt,
  basedOn: BigInt
): void {
  const initEvent = new InitEvent(projectId.toString());

  initEvent.projectId = projectId.toI32();
  initEvent.project = projectId.toString();
  initEvent.timestamp = event.block.timestamp.toI32();
  initEvent.txHash = event.transaction.hash;
  initEvent.from = event.transaction.from;
  initEvent.configuration = configuration;
  initEvent.basedOn = basedOn.toI32();
  initEvent.save();

  saveNewProjectEvent(
    event,
    projectId,
    initEvent.id,
    ProjectEventKey.initEvent
  );
}
