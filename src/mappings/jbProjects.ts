import { Project } from "../../generated/schema";
import { Create, Transfer } from "../../generated/JBProjects/JBProjects";
import { handleProjectCreate } from "../utils/projects/projectCreate";

export function handleCreate(event: Create): void {
  handleProjectCreate(
    event,
    event.params.projectId,
    event.params.owner,
    event.params.caller
  );
}

export function handleTransferOwnership(event: Transfer): void {
  const project = Project.load(event.params.tokenId.toString());
  if (!project) {
    /**
     * Project will be missing when project 721 token is transferred
     * for the first time at creation, so we don't log any errors.
     */
    return;
  }
  project.owner = event.params.to;
  project.save();
}
