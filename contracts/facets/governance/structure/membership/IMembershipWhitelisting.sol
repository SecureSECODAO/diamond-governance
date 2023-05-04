// SPDX-License-Identifier: AGPL-3.0-or-later
/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  */


pragma solidity ^0.8.0;

/// @title IMembershipWhitelisting
/// @author Utrecht University - 2023
/// @notice For the whitelisting functionality of the verification plugin.
interface IMembershipWhitelisting {
    /// @notice Whitelist an address.
    /// @param _address The address to whitelist.
    /// @dev Whitelist verification never expires.
    function whitelist(address _address) external;
}