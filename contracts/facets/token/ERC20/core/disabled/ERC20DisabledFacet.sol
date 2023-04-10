// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ERC20DisabledFacet is IERC20 {
    /// @inheritdoc IERC20
    function totalSupply() external pure override returns (uint256) {
        revert("Disabled");
    }

    /// @inheritdoc IERC20
    function balanceOf(address/* account*/) external pure override returns (uint256) {
        revert("Disabled");
    }

    /// @inheritdoc IERC20
    function transfer(address/* to*/, uint256/* amount*/) external pure override returns (bool) {
        revert("Disabled");
    }
    
    /// @inheritdoc IERC20
    function allowance(address/* owner*/, address/* spender*/) external pure override returns (uint256) {
        revert("Disabled");
    }

    /// @inheritdoc IERC20
    function approve(address/* spender*/, uint256/* amount*/) external pure override returns (bool) {
        revert("Disabled");
    }

    /// @inheritdoc IERC20
    function transferFrom(address/* from*/, address/* to*/, uint256/* amount*/) external pure override returns (bool) {
        revert("Disabled");
    }

    function increaseAllowance(address/* spender*/, uint256/* addedValue*/) external pure returns (bool) {
        revert("Disabled");
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address/* spender*/, uint256/* subtractedValue*/) public virtual returns (bool) {
        revert("Disabled");
    }
}