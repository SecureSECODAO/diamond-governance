// SPDX-License-Identifier: MIT
/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  */

pragma solidity ^0.8.0;

library LibERC20TieredTimeClaimableStorage {
    bytes32 constant ERC20_TIERED_TIME_CLAIMABLE_STORAGE_POSITION =
        keccak256("tiered.time.claim.erc20.diamond.storage.position");

    struct Storage {
        mapping(uint256 => uint256) rewardForTier;
    }

    function getStorage() internal pure returns (Storage storage ds) {
        bytes32 position = ERC20_TIERED_TIME_CLAIMABLE_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}