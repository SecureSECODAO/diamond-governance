// SPDX-License-Identifier: MIT
/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */
 
pragma solidity ^0.8.0;

import { ERC20TimeClaimableFacet, ERC20TimeClaimableFacetInit } from "./ERC20TimeClaimableFacet.sol";
import { ITieredMembershipStructure } from "../../../../../facets/governance/structure/membership/ITieredMembershipStructure.sol";

import { LibERC20TieredTimeClaimableStorage } from "../../../../../libraries/storage/LibERC20TieredTimeClaimableStorage.sol";

library ERC20TieredTimeClaimableFacetInit {
    struct InitParams {
        uint256[] tiers;
        uint256[] rewards;
        ERC20TimeClaimableFacetInit.InitParams timeClaimableInit;
    }

    function init(InitParams calldata _params) external {
        require (_params.tiers.length == _params.rewards.length, "Tiers and rewards should be same length");

        for (uint i; i < _params.tiers.length; ) {
            LibERC20TieredTimeClaimableStorage.getStorage().rewardForTier[_params.tiers[i]] = _params.rewards[i];
            unchecked {
                i++;
            }
        }
        ERC20TimeClaimableFacetInit.init(_params.timeClaimableInit);
    }
}

contract ERC20TieredTimeClaimableFacet is ERC20TimeClaimableFacet {
    function setClaimReward(uint256 _tier, uint256 _reward) external auth(UPDATE_CLAIM_SETTINGS_PERMISSION_ID) {
        _setClaimReward(_tier, _reward);
    }

    function _setClaimReward(uint256 _tier, uint256 _reward) internal virtual {
        LibERC20TieredTimeClaimableStorage.getStorage().rewardForTier[_tier] = _reward;
    }

    /// @inheritdoc ERC20TimeClaimableFacet
    function _tokensClaimableAt(address _claimer, uint256 _timeStamp) internal view virtual override returns (uint256 amount) {
        return super._tokensClaimableAt(_claimer, _timeStamp) * LibERC20TieredTimeClaimableStorage.getStorage().rewardForTier[ITieredMembershipStructure(address(this)).getTierAt(_claimer, _timeStamp)];
    }
}