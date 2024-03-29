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
import { 
    getSelectors,
    FacetCutAction,
    removeSelectors,
    findAddressPositionInFacets 
} from "../utils/diamondHelper";

// Types

// Other
import { deployDiamond, deployTest1Facet, deployTest2Facet } from "../deployments/deploy_ExampleDiamond";

async function deployDiamondWithTest1Facet() {
    const { Diamond, DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet, DiamondCutFacetDeploy, DiamondLoupeFacetDeploy, OwnershipFacetDeploy } = await loadFixture(deployDiamond);
    const { Test1Facet, Test1FacetDeploy } = await deployTest1Facet(DiamondCutFacet);
    return { Diamond, DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet, DiamondCutFacetDeploy, DiamondLoupeFacetDeploy, OwnershipFacetDeploy, Test1Facet, Test1FacetDeploy };
}

async function deployDiamondWithTest2Facet() {
    const { Diamond, DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet, DiamondCutFacetDeploy, DiamondLoupeFacetDeploy, OwnershipFacetDeploy } = await loadFixture(deployDiamond);
    const { Test2Facet, Test2FacetDeploy }  = await deployTest2Facet(DiamondCutFacet);
    return { Diamond, DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet, DiamondCutFacetDeploy, DiamondLoupeFacetDeploy, OwnershipFacetDeploy, Test2Facet, Test2FacetDeploy };
}

async function deployDiamondWithAllFacets() {
    const { Diamond, DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet, DiamondCutFacetDeploy, DiamondLoupeFacetDeploy, OwnershipFacetDeploy } = await loadFixture(deployDiamond);
    const { Test1Facet, Test1FacetDeploy } = await deployTest1Facet(DiamondCutFacet);
    const { Test2Facet, Test2FacetDeploy }  = await deployTest2Facet(DiamondCutFacet);
    return { Diamond, DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet, DiamondCutFacetDeploy, DiamondLoupeFacetDeploy, OwnershipFacetDeploy, Test1Facet, Test1FacetDeploy, Test2Facet, Test2FacetDeploy };
}
  
