// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import { IPartialVotingFacet } from "./IPartialVotingFacet.sol";
import { IPartialVotingProposalFacet } from "../proposal/IPartialVotingProposalFacet.sol";
import { IGovernanceStructure } from "../structure/IGovernanceStructure.sol";
import { AragonAuth } from "../../../utils/AragonAuth.sol";

import { LibPartialVotingProposalStorage } from "../../../libraries/storage/LibPartialVotingProposalStorage.sol";
import { LibDiamond } from "../../../libraries/LibDiamond.sol";

/// @title PartialVotingFacet
/// @author Utrecht University - 2023
/// @notice The partial implementation of partial voting plugins.
/// @dev This contract implements the `IPartialVotingFacet` interface.
contract PartialVotingFacet is IPartialVotingFacet, AragonAuth
{
    /// @notice Thrown if an account is not allowed to cast a vote. This can be because the vote
    /// - has not started,
    /// - has ended,
    /// - was executed, or
    /// - the account doesn't have the chosen voting power or more.
    /// @param proposalId The ID of the proposal.
    /// @param account The address of the _account.
    /// @param voteData The chosen vote option and chosen voting power.
    error VoteCastForbidden(uint256 proposalId, address account, PartialVote voteData);

    /// @inheritdoc IPartialVotingFacet
    function vote(
        uint256 _proposalId,
        PartialVote calldata _voteData
    ) public virtual {
        address account = msg.sender;
        IPartialVotingProposalFacet.ProposalData storage proposal_ = LibPartialVotingProposalStorage.partialVotingProposalStorage().proposals[_proposalId];

        if (!_canVote(_proposalId, proposal_, account, _voteData, IGovernanceStructure(address(this)))) {
            revert VoteCastForbidden({
                proposalId: _proposalId,
                account: account,
                voteData: _voteData
            });
        }
        _vote(proposal_, _voteData, account);
        
        emit VoteCast({
            proposalId: _proposalId,
            voter: account,
            voteData: _voteData
        });
    }

    /// @inheritdoc IPartialVotingFacet
    function canVote(
        uint256 _proposalId,
        address _voter,
        PartialVote calldata _voteData
    ) public view virtual returns (bool) {
        return _canVote(_proposalId, LibPartialVotingProposalStorage.partialVotingProposalStorage().proposals[_proposalId], _voter, _voteData, IGovernanceStructure(address(this)));
    }

    /// @notice Internal function to cast a vote. It assumes the queried vote exists.
    /// @param _proposal The proposal.
    /// @param _voteData The chosen vote option and amount to be casted on the proposal vote.
    function _vote(
        IPartialVotingProposalFacet.ProposalData storage _proposal,
        PartialVote calldata _voteData,
        address _voter
    ) internal virtual {
        // Write the new vote for the voter.
        if (_voteData.option == VoteOption.Yes) {
            _proposal.tally.yes = _proposal.tally.yes + _voteData.amount;
        } else if (_voteData.option  == VoteOption.No) {
            _proposal.tally.no = _proposal.tally.no + _voteData.amount;
        } else if (_voteData.option  == VoteOption.Abstain) {
            _proposal.tally.abstain = _proposal.tally.abstain + _voteData.amount;
        }

        _proposal.voters[_voter].push(_voteData);
    }

    /// @notice Internal function to check if a voter can vote. It assumes the queried proposal exists.
    /// @param _proposalId The id of the proposal.
    /// @param _proposal The proposal.
    /// @param _voter The address of the voter to check.
    /// @param  _voteData Whether the voter abstains, supports or opposes the proposal and with how much voting power.
    /// @return Returns `true` if the given voter can vote on a certain proposal and `false` otherwise.
    function _canVote(
        uint256 _proposalId,
        IPartialVotingProposalFacet.ProposalData storage _proposal,
        address _voter,
        PartialVote calldata _voteData,
        IGovernanceStructure _structure
    ) internal view virtual returns (bool) {
        // The proposal vote hasn't started or has already ended.
        if (!IPartialVotingProposalFacet(address(this)).IsProposalOpen(_proposalId)) {
            return false;
        }

        // The voter has already voted and the proposal only allows a single vote
        if (
            _proposal.voters[_voter].length > 0 &&
            (_proposal.parameters.votingMode == VotingMode.SingleVote ||
            _proposal.parameters.votingMode == VotingMode.SinglePartialVote)
        ) {
            return false;
        }

        uint256 votingPower = _structure.walletVotingPower(_voter, _proposal.parameters.snapshotBlock);

        // The voter has no voting power.
        if (votingPower == 0) {
            return false;
        }

        // The voter is trying to vote with more voting power than they have avaliable.
        if (_voteData.amount > votingPower) {
            return false;
        }

        // In single vote the voter is required to vote with all their voting power
        if (_voteData.amount < votingPower &&
            _proposal.parameters.votingMode == VotingMode.SingleVote
        ) {
            return false;
        }

        return true;
    }
}