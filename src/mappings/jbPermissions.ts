import { OperatorPermissionsSet } from "../../generated/JBPermissions/JBPermissions";
import { PermissionsHolder } from "../../generated/schema";
import { idForPermissionsHolder } from "../utils/ids";

export function handleOperatorPermissionsSet(
  event: OperatorPermissionsSet
): void {
  const id = idForPermissionsHolder(
    event.params.projectId,
    event.params.operator
  );

  let holder = PermissionsHolder.load(id);
  if (!holder) {
    holder = new PermissionsHolder(id);
  }

  holder.account = event.params.account;
  holder.permissions = event.params.permissionIds;
  holder.projectId = event.params.projectId.toI32();
  holder.project = event.params.projectId.toString();
  holder.operator = event.params.operator;
  holder.save();
}
