import {
  Address,
  Bytes,
  dataSource,
  log,
  store,
} from "@graphprotocol/graph-ts";

import { NFT, NFTTier, Participant, Project } from "../../generated/schema";
import {
  AddTier,
  JB721TiersHook,
  RemoveTier,
  Transfer,
} from "../../generated/templates/JB721TiersHook/JB721TiersHook";
import { JB721TiersHookStore } from "../../generated/templates/JB721TiersHook/JB721TiersHookStore";
import { idForNFT, idForNFTTier, idForParticipant } from "../utils/ids";
import { newParticipant } from "../utils/entities/participant";
import { ADDRESS_ZERO } from "../constants";
import { address_jb721TiersHookStore } from "../contractAddresses";

export function handleTransfer(event: Transfer): void {
  const context = dataSource.context();
  const projectId = context.getBigInt("projectId");
  const address = dataSource.address();
  const jb721TiersHookContract = JB721TiersHook.bind(
    Address.fromBytes(address)
  );

  const tokenId = event.params.tokenId;

  const id = idForNFT(Address.fromBytes(address), tokenId);

  let nft = NFT.load(id);

  /**
   * If entity doesn't exist, we create and get the values that aren't expected to change.
   */
  if (!nft) {
    // Create entity
    nft = new NFT(id);
    nft.tokenId = tokenId;
    nft.projectId = projectId.toI32();
    nft.project = projectId.toString();
    nft.collection = address.toHexString();

    // Tier data
    if (!address_jb721TiersHookStore) {
      log.error(
        "[jb721_3_3:handleTransfer] missing address_jb721TiersHookStore",
        []
      );
      return;
    }
    const jb721TiersHookStoreContract = JB721TiersHookStore.bind(
      Address.fromBytes(Bytes.fromHexString(address_jb721TiersHookStore!))
    );
    const tierCall = jb721TiersHookStoreContract.try_tierOfTokenId(
      address,
      tokenId,
      true
    );
    if (tierCall.reverted) {
      // Will revert for non-tiered tokens, among maybe other reasons
      log.error(
        "[jb721TiersHook:handleTransfer] tierOfTokenId() reverted for address {}, tokenId {}",
        [address.toHexString(), tokenId.toString()]
      );
      return;
    }
    const tierId = idForNFTTier(address, tierCall.value.id);
    const tier = NFTTier.load(tierId);

    if (tier) {
      nft.tier = tierId;

      tier.remainingSupply = tierCall.value.remainingSupply;
      tier.save();
    } else {
      // Will revert for non-tiered tokens, among maybe other reasons
      log.error(
        "[jb721TiersHook:handleTransfer] missing tier for token with address {}, tokenId {}, tierId {}",
        [
          address.toHexString(),
          tokenId.toString(),
          tierCall.value.id.toString(),
        ]
      );
    }
  }

  /**
   * Some params may change, so we update them every time the token
   * is transferred.
   */
  const tokenUriCall = jb721TiersHookContract.try_tokenURI(tokenId);
  if (tokenUriCall.reverted) {
    log.error(
      "[jb721TiersHook:handleTransfer] tokenURI() reverted for token:{}",
      [id]
    );
    return;
  }
  nft.tokenUri = tokenUriCall.value;

  const receiverId = idForParticipant(projectId, event.params.to);

  nft.owner = receiverId;
  nft.save();

  // Create participant if doesn't exist
  let receiver = Participant.load(receiverId);
  if (!receiver) receiver = newParticipant(projectId, event.params.to);
  receiver.save();

  // Increment project stats
  if (event.params.from == ADDRESS_ZERO) {
    const idOfProject = projectId.toString();
    const project = Project.load(idOfProject);

    if (project) {
      project.nftsMintedCount = project.nftsMintedCount + 1;
      project.save();
    } else {
      log.error("[jb721_3_4:handleTransfer] Missing project. ID:{}", [
        idOfProject,
      ]);
    }
  }
}

export function handleAddTier(event: AddTier): void {
  const address = dataSource.address();

  const tierId = event.params.tierId;

  // Tier data
  if (!address_jb721TiersHookStore) {
    log.error(
      "[jb721TiersHook:handleAddTier] missing address_jb721TiersHookStore",
      []
    );
    return;
  }
  const jb721TiersHookStoreContract = JB721TiersHookStore.bind(
    Address.fromBytes(Bytes.fromHexString(address_jb721TiersHookStore!))
  );
  const tierCall = jb721TiersHookStoreContract.try_tierOf(
    address,
    tierId,
    true
  );
  if (tierCall.reverted) {
    // Will revert for non-tiered tokens, among maybe other reasons
    // Logged on 3/3/24 v8.1.7: ERRO [jb721_v3_4:handleTransfer] tierOf() reverted for address 0xa8e6d676895b0690751ab1eaee09e15a3905d1b5, tierId 2, data_source: JB721Delegate3_4, sgd: 2599, subgraph_id: QmNT7qKcjCnvnPt7xNUr1azCkNBC64hrupuL1maedavFT1, component: SubgraphInstanceManager > UserMapping
    log.error(
      "[jb721_v3_4:handleTransfer] tierOf() reverted for address {}, tierId {}",
      [address.toHexString(), tierId.toString()]
    );
    return;
  }

  const tier = tierCall.value;

  const nftTier = new NFTTier(idForNFTTier(address, tier.id));
  nftTier.collection = address.toHexString();
  nftTier.tierId = tier.id.toI32();
  nftTier.allowOwnerMint = tier.allowOwnerMint;
  nftTier.cannotBeRemoved = tier.cannotBeRemoved;
  nftTier.votingUnits = tier.votingUnits;
  nftTier.price = tier.price;
  nftTier.encodedIpfsUri = tier.encodedIPFSUri;
  nftTier.resolvedUri = tier.resolvedUri;
  nftTier.initialQuantity = tier.initialSupply;
  nftTier.remainingSupply = tier.initialSupply;
  nftTier.reserveFrequency = tier.reserveFrequency;
  nftTier.reserveBeneficiary = tier.reserveBeneficiary;
  nftTier.transfersPausable = tier.transfersPausable;
  nftTier.collection = address.toHexString();
  if (tier.category) nftTier.category = tier.category.toI32();
  nftTier.createdAt = event.block.timestamp.toI32();
  nftTier.save();
}

export function handleRemoveTier(event: RemoveTier): void {
  const address = dataSource.address();

  store.remove("NFTTier", idForNFTTier(address, event.params.tierId));
}
