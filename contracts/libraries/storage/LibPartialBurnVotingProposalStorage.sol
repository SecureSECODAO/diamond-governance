// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibPartialBurnVotingProposalStorage {
    bytes32 constant PARTIAL_BURN_VOTING_PROPOSAL_STORAGE_POSITION =
        keccak256("proposal.burn.partialvoting.diamond.storage.position");

    struct Storage {
        /// @notice Voting power that will be burned upon proposal creation.
        uint256 proposalCreationCost;
        /// @notice A mapping between proposal IDs and how much voting power a wallet has burned on this proposal.
        /// @dev Used for refunds when the proposal doesnt hit the participation threshold.
        mapping(uint256 => mapping(address => uint256)) proposalBurnData;
    }

    function getStorage() internal pure returns (Storage storage ds) {
        bytes32 position = PARTIAL_BURN_VOTING_PROPOSAL_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}