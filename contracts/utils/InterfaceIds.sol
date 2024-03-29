// SPDX-License-Identifier: MIT
/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  */

pragma solidity ^0.8.0;

// Defines the interfaces that will be used to auto generate the pure SDK

import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { IERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";

import { IERC173 } from "../additional-contracts/IERC173.sol";
import { IERC6372 } from "../additional-contracts/IERC6372.sol";
import { IVotes } from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import { IDiamondLoupe } from "../additional-contracts/IDiamondLoupe.sol";
import { IDiamondCut } from "../additional-contracts/IDiamondCut.sol";

import { IPlugin } from "@aragon/osx/core/plugin/IPlugin.sol";
import { IDAOReferenceFacet } from "../facets/aragon/IDAOReferenceFacet.sol";
import { IAuthProvider } from "./auth-providers/IAuthProvider.sol";
import { IProposal } from "@aragon/osx/core/plugin/proposal/IProposal.sol";

import { IGovernanceStructure } from "../facets/governance/structure/voting-power/IGovernanceStructure.sol";
import { IMintableGovernanceStructure } from "../facets/governance/structure/voting-power/IMintableGovernanceStructure.sol";
import { IBurnableGovernanceStructure } from "../facets/governance/structure/voting-power/IBurnableGovernanceStructure.sol";
import { IERC20MultiMinterFacet } from "../facets/token/ERC20/minting/IERC20MultiMinterFacet.sol";

import { IMembership } from "@aragon/osx/core/plugin/membership/IMembership.sol";
import { IMembershipExtended } from "../facets/governance/structure/membership/IMembershipExtended.sol";
import { ITieredMembershipStructure } from "../facets/governance/structure/membership/ITieredMembershipStructure.sol";
import { IMembershipWhitelisting } from "../facets/governance/structure/membership/IMembershipWhitelisting.sol";

import { IVerificationFacet } from "../facets/membership/IVerificationFacet.sol";
import { IVerificationRewardPoolFacet } from "../facets/membership/IVerificationRewardPoolFacet.sol";

import { IPartialVotingProposalFacet } from "../facets/governance/proposal/IPartialVotingProposalFacet.sol";
import { IPartialVotingFacet } from "../facets/governance/voting/IPartialVotingFacet.sol";
import { IBurnVotingProposalFacet } from "../facets/governance/proposal/IBurnVotingProposalFacet.sol";

import { IGithubPullRequestFacet } from "../facets/other/github-pr/IGitHubPullRequestFacet.sol";

import { IERC20OneTimeRewardFacet } from "../facets/token/ERC20/claiming/one-time/IERC20OneTimeRewardFacet.sol";
import { IERC20OneTimeVerificationRewardFacet } from "../facets/token/ERC20/claiming/one-time/IERC20OneTimeVerificationRewardFacet.sol";

import { IERC20PartialBurnVotingRefundFacet } from "../facets/token/ERC20/claiming/refund/IERC20PartialBurnVotingRefundFacet.sol";
import { IERC20PartialBurnVotingProposalRefundFacet } from "../facets/token/ERC20/claiming/refund/IERC20PartialBurnVotingProposalRefundFacet.sol";

import { IERC20TimeClaimableFacet } from "../facets/token/ERC20/claiming/time/IERC20TimeClaimableFacet.sol";
import { IERC20TieredTimeClaimableFacet } from "../facets/token/ERC20/claiming/time/IERC20TieredTimeClaimableFacet.sol";

import { IMonetaryTokenFacet } from "../facets/token/ERC20/monetary-token/IMonetaryTokenFacet.sol";

import { IRewardMultiplierFacet } from "../facets/multiplier/IRewardMultiplierFacet.sol";

import { ISearchSECOMonetizationFacet } from "../facets/other/secureseco/searchseco/ISearchSECOMonetizationFacet.sol";
import { ISearchSECORewardingFacet } from "../facets/other/secureseco/searchseco/ISearchSECORewardingFacet.sol";
import { IMiningRewardPoolFacet } from "../facets/other/secureseco/searchseco/IMiningRewardPoolFacet.sol";

import { IABCConfigureFacet } from "../facets/token/ERC20/monetary-token/ABC/facets/IABCConfigureFacet.sol";

library InterfaceIds {
    bytes4 constant public IERC165_ID = type(IERC165).interfaceId;
    bytes4 constant public IERC20_ID = type(IERC20).interfaceId;
    bytes4 constant public IERC20Metadata_ID = type(IERC20Metadata).interfaceId;
    bytes4 constant public IERC20Permit_ID = type(IERC20Permit).interfaceId;
    
    bytes4 constant public IERC173_ID = type(IERC173).interfaceId;
    bytes4 constant public IERC6372_ID = type(IERC6372).interfaceId;
    bytes4 constant public IVotes_ID = type(IVotes).interfaceId;
    bytes4 constant public IDiamondLoupe_ID = type(IDiamondLoupe).interfaceId;
    bytes4 constant public IDiamondCut_ID = type(IDiamondCut).interfaceId;
    
    bytes4 constant public IPlugin_ID = type(IPlugin).interfaceId;
    bytes4 constant public IDAOReferenceFacet_ID = type(IDAOReferenceFacet).interfaceId;
    bytes4 constant public IAuthProvider_ID = type(IAuthProvider).interfaceId;
    bytes4 constant public IProposal_ID = type(IProposal).interfaceId;

    bytes4 constant public IGovernanceStructure_ID = type(IGovernanceStructure).interfaceId;
    bytes4 constant public IMintableGovernanceStructure_ID = type(IMintableGovernanceStructure).interfaceId;
    bytes4 constant public IBurnableGovernanceStructure_ID = type(IBurnableGovernanceStructure).interfaceId;
    bytes4 constant public IERC20MultiMinterFacet_ID = type(IERC20MultiMinterFacet).interfaceId;

    bytes4 constant public IMembership_ID = type(IMembership).interfaceId;
    bytes4 constant public IMembershipExtended_ID = type(IMembershipExtended).interfaceId;
    bytes4 constant public ITieredMembershipStructure_ID = type(ITieredMembershipStructure).interfaceId;
    bytes4 constant public IMembershipWhitelisting_ID = type(IMembershipWhitelisting).interfaceId;

    bytes4 constant public IVerificationFacet_ID = type(IVerificationFacet).interfaceId; 
    bytes4 constant public IVerificationRewardPoolFacet_ID = type(IVerificationRewardPoolFacet).interfaceId;

    bytes4 constant public IPartialVotingProposalFacet_ID = type(IPartialVotingProposalFacet).interfaceId;
    bytes4 constant public IPartialVotingFacet_ID = type(IPartialVotingFacet).interfaceId;
    bytes4 constant public IBurnVotingProposalFacet_ID = type(IBurnVotingProposalFacet).interfaceId;
    
    bytes4 constant public IGithubPullRequestFacet_ID = type(IGithubPullRequestFacet).interfaceId;

    bytes4 constant public IERC20OneTimeRewardFacet_ID = type(IERC20OneTimeRewardFacet).interfaceId;
    bytes4 constant public IERC20OneTimeVerificationRewardFacet_ID = type(IERC20OneTimeVerificationRewardFacet).interfaceId;
    
    bytes4 constant public IERC20PartialBurnVotingRefundFacet_ID = type(IERC20PartialBurnVotingRefundFacet).interfaceId;
    bytes4 constant public IERC20PartialBurnVotingProposalRefundFacet_ID = type(IERC20PartialBurnVotingProposalRefundFacet).interfaceId;
    
    bytes4 constant public IERC20TimeClaimableFacet_ID = type(IERC20TimeClaimableFacet).interfaceId;
    bytes4 constant public IERC20TieredTimeClaimableFacet_ID = type(IERC20TieredTimeClaimableFacet).interfaceId;

    bytes4 constant public IMonetaryTokenFacet_ID = type(IMonetaryTokenFacet).interfaceId;

    bytes4 constant public IRewardMultiplierFacet_ID = type(IRewardMultiplierFacet).interfaceId;

    bytes4 constant public ISearchSECOMonetizationFacet_ID = type(ISearchSECOMonetizationFacet).interfaceId;
    bytes4 constant public ISearchSECORewardingFacet_ID = type(ISearchSECORewardingFacet).interfaceId;
    bytes4 constant public IMiningRewardPoolFacet_ID = type(IMiningRewardPoolFacet).interfaceId;
    
    bytes4 constant public IABCConfigureFacet_ID = type(IABCConfigureFacet).interfaceId;
}