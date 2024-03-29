// SPDX-License-Identifier: MIT
/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  */

pragma solidity ^0.8.0;

import { IMintableGovernanceStructure } from "../../../governance/structure/voting-power/IMintableGovernanceStructure.sol";
import { IERC20MultiMinterFacet } from "./IERC20MultiMinterFacet.sol";
import { AuthConsumer } from "../../../../utils/AuthConsumer.sol";
import { IFacet } from "../../../IFacet.sol";

/**
 * @title ERC20MultiMinterFacet
 * @author Utrecht University
 * @notice Implementation of IERC20MultiMinterFacet.
 */
contract ERC20MultiMinterFacet is IERC20MultiMinterFacet, AuthConsumer, IFacet {
    // Permission to multimint
    bytes32 public constant MULTIMINT_PERMISSION_ID = keccak256("MULTIMINT_PERMISSION");

    /// @inheritdoc IFacet
    function init(bytes memory/* _initParams*/) public virtual override {
        __ERC20MultiMinterFacet_init();
    }

    function __ERC20MultiMinterFacet_init() public virtual {
        registerInterface(type(IERC20MultiMinterFacet).interfaceId);
    }

    /// @inheritdoc IFacet
    function deinit() public virtual override {
        unregisterInterface(type(IERC20MultiMinterFacet).interfaceId);
        super.deinit();
    }

    /// @inheritdoc IERC20MultiMinterFacet
    function multimint(address[] calldata _addresses, uint256[] calldata _amounts) external virtual auth(MULTIMINT_PERMISSION_ID) {
        IMintableGovernanceStructure mintable = IMintableGovernanceStructure(address(this));
        require (_addresses.length == _amounts.length, "Addresses and amount are not the same length");
        for (uint i; i < _addresses.length;) {
            mintable.mintVotingPower(_addresses[i], 0, _amounts[i]);

            unchecked {
                i++;
            }
        }
    }
}