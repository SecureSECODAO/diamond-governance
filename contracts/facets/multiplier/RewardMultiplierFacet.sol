// SPDX-License-Identifier: MIT
/**
 * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
 * © Copyright Utrecht University (Department of Information and Computing Sciences)
 */

pragma solidity ^0.8.0;

import {IRewardMultiplierFacet} from "./IRewardMultiplierFacet.sol";
import {LibRewardMultiplierStorage} from "../../libraries/storage/LibRewardMultiplierStorage.sol";
import {AuthConsumer} from "../../utils/AuthConsumer.sol";
import {IFacet} from "../IFacet.sol";
import {ABDKMathQuad} from "../../libraries/abdk-math/ABDKMathQuad.sol";
import {LibABDKHelper} from "../../libraries/abdk-math/LibABDKHelper.sol";
import {LibCalculateGrowth} from "./LibCalculateGrowth.sol";

/**
 * @title RewardMultiplierFacet
 * @author Utrecht University
 * @notice Implementation of IRewardMultiplierFacet.
 */
contract RewardMultiplierFacet is AuthConsumer, IRewardMultiplierFacet, IFacet {
    // Permission used by the setMultiplierType* functions
    bytes32 public constant UPDATE_MULTIPLIER_TYPE_MEMBER_PERMISSION_ID =
        keccak256("UPDATE_MULTIPLIER_TYPE_MEMBER_PERMISSION");

    struct RewardMultiplierFacetInitParams {
        string name;
        uint startTimestamp;
        uint initialAmount;
        uint slope; // 18dec
    }

    /// @inheritdoc IFacet
    function init(bytes memory _initParams) public virtual override {
        RewardMultiplierFacetInitParams memory _params = abi.decode(_initParams, (RewardMultiplierFacetInitParams));
        __RewardMultiplierFacet_init(_params);
    }

    function __RewardMultiplierFacet_init(RewardMultiplierFacetInitParams memory _initParams) public virtual {
        _setMultiplierTypeLinear(
            _initParams.name,
            _initParams.startTimestamp,
            _initParams.initialAmount,
            _initParams.slope
        );
        registerInterface(type(IRewardMultiplierFacet).interfaceId);
    }

    /// @inheritdoc IFacet
    function deinit() public virtual override {
        unregisterInterface(type(IRewardMultiplierFacet).interfaceId);
        super.deinit();
    }

    /// @inheritdoc IRewardMultiplierFacet
    function applyMultiplier(
        string memory _name,
        uint _amount
    ) public view virtual override returns (uint) {
        bytes16 multiplier = getMultiplierQuad(_name);

        return
            ABDKMathQuad.toUInt(
                ABDKMathQuad.mul(multiplier, ABDKMathQuad.fromUInt(_amount))
            );
    }

    /// @inheritdoc IRewardMultiplierFacet
    function getMultiplierQuad(
        string memory _name
    ) public view override returns (bytes16) {
        LibRewardMultiplierStorage.Storage
            storage s = LibRewardMultiplierStorage.getStorage();

        MultiplierInfo memory _info = s.rewardMultiplier[_name];

        uint _daysPassed = (block.timestamp - _info.startTimestamp) / 1 days;

        // If the multiplier has not started yet, return 0
        if (_info.multiplierType == MultiplierType.CONSTANT) {
            return _info.initialAmount;
        } else if (_info.multiplierType == MultiplierType.LINEAR) {
            LinearParams memory params = s.linearParams[_name];

            return
                LibCalculateGrowth.calculateLinearGrowth(
                    _info.initialAmount,
                    _daysPassed,
                    params.slope
                );
        } else if (_info.multiplierType == MultiplierType.EXPONENTIAL) {
            ExponentialParams memory params = s.exponentialParams[_name];
            return
                LibCalculateGrowth.calculateExponentialGrowth(
                    _info.initialAmount,
                    _daysPassed,
                    params.base
                );
        }

        return 0;
    }

    /// @inheritdoc IRewardMultiplierFacet
    function setMultiplierTypeConstant(
        string memory _name,
        uint _startTimestamp,
        uint _initialAmount
    ) external override auth(UPDATE_MULTIPLIER_TYPE_MEMBER_PERMISSION_ID) {
        _setMultiplierTypeConstant(_name, _startTimestamp, _initialAmount);
    }

    /// @inheritdoc IRewardMultiplierFacet
    function setMultiplierTypeLinear(
        string memory _name,
        uint _startTimestamp,
        uint _initialAmount,
        uint _slope
    ) external override auth(UPDATE_MULTIPLIER_TYPE_MEMBER_PERMISSION_ID) {
        _setMultiplierTypeLinear(
            _name,
            _startTimestamp,
            _initialAmount,
            _slope
        );
    }

    /// @inheritdoc IRewardMultiplierFacet
    function setMultiplierTypeExponential(
        string memory _name,
        uint _startTimestamp,
        uint _initialAmount,
        uint _base
    ) external override auth(UPDATE_MULTIPLIER_TYPE_MEMBER_PERMISSION_ID) {
        _setMultiplierTypeExponential(
            _name,
            _startTimestamp,
            _initialAmount,
            _base
        );
    }

    /// @inheritdoc IRewardMultiplierFacet
    function setInflationStartTimestamp(uint _inflationTimestamp) external override auth(UPDATE_MULTIPLIER_TYPE_MEMBER_PERMISSION_ID) {
        LibRewardMultiplierStorage.Storage
            storage s = LibRewardMultiplierStorage.getStorage();
        s.rewardMultiplier["inflation"].startTimestamp = _inflationTimestamp;
    }

    /// @inheritdoc IRewardMultiplierFacet
    function getInflationStartTimestamp() external view override returns (uint) {
        LibRewardMultiplierStorage.Storage
            storage s = LibRewardMultiplierStorage.getStorage();
        return s.rewardMultiplier["inflation"].startTimestamp;
    }

    /// @inheritdoc IRewardMultiplierFacet
    function setInflationBase(uint _inflationBase) external override auth(UPDATE_MULTIPLIER_TYPE_MEMBER_PERMISSION_ID) {
        LibRewardMultiplierStorage.Storage
            storage s = LibRewardMultiplierStorage.getStorage();

        bytes16 _baseQuad = LibABDKHelper.from18DecimalsQuad(_inflationBase);
        s.exponentialParams["inflation"] = ExponentialParams(_baseQuad);
    }

    /// @inheritdoc IRewardMultiplierFacet
    function getInflationBase() external view override returns (uint) {
        LibRewardMultiplierStorage.Storage
            storage s = LibRewardMultiplierStorage.getStorage();
        return LibABDKHelper.to18DecimalsQuad(s.exponentialParams["inflation"].base);
    }

    /// @inheritdoc IRewardMultiplierFacet
    function setInflationInitialAmount(uint _inflationInitialAmount) external override {
        LibRewardMultiplierStorage.Storage
            storage s = LibRewardMultiplierStorage.getStorage();
        s.rewardMultiplier["inflation"].initialAmount = LibABDKHelper.from18DecimalsQuad(_inflationInitialAmount);
    }

    /// @inheritdoc IRewardMultiplierFacet
    function getInflationInitialAmount() external view override returns (uint) {
        LibRewardMultiplierStorage.Storage
            storage s = LibRewardMultiplierStorage.getStorage();
        return LibABDKHelper.to18DecimalsQuad(s.rewardMultiplier["inflation"].initialAmount);
    }

    function _setMultiplierTypeConstant(
        string memory _name,
        uint _startTimestamp,
        uint _initialAmount
    ) internal {
        LibRewardMultiplierStorage.Storage
            storage s = LibRewardMultiplierStorage.getStorage();
        s.rewardMultiplier[_name] = MultiplierInfo(
            _startTimestamp,
            LibABDKHelper.from18DecimalsQuad(_initialAmount),
            MultiplierType.CONSTANT
        );
    }

    function _setMultiplierTypeLinear(
        string memory _name,
        uint _startTimestamp,
        uint _initialAmount,
        uint _slope
    ) internal {
        LibRewardMultiplierStorage.Storage
            storage s = LibRewardMultiplierStorage.getStorage();
        s.rewardMultiplier[_name] = MultiplierInfo(
            _startTimestamp,
            LibABDKHelper.from18DecimalsQuad(_initialAmount),
            MultiplierType.LINEAR
        );
        bytes16 _slopeQuad = LibABDKHelper.from18DecimalsQuad(_slope);

        s.linearParams[_name] = LinearParams(_slopeQuad);
    }

    function _setMultiplierTypeExponential(
        string memory _name,
        uint _startTimestamp,
        uint _initialAmount,
        uint _base
    ) internal {
        LibRewardMultiplierStorage.Storage
            storage s = LibRewardMultiplierStorage.getStorage();
        s.rewardMultiplier[_name] = MultiplierInfo(
            _startTimestamp,
            LibABDKHelper.from18DecimalsQuad(_initialAmount),
            MultiplierType.EXPONENTIAL
        );

        bytes16 _baseQuad = LibABDKHelper.from18DecimalsQuad(_base);
        s.exponentialParams[_name] = ExponentialParams(_baseQuad);
    }
}
