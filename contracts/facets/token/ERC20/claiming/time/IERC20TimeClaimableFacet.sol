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
 * @title IDAOReferenceFacet
 * @author Utrecht University
 * @notice This interface allows people to claim tokens that stack up time wise.
 * There is also a maximum period after which no more tokens will stack up if not claimed.
 */
interface IERC20TimeClaimableFacet {
    function tokensClaimableTime() external view returns (uint256 amount);

    function claimTime() external;

    function getClaimPeriodInterval() external view returns (uint256);

    function setClaimPeriodInterval(uint256 _claimPeriodInterval) external;

    function getClaimPeriodMax() external view returns (uint256);

    function setClaimPeriodMax(uint256 _claimPeriodMax) external;
}