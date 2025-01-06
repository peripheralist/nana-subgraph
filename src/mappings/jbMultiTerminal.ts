import { log } from "@graphprotocol/graph-ts";

import {
  AddToBalance,
  CashOutTokens,
  Pay,
  ProcessFee,
  SendPayoutToSplit,
  SendPayouts,
  UseAllowance,
} from "../../generated/JBMultiTerminal/JBMultiTerminal";
import {
  AddToBalanceEvent,
  CashOutEvent,
  DistributePayoutsEvent,
  DistributeToPayoutSplitEvent,
  Participant,
  PayEvent,
  Project,
  ProtocolLog,
  UseAllowanceEvent,
  Wallet,
} from "../../generated/schema";
import { BIGINT_0, PROTOCOL_ID } from "../constants";
import { ProjectEventKey } from "../enums";
import { newParticipant, newWallet } from "../utils/entities/participant";
import { saveNewProjectEvent } from "../utils/entities/projectEvent";
import { toHexLowercase } from "../utils/format";
import {
  idForParticipant,
  idForPayEvent,
  idForPrevPayEvent,
  idForProjectTx,
} from "../utils/ids";
import { usdPriceForEth } from "../utils/prices";
import { handleProcessFee as _handleProcessFee } from "../utils/processFee";
import { handleTrendingPayment } from "../utils/trending";

