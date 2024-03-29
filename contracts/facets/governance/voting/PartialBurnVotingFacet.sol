// SPDX-License-Identifier: MIT
/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  */

pragma solidity ^0.8.0;

import { PartialVotingFacet, IPartialVotingProposalFacet, IGovernanceStructure, IFacet } from "./PartialVotingFacet.sol";
import { IBurnableGovernanceStructure } from "../structure/voting-power/IBurnableGovernanceStructure.sol";
import "../shared/IPartialBurnVotingShared.sol";

import { LibDiamond } from "../../../libraries/LibDiamond.sol";
import { LibBurnVotingProposalStorage } from "../../../libraries/storage/LibBurnVotingProposalStorage.sol";

/**
 * @title PartialBurnVotingFacet
 * @author Utrecht University
 * @notice PartialVoting which also burns the voting power used.
 */
contract PartialBurnVotingFacet is PartialVotingFacet {
    /// @inheritdoc IFacet
    function init(bytes memory/* _initParams*/) public virtual override {
        __PartialBurnVotingFacet_init();
    }

    function __PartialBurnVotingFacet_init() public virtual {
        __PartialVotingFacet_init();
    }

    /// @inheritdoc IFacet
    function deinit() public virtual override {
        super.deinit();
    }

    /// @inheritdoc PartialVotingFacet
    function _vote(
        uint256 _proposalId,
        IPartialVotingProposalFacet.ProposalData storage _proposal,
        PartialVote calldata _voteData,
        address _voter
    ) internal virtual override {
        super._vote(_proposalId, _proposal, _voteData, _voter);

        // Only burn proposals with burn type
        // Dont burn if the diamond doesnt support it
        // Also dont burn if the vote is for abstain
        if (_proposal.proposalType == PROPOSAL_BURN_TYPE && 
            LibDiamond.diamondStorage().supportedInterfaces[type(IBurnableGovernanceStructure).interfaceId] &&
            _voteData.option != VoteOption.Abstain
        ) {
            IBurnableGovernanceStructure(address(this)).burnVotingPower(_voter, _voteData.amount);
            LibBurnVotingProposalStorage.getStorage().proposalBurnData[_proposalId][_voter] += _voteData.amount;
        }
    }
    
    /// @inheritdoc PartialVotingFacet
    function _canVote(
        uint256 _proposalId,
        IPartialVotingProposalFacet.ProposalData storage _proposal,
        address _voter,
        PartialVote calldata _voteData,
        IGovernanceStructure _structure
    ) internal view virtual override returns (bool) {
        // Trying to vote with more tokens than they have currently
        if (_proposal.proposalType == PROPOSAL_BURN_TYPE &&
            _voteData.amount > _structure.walletVotingPower(_voter, block.number - 1)
        ) {
            return false;
        }

        return super._canVote(_proposalId, _proposal, _voter, _voteData, _structure);
    }
}