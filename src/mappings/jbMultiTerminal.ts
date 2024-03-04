import { log } from "@graphprotocol/graph-ts";

import {
  AddToBalance,
  Pay,
  ProcessFee,
  SendPayoutToSplit,
  SendPayouts,
} from "../../generated/JBMultiTerminal/JBMultiTerminal";
import {
  AddToBalanceEvent,
  DistributePayoutsEvent,
  DistributeToPayoutSplitEvent,
  Participant,
  PayEvent,
  Project,
  ProtocolLog,
  Wallet,
} from "../../generated/schema";
import { BIGINT_0, PROTOCOL_ID } from "../constants";
import { handleV2V3ProcessFee } from "../utils/v2v3/ethPaymentTerminal/processFee";
import { saveNewProjectEvent } from "../utils/entities/projectEvent";
import {
  idForParticipant,
  idForPayEvent,
  idForPrevPayEvent,
  idForProjectTx,
} from "../utils/ids";
import { ProjectEventKey } from "../enums";
import { handleTrendingPayment } from "../utils/trending";
import { newParticipant, newWallet } from "../utils/entities/participant";
import { toHexLowercase } from "../utils/format";

export function handleAddToBalance(event: AddToBalance): void {
  const projectId = event.params.projectId;

  const addToBalance = new AddToBalanceEvent(
    idForProjectTx(projectId, event, true)
  );
  const project = Project.load(projectId.toString());

  if (!project) {
    log.error("[handleV2V3AddToBalance] Missing project. ID:{}", [
      projectId.toString(),
    ]);
    return;
  }

  project.currentBalance = project.currentBalance.plus(event.params.amount);
  project.save();

  if (addToBalance) {
    addToBalance.projectId = projectId.toI32();
    addToBalance.amount = event.params.amount;
    // addToBalance.amountUSD = v3USDPriceForEth(event.params.amount);
    addToBalance.caller = event.params.caller;
    addToBalance.from = event.transaction.from;
    addToBalance.project = project.id;
    addToBalance.note = event.params.memo;
    addToBalance.timestamp = event.block.timestamp.toI32();
    addToBalance.txHash = event.transaction.hash;
    addToBalance.save();

    saveNewProjectEvent(
      event,
      projectId,
      addToBalance.id,
      ProjectEventKey.addToBalanceEvent,
      event.params.caller
    );
  }

  // extrapolateLatestFC(projectId, event.block.timestamp);
}

export function handleSendPayouts(event: SendPayouts): void {
  const projectId = event.params.projectId;

  const distributePayoutsEventId = idForProjectTx(projectId, event);
  const distributePayoutsEvent = new DistributePayoutsEvent(
    distributePayoutsEventId
  );

  if (!distributePayoutsEvent) {
    log.error(
      "[handleV2V3DistributePayouts] Missing distributePayoutsEvent. ID:{}",
      [distributePayoutsEventId]
    );
    return;
  }

  distributePayoutsEvent.project = projectId.toString();
  distributePayoutsEvent.projectId = projectId.toI32();
  distributePayoutsEvent.timestamp = event.block.timestamp.toI32();
  distributePayoutsEvent.txHash = event.transaction.hash;
  distributePayoutsEvent.amount = event.params.amount;
  distributePayoutsEvent.amountPaidOut = event.params.amountPaidOut;
  // distributePayoutsEvent.amountUSD = v3USDPriceForEth(event.params.amount);
  distributePayoutsEvent.beneficiary = event.params.beneficiary;
  distributePayoutsEvent.beneficiaryDistributionAmount =
    event.params.beneficiaryDistributionAmount;
  // distributePayoutsEvent.beneficiaryDistributionAmountUSD = beneficiaryDistributionAmountUSD;
  distributePayoutsEvent.caller = event.params.caller;
  distributePayoutsEvent.from = event.transaction.from;
  // distributePayoutsEvent.distributedAmount = distributedAmount;
  // distributePayoutsEvent.distributedAmountUSD = distributedAmountUSD;
  distributePayoutsEvent.fee = event.params.fee;
  // distributePayoutsEvent.feeUSD = v3USDPriceForEth(fee);
  distributePayoutsEvent.rulesetId = event.params.rulesetId;
  distributePayoutsEvent.rulesetCycleNumber = event.params.rulesetCycleNumber;
  distributePayoutsEvent.save();

  saveNewProjectEvent(
    event,
    projectId,
    distributePayoutsEvent.id,
    ProjectEventKey.distributePayoutsEvent,
    event.params.caller
  );

  const project = Project.load(projectId.toString());
  if (!project) {
    log.error("[handleV2V3DistributePayouts] Missing project. ID:{}", [
      projectId.toString(),
    ]);
    return;
  }
  project.currentBalance = project.currentBalance.minus(
    event.params.amountPaidOut
  );
  project.save();

  // const latestFc = extrapolateLatestFC(projectId, event.block.timestamp);
  // if (latestFc) {
  //   latestFc.withdrawnAmount = latestFc.withdrawnAmount.plus(amount);
  //   latestFc.save();
  // }
}

