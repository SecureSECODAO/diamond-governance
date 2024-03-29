/**
 * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
 * © Copyright Utrecht University (Department of Information and Computing Sciences)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Framework
import { ethers } from "hardhat";

// Tests
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";

// Utils
import { getDeployedDiamondGovernance } from "../utils/deployedContracts";
import { createTestingDao, deployTestNetwork } from "./utils/testDeployer";
import { DiamondCut } from "../utils/diamondGovernanceHelper";
import { ether } from "../utils/etherUnits";
import { GetTypedContractAt } from "../utils/contractHelper";
import { days, now } from "../utils/timeUnits";
import { createSignature } from "../utils/signatureHelper";

// Types
import { ERC20MonetaryToken, ExecuteAnythingFacet, SignVerification } from "../typechain-types";
import { DiamondGovernanceClient } from "../sdk/index";
import { FixedSupplyDeployer } from "../deployments/deploy_MonetaryToken";
import { Signer } from "@ethersproject/abstract-signer";

// Other

// CONSTANTS
const INITIAL_MINT_AMOUNT = 1e6;

async function getClient() {
  await loadFixture(deployTestNetwork);
  const [owner] = await ethers.getSigners();
  const deployer = new FixedSupplyDeployer();
  const monetaryToken = await deployer.beforeDAODeploy();
  const diamondGovernance = await getDeployedDiamondGovernance(owner);
  
  const ERC20OneTimeVerificationRewardFacetSettings = {
    providers: ["github", "proofofhumanity"], //string[]
    repRewards: [ether.mul(30), ether.mul(100)], //uint256[]
    coinRewards: [ether.mul(1), ether.mul(100)], //uint256[]
  };
  const MonetaryTokenFacetSettings = {
    monetaryTokenContractAddress: monetaryToken,
  };
  // Providers and rewards are not used in this test
  const verificationSettings = {
    verificationContractAddress: diamondGovernance.SignVerification.address,
    providers: ["github"],
    rewards: [1],
  }
  const GovernanceERC20FacetSettings = {
    _ERC20VotesFacetInitParams: {
      _ERC20PermitFacetInitParams: {
        _ERC20FacetInitParams: {
          name: "Token",
          symbol: "TOK",
        },
      },
    },
  };
  const cut: DiamondCut[] = [
    await DiamondCut.All(diamondGovernance.VerificationRewardPoolFacet),
    await DiamondCut.All(diamondGovernance.ERC20OneTimeVerificationRewardFacet, [ERC20OneTimeVerificationRewardFacetSettings]),
    // await DiamondCut.All(diamondGovernance.ExecuteAnythingFacet),
    await DiamondCut.All(diamondGovernance.MonetaryTokenFacet, [MonetaryTokenFacetSettings]),
    await DiamondCut.All(diamondGovernance.ExecuteAnythingFacet),
    await DiamondCut.All(diamondGovernance.VerificationFacet, [verificationSettings]),
    await DiamondCut.All(diamondGovernance.GovernanceERC20Facet, [
      GovernanceERC20FacetSettings,
    ]),
  ];
  return createTestingDao(cut);
}

const getERC20MonetaryTokenContract = async (
  client: DiamondGovernanceClient
) => {
  const [owner] = await ethers.getSigners();
  const tokenAddress = await (
    await client.pure.IMonetaryTokenFacet()
  ).getTokenContractAddress();
  const ERC20MonetaryToken = await GetTypedContractAt<ERC20MonetaryToken>(
    "ERC20MonetaryToken",
    tokenAddress,
    owner
  );
  return ERC20MonetaryToken;
};

const getERC20MonetaryTokenContractAndInit = async (
  client: DiamondGovernanceClient
) => {
  const [owner] = await ethers.getSigners();
  const ERC20MonetaryToken = await getERC20MonetaryTokenContract(client);
  await ERC20MonetaryToken.init(owner.address, ether.mul(INITIAL_MINT_AMOUNT));

  return ERC20MonetaryToken;
};

// Approves the diamond to handle the treasury
const approveEverything = async (client: DiamondGovernanceClient, ERC20MonetaryToken: ERC20MonetaryToken, owner: Signer) => {
  // (us) Approve plugin to spend (our) tokens: this is needed for the plugin to transfer tokens from our account
  await ERC20MonetaryToken.approve(client.pure.pluginAddress, ether.mul(INITIAL_MINT_AMOUNT));
  // (DAO) Approve plugin to spend tokens: this is needed for the plugin to transfer tokens from the DAO
  await (
    await GetTypedContractAt<ExecuteAnythingFacet>(
      "ExecuteAnythingFacet",
      client.pure.pluginAddress,
      owner
    )
  ).executeAnything([
    {
      to: ERC20MonetaryToken.address,
      value: 0,
      data: ERC20MonetaryToken.interface.encodeFunctionData("approve", [
        client.pure.pluginAddress,
        ethers.constants.MaxUint256,
      ]),
    },
  ]);
}

describe("VerificationRewardPool", async function () {
  it("increase reward pool", async function () {
    const client = await loadFixture(getClient);
    const ERC20MonetaryToken = await getERC20MonetaryTokenContractAndInit(client);
    const IVerificationRewardPoolFacet = await client.pure.IVerificationRewardPoolFacet();
    const [owner] = await ethers.getSigners();

    await approveEverything(client, ERC20MonetaryToken, owner);

    await IVerificationRewardPoolFacet.donateToVerificationRewardPool(ether.mul(INITIAL_MINT_AMOUNT));
    const verificationRewardPool = await IVerificationRewardPoolFacet.getVerificationRewardPool();
    expect(verificationRewardPool).to.equal(ether.mul(INITIAL_MINT_AMOUNT));
  });

  it("reward verifyers", async function () {
    const client = await loadFixture(getClient);
    const ERC20MonetaryToken = await getERC20MonetaryTokenContractAndInit(client);
    const IVerificationRewardPoolFacet = await client.pure.IVerificationRewardPoolFacet();
    const [owner] = await ethers.getSigners();

    await approveEverything(client, ERC20MonetaryToken, owner);

    await IVerificationRewardPoolFacet.donateToVerificationRewardPool(ether.mul(INITIAL_MINT_AMOUNT));

    const IVerificationFacet = await client.pure.IVerificationFacet();
    const verificationContractAddress = await IVerificationFacet.getVerificationContractAddress();
    const standaloneVerificationContract = await GetTypedContractAt<SignVerification>("SignVerification", verificationContractAddress, owner);

    // Verify "owner"
    const timestamp = now();
    const userHash =
      "090d4910f4b4038000f6ea86644d55cb5261a1dc1f006d928dcc049b157daff8";
    const dataHexString = await createSignature(timestamp, owner.address, userHash, owner);

    // Throws if verification fails
    await standaloneVerificationContract.verifyAddress(owner.address, userHash, timestamp, "github", dataHexString);
    await time.increase(1 * days); // To avoid time inconsistencies between blockchain and local machine

    const IERC20OneTimeVerificationRewardFacet = await client.pure.IERC20OneTimeVerificationRewardFacet();

    await IERC20OneTimeVerificationRewardFacet.claimVerificationRewardAll();

    // These three requests can be parallellized
    // Check that 30 big rep has been deposited to our account
    const repInterface = await client.pure.IERC20();
    expect(await repInterface.balanceOf(owner.address)).to.be.equal(ether.mul(30));

    // Check that our account now has 1 big coin more
    expect(await ERC20MonetaryToken.balanceOf(owner.address)).to.be.equal(ether.mul(1));

    // Check that the verification pool now has 1 big coin less
    expect(await IVerificationRewardPoolFacet.getVerificationRewardPool()).to.be.equal(ether.mul(INITIAL_MINT_AMOUNT).sub(ether.mul(1)));

    // Check that the treasury has 1 big coin less
    const IDAOReferenceFacet = await client.pure.IDAOReferenceFacet();
    const daoAddress = await IDAOReferenceFacet.dao();
    expect(ERC20MonetaryToken.balanceOf(daoAddress));

    const toClaim = await IERC20OneTimeVerificationRewardFacet.tokensClaimableVerificationRewardAll();
    expect(toClaim[0][0]).to.be.equal(0);
    expect(toClaim[0][1]).to.be.equal(0);
    expect(toClaim[0]).to.be.deep.equal(toClaim[1][0]);
  });
  it("cap secoin reward at verification reward pool balance", async function () {
    const client = await loadFixture(getClient);
    const ERC20MonetaryToken = await getERC20MonetaryTokenContract(client);
    const [owner] = await ethers.getSigners();

    await approveEverything(client, ERC20MonetaryToken, owner);

    const IVerificationFacet = await client.pure.IVerificationFacet();
    const verificationContractAddress = await IVerificationFacet.getVerificationContractAddress();
    // const standaloneVerificationContract = await ethers.getContractAt("SignVerification", verificationContractAddress);
    const standaloneVerificationContract = await GetTypedContractAt<SignVerification>("SignVerification", verificationContractAddress, owner);

    // Verify "owner"
    const timestamp = now();
    const userHash =
      "090d4910f4b4038000f6ea86644d55cb5261a1dc1f006d928dcc049b157daff8";
    const dataHexString = await createSignature(timestamp, owner.address, userHash, owner);

    // Throws if verification fails
    await standaloneVerificationContract.verifyAddress(owner.address, userHash, timestamp, "github", dataHexString);
    await time.increase(1 * days); // To avoid time inconsistencies between blockchain and local machine

    const IERC20OneTimeVerificationRewardFacet = await client.pure.IERC20OneTimeVerificationRewardFacet();

    // There's currently no coins in the verification reward pool
    await IERC20OneTimeVerificationRewardFacet.claimVerificationRewardAll();

    // These two requests can be parallellized
    const repInterface = await client.pure.IERC20();
    // Rep is minted to our account
    expect(await repInterface.balanceOf(owner.address)).to.be.equal(ether.mul(30));

    // Our account should have 0 coins
    expect(await ERC20MonetaryToken.balanceOf(owner.address)).to.be.equal(0);
  });
  it("cap secoin reward at verification reward pool balance 2", async function () {
    const client = await loadFixture(getClient);
    const ERC20MonetaryToken = await getERC20MonetaryTokenContractAndInit(client);
    const IVerificationRewardPoolFacet = await client.pure.IVerificationRewardPoolFacet();
    const [owner] = await ethers.getSigners();

    await approveEverything(client, ERC20MonetaryToken, owner);

    await IVerificationRewardPoolFacet.donateToVerificationRewardPool(ether.mul(41));

    const IVerificationFacet = await client.pure.IVerificationFacet();
    const verificationContractAddress = await IVerificationFacet.getVerificationContractAddress();
    // const standaloneVerificationContract = await ethers.getContractAt("SignVerification", verificationContractAddress);
    const standaloneVerificationContract = await GetTypedContractAt<SignVerification>("SignVerification", verificationContractAddress, owner);

    // Verify "owner"
    const timestamp = now();
    const userHash =
      "090d4910f4b4038000f6ea86644d55cb5261a1dc1f006d928dcc049b157daff8";
    const userHash2 = "090d4910f4b4038000f6ea86644d55cb5261a1dc1f006d928dcc049b157daff9";
    const dataHexString = await createSignature(timestamp, owner.address, userHash, owner);
    const dataHexString2 = await createSignature(timestamp, owner.address, userHash2, owner, "proofofhumanity");

    // Throws if verification fails
    await standaloneVerificationContract.verifyAddress(owner.address, userHash, timestamp, "github", dataHexString);
    await standaloneVerificationContract.verifyAddress(owner.address, userHash2, timestamp, "proofofhumanity", dataHexString2);
    await time.increase(1 * days); // To avoid time inconsistencies between blockchain and local machine

    const IERC20OneTimeVerificationRewardFacet = await client.pure.IERC20OneTimeVerificationRewardFacet();

    // There's currently no coins in the verification reward pool
    await IERC20OneTimeVerificationRewardFacet.claimVerificationRewardAll();

    // These two requests can be parallellized
    const repInterface = await client.pure.IERC20();
    // Rep is minted to our account
    expect(await repInterface.balanceOf(owner.address)).to.be.equal(ether.mul(30 + 100));

    // Our account should have all our initial coins back
    expect(await ERC20MonetaryToken.balanceOf(owner.address)).to.be.equal(ether.mul(INITIAL_MINT_AMOUNT));
    expect(await IVerificationRewardPoolFacet.getVerificationRewardPool()).to.be.equal(0); // The pool should be empty
    const tokensClaimableGH = await IERC20OneTimeVerificationRewardFacet.tokensClaimableVerificationRewardStamp(0);
    const tokensClaimablePOH = await IERC20OneTimeVerificationRewardFacet.tokensClaimableVerificationRewardStamp(1);
    expect(tokensClaimableGH[0]).to.be.equal(0); // Nothing left to claim for gh rep
    expect(tokensClaimableGH[1]).to.be.equal(0); // Nothing left to claim for gh coin
    expect(tokensClaimablePOH[0]).to.be.equal(0); // Nothing left to claim for poh rep 
    expect(tokensClaimablePOH[1]).to.be.equal(0); // 60 left to claim for poh coin but nothing in treasury

    // Now we donate 61 big coin to the pool
    await IVerificationRewardPoolFacet.donateToVerificationRewardPool(ether.mul(61));
    expect(await IERC20OneTimeVerificationRewardFacet.tokensClaimableVerificationRewardStamp(1)).to.be.deep.equal([0, ether.mul(60)]); // 60 left to claim for poh coin while 61 in treasury
  });
});