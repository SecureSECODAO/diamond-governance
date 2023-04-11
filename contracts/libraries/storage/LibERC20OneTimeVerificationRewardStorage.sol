// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibERC20OneTimeVerificationRewardStorage {
    bytes32 constant ONE_TIME_VERIFICATION_REWARD_CLAIM_STORAGE_POSITION =
        keccak256("verification.onetime.claim.diamond.storage.position");

    struct Storage {
        /// @notice Check if how much a address has claimed for a provider id.
        mapping(address => mapping(string => uint256)) amountClaimedByAddressForProvider;
        /// @notice Check how much has been claimed for a stamp id.
        mapping(string => uint256) amountClaimedForStamp;
        /// @notice Check how much will be rewarded if a user claims the one time reward for a provider id.
        mapping (string => uint256) providerReward;
    }

    function getStorage() internal pure returns (Storage storage ds) {
        bytes32 position = ONE_TIME_VERIFICATION_REWARD_CLAIM_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}