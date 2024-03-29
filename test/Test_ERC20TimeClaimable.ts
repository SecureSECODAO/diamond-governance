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
import { expect } from "chai";
import { loadFixture, mine } from "@nomicfoundation/hardhat-network-helpers";

// Utils
import { getDeployedDiamondGovernance } from "../utils/deployedContracts";
import { createTestingDao, deployTestNetwork } from "./utils/testDeployer";
import { DiamondCut } from "../utils/diamondGovernanceHelper";
import { days, now } from "../utils/timeUnits";
import { DECIMALS_18 } from "../utils/decimals18Helper";

// Types

// Other

async function getClient() {
  await loadFixture(deployTestNetwork);
  const [owner] = await ethers.getSigners();
  const diamondGovernance = await getDeployedDiamondGovernance(owner);
  const GovernanceERC20FacetSettings = {
      _ERC20VotesFacetInitParams: {
          _ERC20PermitFacetInitParams: {
              _ERC20FacetInitParams: {
                  name: "Token",
                  symbol: "TOK",
              }
          }
      }
  };
  const ERC20TimeClaimableFacetSettings = {
      timeTillReward: 1 * days / 2,
      maxTimeRewarded: 10 * days / 2,
  };
  const RewardMultiplierSettings = {
    name: "inflation",
    startTimestamp: 0,
    initialAmount: DECIMALS_18,
    slope: 0,
  };
  const cut : DiamondCut[] = [
      await DiamondCut.All(diamondGovernance.GovernanceERC20Facet, [GovernanceERC20FacetSettings]),
      await DiamondCut.All(diamondGovernance.ERC20TimeClaimableFacet, [ERC20TimeClaimableFacetSettings]),
      await DiamondCut.All(diamondGovernance.RewardMultiplierFacet, [RewardMultiplierSettings]),
  ];
  return createTestingDao(cut);
  }

describe("ERC20TimeClaimable", function () {
  it("should give 10 tokens on first claim", async function () {
    const client = await loadFixture(getClient);
    const IERC20TimeClaimableFacet = await client.pure.IERC20TimeClaimableFacet();
    const IERC20Facet = await client.pure.IERC20();
    const [owner] = await ethers.getSigners();

    await mine(10 * days / 2);

    const balanceBefore = await IERC20Facet.balanceOf(owner.address);
    await IERC20TimeClaimableFacet.claimTime();
    const balanceAfter = await IERC20Facet.balanceOf(owner.address);

    expect(balanceAfter).to.be.equal(balanceBefore.add(10));
  });

  it("should give 0 tokens on claim after just having claimed", async function () {
    const client = await loadFixture(getClient);
    const IERC20TimeClaimableFacet = await client.pure.IERC20TimeClaimableFacet();
    const IERC20Facet = await client.pure.IERC20();
    const [owner] = await ethers.getSigners();

    await IERC20TimeClaimableFacet.claimTime();
    const balanceBefore = await IERC20Facet.balanceOf(owner.address);
    await IERC20TimeClaimableFacet.claimTime();
    const balanceAfter = await IERC20Facet.balanceOf(owner.address);

    expect(balanceAfter).to.be.equal(balanceBefore);
  });

  it("should give 1 tokens on claim after claiming again 1 day later", async function () {
    const client = await loadFixture(getClient);
    const IERC20TimeClaimableFacet = await client.pure.IERC20TimeClaimableFacet();
    const IERC20Facet = await client.pure.IERC20();
    const [owner] = await ethers.getSigners();

    await IERC20TimeClaimableFacet.claimTime();
    const balanceBefore = await IERC20Facet.balanceOf(owner.address);
    await mine(1 * days / 2);
    await IERC20TimeClaimableFacet.claimTime();
    const balanceAfter = await IERC20Facet.balanceOf(owner.address);

    expect(balanceAfter).to.be.equal(balanceBefore.add(1));
  });
});