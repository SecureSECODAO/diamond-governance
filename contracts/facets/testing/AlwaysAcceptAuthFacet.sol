// SPDX-License-Identifier: MIT
/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */
 
pragma solidity ^0.8.0;

import { IAuthProvider } from "../../utils/auth-providers/IAuthProvider.sol";
import { IFacet } from "../IFacet.sol";

/**
 * @title AlwaysAcceptAuthFacet
 * @author Utrecht University
 * @notice This facet accepts all auth requests.
 */
contract AlwaysAcceptAuthFacet is IAuthProvider, IFacet {
    /// @inheritdoc IAuthProvider
    function auth(bytes32 _permissionId, address _account) external view virtual override {
        
    }
}