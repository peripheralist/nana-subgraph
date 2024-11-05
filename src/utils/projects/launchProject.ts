import { Address, BigInt, log } from "@graphprotocol/graph-ts";

import { Project } from "../../../generated/schema";

export function handleLaunchProject(
  projectId: BigInt,
  caller: Address,
  projectUri: string // metadata cid
): void {
  const project = Project.load(projectId.toString());

  if (!project) {
    log.error("[handleLaunchProject] Missing project. ID: {}", [
      projectId.toString(),
    ]);
    return;
  }

  // If the controller emits a launchProject event, the project launch tx was called via the JBController, and we want to prefer its `caller` param over any existing value
  project.deployer = caller;
  project.metadataUri = projectUri

  project.save();
}
