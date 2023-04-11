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
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

// Utils
import { deployAragonDAOAndVerifyFixture } from "../utils/verificationHelper";

// Types

// Other

describe("ERC20TimeClaimable", function () {
  it("should give 10 tokens on first claim", async function () {
    const { DiamondGovernance } = await loadFixture(deployAragonDAOAndVerifyFixture);
    const ERC20TimeClaimableFacet = await ethers.getContractAt("ERC20TimeClaimableFacet", DiamondGovernance.address);
    const ERC20Facet = await ethers.getContractAt("ERC20Facet", DiamondGovernance.address);
    const [owner] = await ethers.getSigners();

    const balanceBefore = await ERC20Facet.balanceOf(owner.address);
    await ERC20TimeClaimableFacet.claimTime();
    const balanceAfter = await ERC20Facet.balanceOf(owner.address);

    expect(balanceAfter).to.be.equal(balanceBefore.add(10));
  });

  it("should give 0 tokens on claim after just having claimed", async function () {
    const { DiamondGovernance } = await loadFixture(deployAragonDAOAndVerifyFixture);
    const ERC20TimeClaimableFacet = await ethers.getContractAt("ERC20TimeClaimableFacet", DiamondGovernance.address);
    const ERC20Facet = await ethers.getContractAt("ERC20Facet", DiamondGovernance.address);
    const [owner] = await ethers.getSigners();

    await ERC20TimeClaimableFacet.claimTime();
    const balanceBefore = await ERC20Facet.balanceOf(owner.address);
    await ERC20TimeClaimableFacet.claimTime();
    const balanceAfter = await ERC20Facet.balanceOf(owner.address);

    expect(balanceAfter).to.be.equal(balanceBefore);
  });
});