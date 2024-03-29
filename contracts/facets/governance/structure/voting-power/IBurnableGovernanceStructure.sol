// SPDX-License-Identifier: MIT
/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  */

pragma solidity ^0.8.0;

import { IGovernanceStructure } from "./IGovernanceStructure.sol";

/**
 * @title IBurnableGovernanceStructure
 * @author Utrecht University
 * @notice This interface allows burning of voting power.
 */
interface IBurnableGovernanceStructure is IGovernanceStructure {
    /// @notice Burns an amount of voting power from a wallet.
    /// @param _from The wallet to burn from.
    /// @param _amount The amount of voting power to burn.
    function burnVotingPower(address _from, uint256 _amount) external;
}