// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IDAO} from "@aragon/osx/core/plugin/Plugin.sol";
import {LibVerificationStorage} from "../../libraries/storage/LibVerificationStorage.sol";

library SharedStructs {
    struct Stamp {
        string id;
        string _hash;
        uint verifiedAt;
    }
}

interface VerificationInterface {
    function getStampsAt(
        address _toCheck,
        uint _timestamp
    ) external view returns (SharedStructs.Stamp[] memory);
}

contract VerificationFacet {
    function whitelist(address _address) internal {
        LibVerificationStorage.verificationStorage().whitelistTimestamps[_address] = block.timestamp;
    }

    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2 ** (8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = char(hi);
            s[2 * i + 1] = char(lo);
        }
        return string(s);
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    function getStampsAt(
        address _address,
        uint _timestamp
    ) external view returns (SharedStructs.Stamp[] memory) {
        LibVerificationStorage.VerificationStorage storage ds = LibVerificationStorage.verificationStorage();
        VerificationInterface verificationContract = VerificationInterface(ds.verificationContractAddress);
        SharedStructs.Stamp[] memory stamps = verificationContract.getStampsAt(
            _address,
            _timestamp
        );

        uint whitelistTimestamp = ds.whitelistTimestamps[_address];
        if (whitelistTimestamp == 0) {
            return stamps;
        } else {
            SharedStructs.Stamp[] memory stamps2 = new SharedStructs.Stamp[](
                stamps.length + 1
            );
            SharedStructs.Stamp memory stamp = SharedStructs.Stamp(
                "whitelist",
                toAsciiString(_address),
                whitelistTimestamp
            );

            stamps2[0] = stamp;

            for (uint i = 0; i < stamps.length; i++) {
                stamps2[i + 1] = stamps[i];
            }

            return stamps2;
        }
    }
}
