// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGovernanceStructure {
    /// @notice Returns the total voting power checkpointed for a specific block number.
    /// @param _blockNumber The block number.
    /// @return The total voting power.
    function totalVotingPower(uint256 _blockNumber) external view returns (uint256);
    
    /// @notice Returns the total voting power checkpointed for a specific block number in a specific wallet.
    /// @param _wallet The wallet.
    /// @param _blockNumber The block number.
    /// @return The total voting power of this wallet at this block number.
    function walletVotingPower(address _wallet, uint256 _blockNumber) external view returns (uint256);
}