export function handleSendPayoutToSplit(event: SendPayoutToSplit): void {
  const projectId = event.params.projectId;
  const distributePayoutSplitEventId = idForProjectTx(projectId, event, true);
  const distributePayoutSplitEvent = new DistributeToPayoutSplitEvent(
    distributePayoutSplitEventId
  );

  if (!distributePayoutSplitEvent) {
    log.error(
      "[handleV2V3DistributeToPayoutSplit] Missing distributePayoutSplitEvent. ID:{}",
      [distributePayoutSplitEventId]
    );
    return;
  }
  distributePayoutSplitEvent.distributePayoutsEvent = idForProjectTx(
    projectId,
    event
  );
  distributePayoutSplitEvent.project = projectId.toString();
  // distributePayoutSplitEvent.terminal = terminal;
  distributePayoutSplitEvent.txHash = event.transaction.hash;
  distributePayoutSplitEvent.timestamp = event.block.timestamp.toI32();
  distributePayoutSplitEvent.amount = event.params.amount;
  // distributePayoutSplitEvent.amountUSD = amountUSD;
  distributePayoutSplitEvent.caller = event.params.caller;
  distributePayoutSplitEvent.from = event.transaction.from;
  // distributePayoutSplitEvent.domain = domain;
  // distributePayoutSplitEvent.group = group;
  distributePayoutSplitEvent.projectId = projectId.toI32();
  distributePayoutSplitEvent.splitProjectId = event.params.split.projectId.toI32();
  // distributePayoutSplitEvent.allocator = splitAllocator;
  distributePayoutSplitEvent.beneficiary = event.params.split.beneficiary;
  distributePayoutSplitEvent.lockedUntil = event.params.split.lockedUntil.toI32();
  distributePayoutSplitEvent.percent = event.params.split.percent.toI32();
  // distributePayoutSplitEvent.preferClaimed = event.params.split.preferAddToBalance;
  distributePayoutSplitEvent.preferAddToBalance =
    event.params.split.preferAddToBalance;
  distributePayoutSplitEvent.save();

  saveNewProjectEvent(
    event,
    projectId,
    distributePayoutSplitEvent.id,
    ProjectEventKey.distributeToPayoutSplitEvent,
    event.params.caller
  );

  // DistributeToPayoutSplitEvent always occurs right after the Pay event, in the case of split payments to projects
  if (event.params.split.projectId.gt(BIGINT_0)) {
    const payEvent = PayEvent.loadInBlock(idForPrevPayEvent());

    if (
      !payEvent ||
      payEvent.projectId != event.params.split.projectId.toI32()
    ) {
      log.warning(
        "[handleV2V3DistributeToPayoutSplit] Missing or mismatched pay event. splitProjectId: {}, payEvent projectId: {}",
        [
          event.params.split.projectId.toString(),
          payEvent ? payEvent.projectId.toString() : "missing",
        ]
      );
      return;
    } else {
      payEvent.distributionFromProjectId = projectId.toI32();
      payEvent.save();
    }
  }
}

