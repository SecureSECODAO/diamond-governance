// SPDX-License-Identifier: MIT
/**
 * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
 * © Copyright Utrecht University (Department of Information and Computing Sciences)
 */

pragma solidity ^0.8.0;

import {LibSearchSECORewardingStorage} from "../../../../libraries/storage/LibSearchSECORewardingStorage.sol";
import {AuthConsumer} from "../../../../utils/AuthConsumer.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IFacet} from "../../../IFacet.sol";
import {ISearchSECORewardingFacet} from "./ISearchSECORewardingFacet.sol";
import {GenericSignatureHelper} from "../../../../utils/GenericSignatureHelper.sol";
import {IMiningRewardPoolFacet} from "./IMiningRewardPoolFacet.sol";
import {ABDKMathQuad} from "../../../../libraries/abdk-math/ABDKMathQuad.sol";
import {LibABDKHelper} from "../../../../libraries/abdk-math/LibABDKHelper.sol";
import {IMintableGovernanceStructure} from "../../../governance/structure/voting-power/IMintableGovernanceStructure.sol";
import {IRewardMultiplierFacet} from "../../../multiplier/IRewardMultiplierFacet.sol";

/**
 * @title SearchSECORewardingFacet
 * @author Utrecht University
 * @notice Implementation of ISearchSECORewardingFacet.
 */
