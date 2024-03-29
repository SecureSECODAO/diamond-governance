/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */

import { createDiamondGovernanceRepoIfNotExists, deployDiamondGovernance } from "../deployments/deploy_DiamondGovernance";
// import { deployTestNetwork } from "../test/utils/testDeployer";
import { getDeployedDiamondGovernance } from "../utils/deployedContracts";
import { DiamondCut, DAOCreationSettings, CreateDAO } from "../utils/diamondGovernanceHelper";
import { days, hours, now } from "../utils/timeUnits";
import { ether } from "../utils/etherUnits";
import { ethers, network } from "hardhat";
import { MonetaryTokenDeployer, ABCDeployer, ABCDeployerSettings } from "../deployments/deploy_MonetaryToken";
import { to18Decimal } from "../utils/decimals18Helper";
import { BigNumber } from "ethers";

/// This scripts deploys the Diamond Governance (what has not been deployed yet) and creates a DAO with it.
/// Configure the settings of the DAO here.
const randomSubdomain = false;

async function main() {
  console.log("Deploying to", network.name);
  // await deployTestNetwork();
  await deployDiamondGovernance();
  await createDiamondGovernanceRepoIfNotExists();

  const [owner] = await ethers.getSigners();
  const diamondGovernance = await getDeployedDiamondGovernance(owner);

  const ABCDeployerSettings : ABCDeployerSettings = {
    curveParameters: {
      theta: 0.05 * 10**6, // 5%
      friction: 0.05 * 10**6, // 5%
      reserveRatio: 0.5 * 10**6, // 50%
    },
    hatchParameters: {
      initialPrice: to18Decimal("10000"), // 1 external token => 10k monetary token
      minimumRaise: ether.mul(1),
      maximumRaise: ether.mul(1),
      hatchDeadline: now() + 24 * hours,
    },
    vestingSchedule: {
      cliff: 0,
      start: now() + 24 * hours,
      duration: 1 * hours,
      revocable: false,
    },
    externalERC20: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", // DAI on polygon
  };
  const monetaryTokenDeployer : MonetaryTokenDeployer = new ABCDeployer(ABCDeployerSettings);
  monetaryTokenDeployer.runVerification = true;
  const MonetaryToken = await monetaryTokenDeployer.beforeDAODeploy();

  const ERC20Disabled = [
    "transfer(address, uint256)",
    "approve(address, uint256)",
    "transferFrom(address, address, uint256)",
    "increaseAllowance(address, uint256)",
    "decreaseAllowance(address, uint256)",
    "permit(address, address, uint256, uint256, uint8, bytes32, bytes32)",
    "delegate(address)",
    "delegateBySig(address, uint256, uint256, uint8, bytes32, bytes32)",
  ];
  enum VotingMode {
    SingleVote,
    SinglePartialVote,
    MultiplePartialVote,
  }
  const PartialBurnVotingProposalFacetSettings = {
    proposalCreationCost: ether.mul(1),
    _PartialVotingProposalFacetInitParams: {
      votingSettings: {
        votingMode: VotingMode.MultiplePartialVote, //IPartialVotingFacet.VotingMode
        supportThreshold: 0.5 * 10**6, //uint32
        minParticipation: 0.2 * 10**6, //uint32
        maxSingleWalletPower: 0.1 * 10**6, //uint32
        minDuration: 7 * days, //uint64
        minProposerVotingPower: ether.mul(1), //uint256
      },
    }
  };
  const GovernanceERC20BurnableFacetSettings = {
    _GovernanceERC20FacetInitParams: {
      _ERC20VotesFacetInitParams: {
        _ERC20PermitFacetInitParams: {
          _ERC20FacetInitParams: {
            name: "SecureSECO Reputation", //string
            symbol: "SECOREP", //string
          }
        }
      }
    }
  }
  const VerificationFacetSettings = {
    verificationContractAddress: diamondGovernance.SignVerification.address, //address
    providers: ["github", "proofofhumanity", "whitelist"], //string[]
    rewards: [3, 10, 9999], //uint256[]
  };
  const ERC20TieredTimeClaimableFacetSettings = {
    tiers: [3, 10, 9999], //uint256[]
    rewards: [ether.mul(1), ether.mul(2), ether.mul(2)], //uint256[]
    _ERC20TimeClaimableFacetInitParams: {
      timeTillReward: 1 * days / 2, //uint256
      maxTimeRewarded: 10 * days / 2, //uint256
    },
  };
  const ERC20OneTimeVerificationRewardFacetSettings = {
    providers: ["github", "proofofhumanity"], //string[]
    repRewards: [ether.mul(10), ether.mul(10)], //uint256[]
    coinRewards: [ether.mul(1), ether.mul(1)], //uint256[]
  };
  const SearchSECOMonetizationFacetSettings = {
    hashCost: to18Decimal("0.01"), // 1 SECOIN per 100 hashes
    queryMiningRewardPoolRatio: 0.5 * 10**6, // 50%
  };
  const SearchSECORewardingFacetSettings = {
    signer: owner.address,
    miningRewardPoolPayoutRatio: to18Decimal("0.01"), // 1%
    hashDevaluationFactor: 10000, // 10000 hashes for 1% of mining reward pool
    hashRepReward: to18Decimal("0.01"), // 1 SECOREP per 100 hashes
  };
  const MonetaryTokenFacetSettings = {
    monetaryTokenContractAddress: MonetaryToken,
  };
  const RewardMultiplierSettings = {
    name: "inflation",
    startTimestamp: now(),
    initialAmount: BigNumber.from(10).pow(18), // dec18 = 1
    slope: 0,
  };
  const ABCConfigureFacetSettings = {
    marketMaker: monetaryTokenDeployer.deployedContracts.MarketMaker,
    hatcher: monetaryTokenDeployer.deployedContracts.SimpleHatch,
  };

  const cut : DiamondCut[] = [
    await DiamondCut.All(diamondGovernance.DiamondCutFacet),
    await DiamondCut.All(diamondGovernance.DiamondLoupeFacet),
    await DiamondCut.All(diamondGovernance.DAOReferenceFacet),
    await DiamondCut.All(diamondGovernance.PluginFacet),
    await DiamondCut.All(diamondGovernance.AragonAuthFacet),
    await DiamondCut.All(diamondGovernance.PartialBurnVotingProposalFacet, [PartialBurnVotingProposalFacetSettings]),
    await DiamondCut.All(diamondGovernance.PartialVotingFacet),
    await DiamondCut.All(diamondGovernance.GithubPullRequestFacet),
    await DiamondCut.Only(diamondGovernance.GovernanceERC20DisabledFacet, ERC20Disabled),
    await DiamondCut.Except(diamondGovernance.GovernanceERC20BurnableFacet, ERC20Disabled, [GovernanceERC20BurnableFacetSettings]),
    await DiamondCut.All(diamondGovernance.VerificationFacet, [VerificationFacetSettings]),
    await DiamondCut.All(diamondGovernance.ERC20TieredTimeClaimableFacet, [ERC20TieredTimeClaimableFacetSettings]),
    await DiamondCut.All(diamondGovernance.ERC20OneTimeVerificationRewardFacet, [ERC20OneTimeVerificationRewardFacetSettings]),
    await DiamondCut.All(diamondGovernance.ERC20MultiMinterFacet),
    await DiamondCut.All(diamondGovernance.SearchSECOMonetizationFacet, [SearchSECOMonetizationFacetSettings]),
    await DiamondCut.All(diamondGovernance.SearchSECORewardingFacet, [SearchSECORewardingFacetSettings]),
    await DiamondCut.All(diamondGovernance.MiningRewardPoolFacet),
    await DiamondCut.All(diamondGovernance.VerificationRewardPoolFacet),
    await DiamondCut.All(diamondGovernance.MonetaryTokenFacet, [MonetaryTokenFacetSettings]),
    await DiamondCut.All(diamondGovernance.ERC20PartialBurnVotingProposalRefundFacet),
    await DiamondCut.All(diamondGovernance.RewardMultiplierFacet, [RewardMultiplierSettings]),
    await DiamondCut.All(diamondGovernance.ABCConfigureFacet, [ABCConfigureFacetSettings]),
  ];
  const settings : DAOCreationSettings = {
    trustedForwarder: ethers.constants.AddressZero,
    daoURI: "https://dao.secureseco.org/",
    subdomain: randomSubdomain ? "dao" + Math.round(Math.random() * 100000) : "test-secureseco",
    metadata: {
      name: "SecureSECO DAO",
      description: "Decentralized Autonomous Organization for the SecureSECO project.",
      links: [{
        name: "SecureSECO",
        url: "https://secureseco.org/",
      }, {
        name: "Documentation",
        url: "https://docs.secureseco.org/",
      }, {
        name: "GitHub",
        url: "https://github.com/SecureSECODAO",
      }],
      avatar: "ipfs://QmaoV7cWi2qeAX81E429ER2RUsjC93LVsJ5JJETv5h8p8t"
    },
    diamondCut: cut,
    additionalPlugins: []
  };
  const dao = await CreateDAO(settings, owner);
  console.log("DAO:", dao.dao.address);
  console.log("Diamond Governance:", dao.diamondGovernance.address);
  
  await monetaryTokenDeployer.afterDAODeploy(dao.dao.address, dao.diamondGovernance.address);
  await diamondGovernance.SignVerification.transferOwnership(dao.diamondGovernance.address); // Transfer to diamond governance

  console.log("Deploy finished!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});