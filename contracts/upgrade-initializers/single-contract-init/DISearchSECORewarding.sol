// SPDX-License-Identifier: MIT
/**
 * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
 * © Copyright Utrecht University (Department of Information and Computing Sciences)
 */

pragma solidity ^0.8.0;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import {IMembership, IMembershipExtended, ITieredMembershipStructure} from "../../utils/InterfaceIds.sol";

import {SearchSECORewardingFacetInit} from "../../facets/searchseco-rewarding/SearchSECORewardingFacet.sol";

import {LibDiamond} from "../../libraries/LibDiamond.sol";

// It is expected that this contract is customized if you want to deploy your diamond
// with data from a deployment script. Use the init function to initialize state variables
// of your diamond. Add parameters to the init funciton if you need to.

contract DISearchSECORewarding {
    // You can add parameters to this function in order to pass in
    // data to set your own state variables
    function init(
        SearchSECORewardingFacetInit.InitParams memory _rewardingSettings
    ) external {
        SearchSECORewardingFacetInit.init(_rewardingSettings);
    }
}
