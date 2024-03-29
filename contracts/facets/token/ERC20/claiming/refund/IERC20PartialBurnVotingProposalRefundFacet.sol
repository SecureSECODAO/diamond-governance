// SPDX-License-Identifier: MIT
/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */
 
pragma solidity ^0.8.0;

/**
 * @title IERC20PartialBurnVotingProposalRefundFacet
 * @author Utrecht University
 * @notice This interface allows people to refund the cost they paid for creating the proposal.
 * If there is no cost to create a proposal, there is nothing to refund.
 */
interface IERC20PartialBurnVotingProposalRefundFacet {
    function tokensRefundableFromProposalCreation(uint256 _proposalId, address _claimer) external view returns (uint256);

    function refundTokensFromProposalCreation(uint256 _proposalId) external;
}