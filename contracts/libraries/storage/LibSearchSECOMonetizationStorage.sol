// SPDX-License-Identifier: MIT
/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  */

pragma solidity ^0.8.0;

library LibSearchSECOMonetizationStorage {
    bytes32 constant SEARCHSECO_MONETIZATION_STORAGE_POSITION =
        keccak256("searchseco.monetization.diamond.storage.position");

    struct Storage {
        // mapping from address to the number of hashed this account has credit
        mapping(address => uint) hashCredit;
        // how much a single hash costs
        uint256 hashCost;
    }

    function getStorage() internal pure returns (Storage storage ds) {
        bytes32 position = SEARCHSECO_MONETIZATION_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}