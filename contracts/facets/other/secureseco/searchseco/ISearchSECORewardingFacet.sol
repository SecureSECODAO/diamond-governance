// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
 * © Copyright Utrecht University (Department of Information and Computing Sciences)
 */

pragma solidity ^0.8.0;

/// @title ISearchSECORewardingFacet
/// @author Utrecht University - 2023
/// @notice The interface of the rewarding (miners) plugin.
interface ISearchSECORewardingFacet {
    /// @notice Rewards the user for submitting new hashes
    /// @param _toReward The address of the user to reward
    /// @param _hashCount The (new) total number of hashes the user has submitted
    /// @param _nonce A nonce, the current number of hashes the user has submitted
    /// @param _proof The proof that the user received from the server
    function rewardMinerForHashes(
        address _toReward,
        uint _hashCount,
        uint _nonce,
        uint _repFrac,
        bytes calldata _proof
    ) external;

    /// @notice Returns the hash count for a given user
    /// @param _user The address of the user
    /// @return The hash count
    function getHashCount(address _user) external view returns (uint);

    /// @notice Returns the hash reward (REP), in 18 decimals precision
    /// @return The hash reward
    function getHashReward() external view returns (uint);

    /// @notice Sets the hash reward (REP)
    /// @param _hashReward The new hash reward
    function setHashReward(uint _hashReward) external;

    /// @notice Returns the signer used for signature verification
    /// @return address signer
    function getRewardingSigner() external view returns (address);

    /// @notice Sets the signer used for signature verification
    /// @param _rewardingSigner The new signer
    function setRewardingSigner(address _rewardingSigner) external;

    /// @notice Sets the percentage of the mining pool that is paid out to the miner (per hash).
    /// @return The ratio in 18 decimals
    function getMiningRewardPoolPayoutRatio() external view returns (uint);

    /// @notice Sets the percentage of the mining pool that is paid out to the miner (per hash).
    /// @dev Stores the devaluation factor as a quad float fraction
    /// @param _miningRewardPoolPayoutRatio The new ratio (in 18 decimals)
    function setMiningRewardPoolPayoutRatio(
        uint _miningRewardPoolPayoutRatio
    ) external;

    /// @notice Returns the devaluation factor for hashes
    /// @return The devaluation factor (in 18 decimals precision)
    function getHashDevaluationFactor() external view returns (uint);

    /// @notice Sets the devaluation factor for hashes
    /// @dev Stores the devaluation factor as a quad float fraction
    /// @param _hashDevaluationFactor The new devaluation factor (in 18 decimals)
    function setHashDevaluationFactor(uint _hashDevaluationFactor) external;
}