contract SearchSECORewardingFacet is
    AuthConsumer,
    GenericSignatureHelper,
    ISearchSECORewardingFacet,
    IFacet
{
    // Permission used by the setHashRepReward function
    bytes32 public constant UPDATE_HASH_REWARD_PERMISSION_ID =
        keccak256("UPDATE_HASH_REWARD_PERMISSION_ID");

    // Permission used by the updateTierMapping function
    bytes32 public constant UPDATE_REWARDING_SIGNER_PERMISSION_ID =
        keccak256("UPDATE_REWARDING_SIGNER_MAPPING_PERMISSION");

    struct SearchSECORewardingFacetInitParams {
        address signer;
        uint miningRewardPoolPayoutRatio;
        uint hashDevaluationFactor;
        uint hashRepReward;
    }

    /// @inheritdoc IFacet
    function init(bytes memory _initParams) public virtual override {
        SearchSECORewardingFacetInitParams memory _params = abi.decode(
            _initParams,
            (SearchSECORewardingFacetInitParams)
        );
        __SearchSECORewardingFacet_init(_params);
    }

    function __SearchSECORewardingFacet_init(
        SearchSECORewardingFacetInitParams memory _params
    ) public virtual {
        // Set signer for signature verification
        LibSearchSECORewardingStorage.Storage
            storage s = LibSearchSECORewardingStorage.getStorage();
        s.signer = _params.signer;
        s.hashRepReward = _params.hashRepReward;
        _setMiningRewardPoolPayoutRatio(_params.miningRewardPoolPayoutRatio);
        _setHashDevaluationFactor(_params.hashDevaluationFactor);

        registerInterface(type(ISearchSECORewardingFacet).interfaceId);
    }

    /// @inheritdoc IFacet
    function deinit() public virtual override {
        unregisterInterface(type(ISearchSECORewardingFacet).interfaceId);
        super.deinit();
    }

    /// @inheritdoc ISearchSECORewardingFacet
    function calculateMiningRewardPayout(
        uint32 _repFrac,
        uint _newHashes
    ) public view override returns (uint repReward18, uint coinReward18) {
        // This is necessary to read from storage
        LibSearchSECORewardingStorage.Storage
            storage s = LibSearchSECORewardingStorage.getStorage();
        IMiningRewardPoolFacet miningRewardPoolFacet = IMiningRewardPoolFacet(
            address(this)
        );

        require(
            _repFrac >= 0 && _repFrac <= 1_000_000,
            "REP fraction must be between 0 and 1_000_000"
        );

        // Calculate the reward
        // 1. Split number of hashes up according to the given "repFrac"
        bytes16 hashCountQuad = ABDKMathQuad.fromUInt(_newHashes);
        // This is the number of hashes for the REP reward, the rest is for the coin reward
        bytes16 numHashDivided = ABDKMathQuad.mul(
            hashCountQuad,
            ABDKMathQuad.div(
                ABDKMathQuad.fromUInt(_repFrac),
                ABDKMathQuad.fromUInt(1_000_000)
            )
        ); // div by 1_000_000 to get fraction

        // 2. Calculate the reputation reward by multiplying the fraction
        //    for the REP reward (calculated in step 1) to the hash reward (from storage)
        bytes16 repReward = ABDKMathQuad.mul(
            numHashDivided,
            ABDKMathQuad.fromUInt(s.hashRepReward)
        );
        // Multiply for inflation
        repReward = ABDKMathQuad.mul(
            IRewardMultiplierFacet(address(this)).getMultiplierQuad(
                "inflation"
            ),
            repReward
        );

        // 3. Calculate the coin reward = 1 - (1 - miningRewardPoolPayoutRatio) ^ coinFrac
        // (don't mind the variable name, this is to minimize the amount of variables used)
        // coinFrac = (hashCount - numHashDivided)

        // coinReward = (1 - (1 - miningRewardPoolPayoutRatio) ^ coinFrac) * miningRewardPool
        bytes16 coinReward = ABDKMathQuad.mul(
            // coinReward = 1 - (1 - miningRewardPoolPayoutRatio) ^ coinFrac
            ABDKMathQuad.sub(
                ABDKMathQuad.fromUInt(1),
                // coinReward = (1 - miningRewardPoolPayoutRatio) ^ coinFrac
                ABDKMathQuad.exp(
                    ABDKMathQuad.mul(
                        // The hash count reserved for the coin reward (coinFrac)
                        // This is divided by a constant factor: hashDevaluationFactor
                        ABDKMathQuad.div(
                            ABDKMathQuad.sub(hashCountQuad, numHashDivided),
                            s.hashDevaluationFactor
                        ),
                        ABDKMathQuad.ln(
                            ABDKMathQuad.sub(
                                ABDKMathQuad.fromUInt(1),
                                s.miningRewardPoolPayoutRatio
                            )
                        )
                    )
                )
            ),
            ABDKMathQuad.fromUInt(miningRewardPoolFacet.getMiningRewardPool())
        );

        return (
            ABDKMathQuad.toUInt(repReward),
            ABDKMathQuad.toUInt(coinReward)
        );
    }

    /// @inheritdoc ISearchSECORewardingFacet
    function rewardMinerForHashes(
        address _toReward,
        uint _hashCount,
        uint _nonce,
        uint32 _repFrac,
        bytes calldata _proof
    ) external virtual override {
        // This is necessary to read from storage
        LibSearchSECORewardingStorage.Storage
            storage s = LibSearchSECORewardingStorage.getStorage();

        // Validate the given proof
        require(
            verify(
                s.signer,
                keccak256(abi.encodePacked(_toReward, _hashCount, _nonce)),
                _proof
            ),
            "Proof is not valid"
        );

        // Make sure that the nonce is equal to the CURRENT hashCount
        require(
            s.hashCount[_toReward] == _nonce,
            "Hash count does not match with nonce"
        );

        require(
            _hashCount > _nonce,
            "New hash count must be higher than current hash count"
        );

        // Update (overwrite) the hash count for the given address
        s.hashCount[_toReward] = _hashCount;

        require(
            _repFrac >= 0 && _repFrac <= 1_000_000,
            "REP fraction must be between 0 and 1_000_000"
        );

        // The difference between the nonce and the TOTAL hash count is the amount of NEW hashes mined
        uint actualHashCount = _hashCount - _nonce;

        // Calculate the rewards
        (uint repReward18, uint coinReward18) = calculateMiningRewardPayout(
            _repFrac,
            actualHashCount
        );

        // Reward the user in REP
        // Assume ERC20 token has 18 decimals
        IMintableGovernanceStructure(address(this)).mintVotingPower(
            _toReward,
            0,
            repReward18
        );

        // Reward the user in coins
        // Assume ERC20 token has 18 decimals
        IMiningRewardPoolFacet(address(this)).rewardCoinsToMiner(
            _toReward,
            // ABDKMathQuad.toUInt(coinReward)
            coinReward18
        );
    }

    /// @inheritdoc ISearchSECORewardingFacet
    function getHashCount(
        address _user
    ) public view virtual override returns (uint) {
        return LibSearchSECORewardingStorage.getStorage().hashCount[_user];
    }

    /// @inheritdoc ISearchSECORewardingFacet
    function getHashRepReward() external view virtual override returns (uint) {
        return LibSearchSECORewardingStorage.getStorage().hashRepReward;
    }

    /// @inheritdoc ISearchSECORewardingFacet
    function setHashRepReward(
        uint _hashRepReward
    ) public virtual override auth(UPDATE_HASH_REWARD_PERMISSION_ID) {
        LibSearchSECORewardingStorage.getStorage().hashRepReward = _hashRepReward;
    }

    /// @inheritdoc ISearchSECORewardingFacet
    function getRewardingSigner()
        external
        view
        virtual
        override
        returns (address)
    {
        return LibSearchSECORewardingStorage.getStorage().signer;
    }

    /// @inheritdoc ISearchSECORewardingFacet
    function setRewardingSigner(
        address _rewardingSigner
    ) external virtual override auth(UPDATE_REWARDING_SIGNER_PERMISSION_ID) {
        LibSearchSECORewardingStorage.Storage
            storage s = LibSearchSECORewardingStorage.getStorage();

        s.signer = _rewardingSigner;
    }

    /// @inheritdoc ISearchSECORewardingFacet
    function getMiningRewardPoolPayoutRatio()
        external
        view
        override
        returns (uint)
    {
        // Cast from quad float to dec18
        return
            LibABDKHelper.to18DecimalsQuad(
                LibSearchSECORewardingStorage
                    .getStorage()
                    .miningRewardPoolPayoutRatio
            );
    }

    /// @inheritdoc ISearchSECORewardingFacet
    function setMiningRewardPoolPayoutRatio(
        uint _miningRewardPoolPayoutRatio
    ) external override {
        _setMiningRewardPoolPayoutRatio(_miningRewardPoolPayoutRatio);
    }

    /// @inheritdoc ISearchSECORewardingFacet
    function getHashDevaluationFactor() external view override returns (uint) {
        // Cast from quad float to dec18
        return
            LibABDKHelper.to18DecimalsQuad(
                LibSearchSECORewardingStorage.getStorage().hashDevaluationFactor
            );
    }

    /// @inheritdoc ISearchSECORewardingFacet
    function setHashDevaluationFactor(
        uint _hashDevaluationFactor
    ) external override {
        _setHashDevaluationFactor(_hashDevaluationFactor);
    }

    function _setMiningRewardPoolPayoutRatio(
        uint _miningRewardPoolPayoutRatio
    ) internal {
        // No need to waste gas checking >= 0, since it's uint
        require(
            _miningRewardPoolPayoutRatio <= 1e18,
            "Error: invalid mining reward pool payout ratio"
        );
        // Cast from dec18 to quad float
        LibSearchSECORewardingStorage
            .getStorage()
            .miningRewardPoolPayoutRatio = LibABDKHelper.from18DecimalsQuad(
            _miningRewardPoolPayoutRatio
        );
    }

    function _setHashDevaluationFactor(uint _hashDevaluationFactor) internal {
        // Cast from uint to quad float, don't multiply or divide by anything.
        // This number is used as is to divide the number of hashes by.
        LibSearchSECORewardingStorage
            .getStorage()
            .hashDevaluationFactor = ABDKMathQuad.fromUInt(
            _hashDevaluationFactor
        );
    }
}