export function handlePay(event: Pay): void {
  // const amountUSD = v3USDPriceForEth(event.params.amount);

  const amount = event.params.amount;
  const projectId = event.params.projectId;
  const project = Project.load(projectId.toString());

  if (!project) {
    log.error("[handleV2V3Pay] Missing project. ID:{}", [projectId.toString()]);
    return;
  }

  project.volume = project.volume.plus(amount);
  // if (amountUSD) project.volumeUSD = project.volumeUSD.plus(amountUSD);
  project.currentBalance = project.currentBalance.plus(amount);
  project.paymentsCount = project.paymentsCount + 1;

  // // For distribute events, caller will be a terminal
  // const isDistribution = isTerminalAddress(caller);

  const pay = new PayEvent(idForPayEvent());
  // pay.terminal = terminal;
  pay.projectId = projectId.toI32();
  pay.amount = amount;
  // pay.amountUSD = amountUSD;
  pay.beneficiary = event.params.beneficiary;
  pay.caller = event.params.caller;
  pay.from = event.transaction.from;
  pay.project = projectId.toString();
  pay.note = event.params.memo;
  pay.timestamp = event.block.timestamp.toI32();
  pay.txHash = event.transaction.hash;
  pay.beneficiaryTokenCount = event.params.beneficiaryTokenCount;
  // pay.isDistribution = isDistribution;
  pay.save();

  saveNewProjectEvent(
    event,
    projectId,
    pay.id,
    ProjectEventKey.payEvent,
    event.params.caller
  );

  handleTrendingPayment(event.block.timestamp, pay.id);

  // if (!isDistribution) {
  const lastPaidTimestamp = event.block.timestamp.toI32();

  const payer = event.params.payer;

  const participantId = idForParticipant(projectId, payer);

  let participant = Participant.load(participantId);

  // update contributorsCount
  if (!participant || participant.volume.isZero()) {
    project.contributorsCount = project.contributorsCount + 1;
  }

  if (!participant) {
    participant = newParticipant(projectId, payer);
  }

  participant.volume = participant.volume.plus(amount);
  // if (amountUSD) {
  //   participant.volumeUSD = participant.volumeUSD.plus(amountUSD);
  // }
  participant.lastPaidTimestamp = lastPaidTimestamp;
  participant.paymentsCount = participant.paymentsCount + 1;
  participant.save();

  // Update wallet, create if needed
  const walletId = toHexLowercase(payer);
  let wallet = Wallet.load(walletId);
  if (!wallet) {
    wallet = newWallet(walletId);
  }
  wallet.volume = wallet.volume.plus(amount);
  // if (amountUSD) {
  //   wallet.volumeUSD = wallet.volumeUSD.plus(amountUSD);
  // }
  wallet.lastPaidTimestamp = lastPaidTimestamp;
  wallet.save();
  // }

  project.save();

  // extrapolateLatestFC(projectId, event.block.timestamp);

  const protocolLog = ProtocolLog.load(PROTOCOL_ID);
  if (protocolLog) {
    // if (amountUSD) {
    //   protocolV3Log.volumeUSD = protocolV3Log.volumeUSD.plus(amountUSD);
    // }
    protocolLog.paymentsCount = protocolLog.paymentsCount + 1;
    protocolLog.save();
  }
  // updateProtocolEntity();
}

// export function handleRedeemTokens(event: RedeemTokens): void {
//   const reclaimedAmountUSD = v3USDPriceForEth(event.params.reclaimedAmount);

//   handleV2V3RedeemTokens(
//     event,
//     event.params.projectId,
//     terminal,
//     event.params.tokenCount,
//     event.params.beneficiary,
//     event.params.reclaimedAmount,
//     reclaimedAmountUSD,
//     event.params.holder,
//     event.params.metadata,
//     event.params.memo,
//     event.params.caller
//   );

//   let protocolV3Log = ProtocolV3Log.load(PROTOCOL_ID);
//   if (!protocolV3Log) protocolV3Log = newProtocolV3Log();
//   protocolV3Log.volumeRedeemed = protocolV3Log.volumeRedeemed.plus(
//     event.params.reclaimedAmount
//   );
//   if (reclaimedAmountUSD) {
//     protocolV3Log.volumeRedeemedUSD = protocolV3Log.volumeRedeemedUSD.plus(
//       reclaimedAmountUSD
//     );
//   }
//   protocolV3Log.redeemCount = protocolV3Log.redeemCount + 1;
//   protocolV3Log.save();
//   updateProtocolEntity();
// }

// export function handleUseAllowance(event: UseAllowance): void {
//   const amountUSD = v3USDPriceForEth(event.params.amount);
//   const distributedAmountUSD = v3USDPriceForEth(event.params.distributedAmount);
//   const netDistributedamountUSD = v3USDPriceForEth(
//     event.params.netDistributedamount
//   );

//   handleV2V3UseAllowance(
//     event,
//     event.params.projectId,
//     event.params.amount,
//     amountUSD,
//     event.params.distributedAmount,
//     distributedAmountUSD,
//     event.params.netDistributedamount,
//     netDistributedamountUSD,
//     event.params.beneficiary,
//     event.params.fundingCycleConfiguration,
//     event.params.fundingCycleNumber,
//     event.params.memo,
//     event.params.caller,
//     terminal
//   );
// }

export function handleProcessFee(event: ProcessFee): void {
  handleV2V3ProcessFee(event.params.projectId);
}

// export function handleMigrate(event: Migrate): void {
//   handleV2V3TerminalMigrate(
//     event,
//     event.params.projectId,
//     event.params.amount,
//     event.params.caller,
//     event.params.to
//   );
// }