describe('ExampleDiamond', function () {
    it('should have three facets -- call to facetAddresses function', async function () {
        const { DiamondLoupeFacet } = await loadFixture(deployDiamond);

        expect(await DiamondLoupeFacet.facetAddresses()).to.be.lengthOf(3);
    });

    it('facets should have the right function selectors -- call to facetFunctionSelectors function', async function () {
        const { DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet, DiamondCutFacetDeploy, DiamondLoupeFacetDeploy, OwnershipFacetDeploy } = await loadFixture(deployDiamond);

        expect(await DiamondLoupeFacet.facetFunctionSelectors(DiamondCutFacetDeploy.address)).to.have.same.members(getSelectors(DiamondCutFacet).selectors);
        expect(await DiamondLoupeFacet.facetFunctionSelectors(DiamondLoupeFacetDeploy.address)).to.have.same.members(getSelectors(DiamondLoupeFacet).selectors);
        expect(await DiamondLoupeFacet.facetFunctionSelectors(OwnershipFacetDeploy.address)).to.have.same.members(getSelectors(OwnershipFacet).selectors);
    });

    it('selectors should be associated to facets correctly -- multiple calls to facetAddress function', async function () {
        const { DiamondLoupeFacet, DiamondCutFacetDeploy, DiamondLoupeFacetDeploy, OwnershipFacetDeploy } = await loadFixture(deployDiamond);

        expect(await DiamondLoupeFacet.facetAddress('0x3a6327ed')).to.be.equal(DiamondCutFacetDeploy.address);
        expect(await DiamondLoupeFacet.facetAddress('0xcdffacc6')).to.be.equal(DiamondLoupeFacetDeploy.address);
        expect(await DiamondLoupeFacet.facetAddress('0x01ffc9a7')).to.be.equal(DiamondLoupeFacetDeploy.address);
        expect(await DiamondLoupeFacet.facetAddress('0xf2fde38b')).to.be.equal(OwnershipFacetDeploy.address);
    });

    it('should add test1 functions', async function () {
        const { DiamondLoupeFacet, Test1Facet, Test1FacetDeploy } = await loadFixture(deployDiamondWithTest1Facet);

        const selectors = getSelectors(Test1Facet).remove(['supportsInterface(bytes4)']);

        expect(await DiamondLoupeFacet.facetFunctionSelectors(Test1FacetDeploy.address)).to.have.same.members(selectors.selectors);
    });

    it('should test function call', async function () {
        const { Test1Facet } = await loadFixture(deployDiamondWithTest1Facet);

        expect(Test1Facet.test1Func10()).to.not.be.reverted;
    });

    it('should replace supportsInterface function', async function () {
        const { DiamondCutFacet, DiamondLoupeFacet, Test1Facet, Test1FacetDeploy } = await loadFixture(deployDiamondWithTest1Facet);

        const selectors = getSelectors(Test1Facet).get(['supportsInterface(bytes4)']);
        const tx = await DiamondCutFacet.diamondCut(
        [{
            facetAddress: Test1FacetDeploy.address,
            action: FacetCutAction.Replace,
            functionSelectors: selectors.selectors,
            initCalldata: "0x",
        }]);
        const receipt = await tx.wait();

        expect(receipt.status).to.be.equal(1);
        expect(await DiamondLoupeFacet.facetFunctionSelectors(Test1FacetDeploy.address)).to.have.same.members(getSelectors(Test1Facet).selectors);
    });

    it('should add test2 functions', async function () {
        const { DiamondLoupeFacet, Test2Facet, Test2FacetDeploy } = await loadFixture(deployDiamondWithTest2Facet);
        
        expect(await DiamondLoupeFacet.facetFunctionSelectors(Test2FacetDeploy.address)).to.have.same.members(getSelectors(Test2Facet).selectors);
    });

    it('should remove some test2 functions', async function () {
        const { DiamondCutFacet, DiamondLoupeFacet, Test2Facet, Test2FacetDeploy } = await loadFixture(deployDiamondWithTest2Facet);
        const functionsToKeep = ['test2Func1()', 'test2Func5()', 'test2Func6()', 'test2Func19()', 'test2Func20()']
        const selectors = getSelectors(Test2Facet).remove(functionsToKeep)
        const tx = await DiamondCutFacet.diamondCut(
        [{
            facetAddress: ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            functionSelectors: selectors.selectors,
            initCalldata: "0x",
        }]);
        const receipt = await tx.wait();
        
        expect(receipt.status).to.be.equal(1);
        expect(await DiamondLoupeFacet.facetFunctionSelectors(Test2FacetDeploy.address)).to.have.same.members(getSelectors(Test2Facet).get(functionsToKeep).selectors);
    });

    it('should remove some test1 functions', async function () {
        const { DiamondCutFacet, DiamondLoupeFacet, Test1Facet, Test1FacetDeploy } = await loadFixture(deployDiamondWithTest1Facet);
        const functionsToKeep = ['test1Func2()', 'test1Func11()', 'test1Func12()']
        const selectors = getSelectors(Test1Facet).remove(functionsToKeep)
        const tx = await DiamondCutFacet.diamondCut(
        [{
            facetAddress: ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            functionSelectors: selectors.selectors,
            initCalldata: "0x",
        }]);
        const receipt = await tx.wait();

        expect(receipt.status).to.be.equal(1);
        expect(await DiamondLoupeFacet.facetFunctionSelectors(Test1FacetDeploy.address)).to.have.same.members(getSelectors(Test1Facet).get(functionsToKeep).selectors);
    });

    it('remove all functions and facets except \'diamondCut\' and \'facets\'', async function () {
        const { DiamondCutFacet, DiamondLoupeFacet, DiamondCutFacetDeploy, DiamondLoupeFacetDeploy } = await loadFixture(deployDiamondWithAllFacets);

        let selectors = [];
        const facetsBefore = await DiamondLoupeFacet.facets();
        for (let i = 0; i < facetsBefore.length; i++) {
            selectors.push(...facetsBefore[i].functionSelectors)
        }
        selectors = removeSelectors(selectors, ['facets()', 'diamondCut(tuple(address,uint8,bytes4[],bytes)[])']);
        const tx = await DiamondCutFacet.diamondCut(
        [{
            facetAddress: ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            functionSelectors: selectors,
            initCalldata: "0x",
        }]);
        const receipt = await tx.wait();
        const facetsAfter = await DiamondLoupeFacet.facets();

        expect(receipt.status).to.be.equal(1);
        expect(facetsAfter).to.be.lengthOf(2);
        expect(facetsAfter[0][0]).to.be.equal(DiamondCutFacetDeploy.address);
        expect(facetsAfter[0][1]).to.have.same.members(['0x3a6327ed']);
        expect(facetsAfter[1][0]).to.be.equal(DiamondLoupeFacetDeploy.address);
        expect(facetsAfter[1][1]).to.have.same.members(['0x7a0ed627']);
    });

    it('add most functions and facets', async function () {
        const { DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet, Test1Facet, Test2Facet, DiamondCutFacetDeploy, DiamondLoupeFacetDeploy, OwnershipFacetDeploy, Test1FacetDeploy, Test2FacetDeploy } = await loadFixture(deployDiamondWithAllFacets);

        let selectors = [];
        const facetsBefore = await DiamondLoupeFacet.facets();
        for (let i = 0; i < facetsBefore.length; i++) {
            selectors.push(...facetsBefore[i].functionSelectors)
        }
        selectors = removeSelectors(selectors, ['facets()', 'diamondCut(tuple(address,uint8,bytes4[],bytes)[])']);
        const txRemove = await DiamondCutFacet.diamondCut(
        [{
            facetAddress: ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            functionSelectors: selectors,
            initCalldata: "0x",
        }]);
        const receiptRemove = await txRemove.wait();
        expect(receiptRemove.status).to.be.equal(1);
        
        const diamondLoupeFacetSelectors = getSelectors(DiamondLoupeFacet).remove(['supportsInterface(bytes4)']);
        // Any number of functions from any number of facets can be added/replaced/removed in a
        // single transaction
        const cut = [
        {
            facetAddress: DiamondLoupeFacetDeploy.address,
            action: FacetCutAction.Add,
            functionSelectors: diamondLoupeFacetSelectors.copy().remove(['facets()']).selectors,
            initCalldata: "0x",
        },
        {
            facetAddress: OwnershipFacetDeploy.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(OwnershipFacet).selectors,
            initCalldata: "0x",
        },
        {
            facetAddress: Test1FacetDeploy.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(Test1Facet).selectors,
            initCalldata: "0x",
        },
        {
            facetAddress: Test2FacetDeploy.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(Test2Facet).selectors,
            initCalldata: "0x",
        }
        ];
        const tx = await DiamondCutFacet.diamondCut(cut);
        const receipt = await tx.wait();
        const facets = await DiamondLoupeFacet.facets();
        const facetAddresses = await DiamondLoupeFacet.facetAddresses();

        expect(receipt.status).to.be.equal(1);
        expect(facetAddresses).to.be.lengthOf(5);
        expect(facets).to.be.lengthOf(5);
        expect(facets[0][0]).to.be.equal(facetAddresses[0]);
        expect(facets[1][0]).to.be.equal(facetAddresses[1]);
        expect(facets[2][0]).to.be.equal(facetAddresses[2]);
        expect(facets[3][0]).to.be.equal(facetAddresses[3]);
        expect(facets[4][0]).to.be.equal(facetAddresses[4]);
        expect(facets[findAddressPositionInFacets(DiamondCutFacetDeploy.address, facets)][1]).to.have.same.members(getSelectors(DiamondCutFacet).selectors);
        expect(facets[findAddressPositionInFacets(DiamondLoupeFacetDeploy.address, facets)][1]).to.have.same.members(diamondLoupeFacetSelectors.selectors);
        expect(facets[findAddressPositionInFacets(OwnershipFacetDeploy.address, facets)][1]).to.have.same.members(getSelectors(OwnershipFacet).selectors);
        expect(facets[findAddressPositionInFacets(Test1FacetDeploy.address, facets)][1]).to.have.same.members(getSelectors(Test1Facet).selectors);
        expect(facets[findAddressPositionInFacets(Test2FacetDeploy.address, facets)][1]).to.have.same.members(getSelectors(Test2Facet).selectors);
    });
});