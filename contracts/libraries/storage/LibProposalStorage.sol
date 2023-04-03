// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Counters } from "@openzeppelin/contracts/utils/Counters.sol";

library LibProposalStorage {
    bytes32 constant PROPOSAL_STORAGE_POSITION =
        keccak256("proposal.diamond.storage.position");

    struct ProposalStorage {
        /// @notice The incremental ID for proposals and executions.
        Counters.Counter proposalCounter;
    }

    function proposalStorage() internal pure returns (ProposalStorage storage ds) {
        bytes32 position = PROPOSAL_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}