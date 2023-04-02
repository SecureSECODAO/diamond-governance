// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ERC20VotesFacet, ERC20PermitFacet, ERC20Facet } from "../core/ERC20VotesFacet.sol";
import { IMintableGovernanceStructure, IGovernanceStructure } from "../../../governance/structure/IMintableGovernanceStructure.sol";
import { AragonAuth, IDAO } from "../../../../utils/AragonAuth.sol";

contract GovernanceERC20Facet is ERC20VotesFacet, AragonAuth, IMintableGovernanceStructure {
    /// @notice The permission identifier to mint new tokens
    bytes32 public constant MINT_PERMISSION_ID = keccak256("MINT_PERMISSION");

    constructor(string memory name_, string memory symbol_) ERC20VotesFacet(name_, symbol_) {}


    /// @inheritdoc IGovernanceStructure
    function totalVotingPower(uint256 _blockNumber) external view returns (uint256) {
        return getPastTotalSupply(_blockNumber);
    }
    

    /// @inheritdoc IGovernanceStructure
    function walletVotingPower(address _wallet, uint256 _blockNumber) external view returns (uint256) {
        return getPastVotes(_wallet, _blockNumber);
    }

    /// @inheritdoc IMintableGovernanceStructure
    function mintVotingPower(address _to, uint256 _tokenId, uint256 _amount) external override auth(MINT_PERMISSION_ID) {
        require(_tokenId == 0, "ERC20 does not support token ids");
        _mint(_to, _amount);
    }

    // https://forum.openzeppelin.com/t/self-delegation-in-erc20votes/17501/12?u=novaknole
    /// @inheritdoc ERC20VotesFacet
    function _afterTokenTransfer(address from, address to, uint256 amount) internal override {
        super._afterTokenTransfer(from, to, amount);

        // Automatically turn on delegation on mint/transfer but only for the first time.
        if (to != address(0) && numCheckpoints(to) == 0 && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }
}