export function handleAddToBalance(event: AddToBalance): void {
  const projectId = event.params.projectId;

  const addToBalance = new AddToBalanceEvent(
    idForProjectTx(projectId, event, true)
  );
  const project = Project.load(projectId.toString());

  if (!project) {
    log.error("[handleAddToBalance] Missing project. ID:{}", [
      projectId.toString(),
    ]);
    return;
  }

  project.currentBalance = project.currentBalance.plus(event.params.amount);
  project.save();

  if (addToBalance) {
    addToBalance.projectId = projectId.toI32();
    addToBalance.amount = event.params.amount;
    addToBalance.amountUSD = usdPriceForEth(projectId, event.params.amount);
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
}

export function handleSendPayouts(event: SendPayouts): void {
  const projectId = event.params.projectId;

  const distributePayoutsEventId = idForProjectTx(projectId, event);
  const distributePayoutsEvent = new DistributePayoutsEvent(
    distributePayoutsEventId
  );

  if (!distributePayoutsEvent) {
    log.error(
      "[handleDistributePayouts] Missing distributePayoutsEvent. ID:{}",
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
  distributePayoutsEvent.amountUSD = usdPriceForEth(
    projectId,
    event.params.amount
  );
  distributePayoutsEvent.caller = event.params.caller;
  distributePayoutsEvent.from = event.transaction.from;
  distributePayoutsEvent.amountPaidOut = event.params.amountPaidOut;
  distributePayoutsEvent.amountPaidOutUSD = usdPriceForEth(
    projectId,
    event.params.amountPaidOut
  );
  distributePayoutsEvent.fee = event.params.fee;
  distributePayoutsEvent.feeUSD = usdPriceForEth(projectId, event.params.fee);
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
    log.error("[handleDistributePayouts] Missing project. ID:{}", [
      projectId.toString(),
    ]);
    return;
  }
  project.currentBalance = project.currentBalance.minus(
    event.params.amountPaidOut
  );
  project.save();
}

export function handleSendPayoutToSplit(event: SendPayoutToSplit): void {
  const projectId = event.params.projectId;
  const distributePayoutSplitEventId = idForProjectTx(projectId, event, true);
  const distributePayoutSplitEvent = new DistributeToPayoutSplitEvent(
    distributePayoutSplitEventId
  );

  if (!distributePayoutSplitEvent) {
    log.error(
      "[handleDistributeToPayoutSplit] Missing distributePayoutSplitEvent. ID:{}",
      [distributePayoutSplitEventId]
    );
    return;
  }
  distributePayoutSplitEvent.distributePayoutsEvent = idForProjectTx(
    projectId,
    event
  );
  distributePayoutSplitEvent.project = projectId.toString();
  distributePayoutSplitEvent.txHash = event.transaction.hash;
  distributePayoutSplitEvent.timestamp = event.block.timestamp.toI32();
  distributePayoutSplitEvent.amount = event.params.amount;
  distributePayoutSplitEvent.amountUSD = usdPriceForEth(
    projectId,
    event.params.amount
  );
  distributePayoutSplitEvent.caller = event.params.caller;
  distributePayoutSplitEvent.from = event.transaction.from;
  distributePayoutSplitEvent.projectId = projectId.toI32();
  distributePayoutSplitEvent.splitProjectId = event.params.split.projectId.toI32();
  distributePayoutSplitEvent.beneficiary = event.params.split.beneficiary;
  distributePayoutSplitEvent.lockedUntil = event.params.split.lockedUntil.toI32();
  distributePayoutSplitEvent.percent = event.params.split.percent.toI32();
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
        "[handleDistributeToPayoutSplit] Missing or mismatched pay event. splitProjectId: {}, payEvent projectId: {}",
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
  const amount = event.params.amount;
  const projectId = event.params.projectId;
  const amountUSD = usdPriceForEth(projectId, event.params.amount);
  const project = Project.load(projectId.toString());

  if (!project) {
    log.error("[handlePay] Missing project. ID:{}", [projectId.toString()]);
    return;
  }

  project.volume = project.volume.plus(amount);
  if (amountUSD) project.volumeUSD = project.volumeUSD.plus(amountUSD);
  project.currentBalance = project.currentBalance.plus(amount);
  project.paymentsCount = project.paymentsCount + 1;

  const pay = new PayEvent(idForPayEvent());
  pay.projectId = projectId.toI32();
  pay.amount = amount;
  pay.amountUSD = amountUSD;
  pay.beneficiary = event.params.beneficiary;
  pay.caller = event.params.caller;
  pay.from = event.transaction.from;
  pay.project = projectId.toString();
  pay.note = event.params.memo;
  pay.timestamp = event.block.timestamp.toI32();
  pay.txHash = event.transaction.hash;
  pay.beneficiaryTokenCount = event.params.newlyIssuedTokenCount;
  // NOTE this logic is deprecated but may be required
  // // For distribute events, caller will be a terminal
  // const isDistribution = isTerminalAddress(caller);
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
  if (amountUSD) {
    participant.volumeUSD = participant.volumeUSD.plus(amountUSD);
  }
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
  if (amountUSD) {
    wallet.volumeUSD = wallet.volumeUSD.plus(amountUSD);
  }
  wallet.lastPaidTimestamp = lastPaidTimestamp;
  wallet.save();
  // }

  project.save();

  const protocolLog = ProtocolLog.load(PROTOCOL_ID);
  if (protocolLog) {
    if (amountUSD) {
      protocolLog.volumeUSD = protocolLog.volumeUSD.plus(amountUSD);
    }
    protocolLog.paymentsCount = protocolLog.paymentsCount + 1;
    protocolLog.save();
  }
}

export function handleCashOutTokens(event: CashOutTokens): void {
  const reclaimAmountUSD = usdPriceForEth(
    event.params.projectId,
    event.params.reclaimAmount
  );

  const idOfProject = event.params.projectId.toString();

  const cashOutEvent = new CashOutEvent(
    idForProjectTx(event.params.projectId, event, true)
  );

  cashOutEvent.projectId = event.params.projectId.toI32();
  cashOutEvent.cashOutCount = event.params.cashOutCount;
  cashOutEvent.beneficiary = event.params.beneficiary;
  cashOutEvent.caller = event.params.caller;
  cashOutEvent.from = event.transaction.from;
  cashOutEvent.holder = event.params.holder;
  cashOutEvent.reclaimAmount = event.params.reclaimAmount;
  cashOutEvent.reclaimAmountUSD = reclaimAmountUSD;
  cashOutEvent.project = idOfProject;
  cashOutEvent.timestamp = event.block.timestamp.toI32();
  cashOutEvent.txHash = event.transaction.hash;
  cashOutEvent.metadata = event.params.metadata;
  cashOutEvent.save();

  saveNewProjectEvent(
    event,
    event.params.projectId,
    cashOutEvent.id,
    ProjectEventKey.cashOutEvent,
    event.params.caller
  );

  const project = Project.load(idOfProject);
  if (!project) {
    log.error("[handleCashOutTokens] Missing project. ID:{}", [idOfProject]);
    return;
  }
  project.redeemVolume = project.redeemVolume.plus(event.params.reclaimAmount);
  if (reclaimAmountUSD) {
    project.redeemVolumeUSD = project.redeemVolumeUSD.plus(reclaimAmountUSD);
  }
  project.currentBalance = project.currentBalance.minus(
    event.params.reclaimAmount
  );
  project.redeemCount = project.redeemCount + 1;
  project.save();
}

export function handleUseAllowance(event: UseAllowance): void {
  const projectId = event.params.projectId;

  const amountUSD = usdPriceForEth(projectId, event.params.amount);
  const distributedAmountUSD = usdPriceForEth(
    projectId,
    event.params.amountPaidOut
  );
  const netDistributedamountUSD = usdPriceForEth(
    projectId,
    event.params.netAmountPaidOut
  );

  const useAllowanceEventId = idForProjectTx(projectId, event, true);
  const useAllowanceEvent = new UseAllowanceEvent(useAllowanceEventId);

  useAllowanceEvent.project = projectId.toString();
  useAllowanceEvent.projectId = projectId.toI32();
  useAllowanceEvent.timestamp = event.block.timestamp.toI32();
  useAllowanceEvent.txHash = event.transaction.hash;
  useAllowanceEvent.amount = event.params.amount;
  useAllowanceEvent.amountUSD = amountUSD;
  useAllowanceEvent.beneficiary = event.params.beneficiary;
  useAllowanceEvent.caller = event.params.caller;
  useAllowanceEvent.from = event.transaction.from;
  useAllowanceEvent.distributedAmount = event.params.amountPaidOut;
  useAllowanceEvent.distributedAmountUSD = distributedAmountUSD;
  useAllowanceEvent.rulesetId = event.params.rulesetId;
  useAllowanceEvent.rulesetCycleNumber = event.params.rulesetCycleNumber.toI32();
  useAllowanceEvent.memo = event.params.memo;
  useAllowanceEvent.netDistributedamount = event.params.netAmountPaidOut;
  useAllowanceEvent.netDistributedamountUSD = netDistributedamountUSD;
  useAllowanceEvent.save();

  saveNewProjectEvent(
    event,
    projectId,
    useAllowanceEvent.id,
    ProjectEventKey.useAllowanceEvent,
    event.params.caller
  );
}

export function handleProcessFee(event: ProcessFee): void {
  _handleProcessFee(event.params.projectId);
}
