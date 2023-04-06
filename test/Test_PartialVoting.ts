// Framework
import { ethers } from "hardhat";

// Tests
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

// Utils
import { toBytes, getEvents } from "../utils/utils";
import { createSignature } from "../utils/signatureHelper";

// Types
import { IPartialVotingFacet, PartialVotingFacet, PartialVotingProposalFacet } from "../typechain-types";

// Other
import { deployAragonDAO } from "../deployments/deploy_AragonDAO";

enum VoteOption { Abstain, Yes, No }

async function getVotingPower(amount : number) {
  const { DiamondGovernance, diamondGovernanceContracts, verificationContractAddress } = await loadFixture(deployAragonDAO);
  const [owner] = await ethers.getSigners();
  const ERC20ClaimableFacet = await ethers.getContractAt("ERC20ClaimableFacet", DiamondGovernance.address);
  const standaloneVerificationContract = await ethers.getContractAt("GithubVerification", verificationContractAddress);

  const timestamp = Date.now();
  const userHash =
    "090d4910f4b4038000f6ea86644d55cb5261a1dc1f006d928dcc049b157daff8";
  const dataHexString = await createSignature(timestamp, owner.address, userHash, owner);
  await standaloneVerificationContract.verifyAddress(owner.address, userHash, timestamp, "github", dataHexString);
  await ERC20ClaimableFacet.claim();
}

async function createProposal() {
  const { DiamondGovernance } = await loadFixture(deployAragonDAO);
  await getVotingPower(10);
  const PartialVotingProposalFacet = await ethers.getContractAt("PartialVotingProposalFacet", DiamondGovernance.address);

  const start = Math.round(new Date().getTime() / 1000) + 60;
  const proposalData = {
      _metadata: toBytes("Metadata"), //bytes
      _actions: [], //IDAO.Action[]
      _allowFailureMap: 0, //uint256
      _startDate: start, //uint64
      _endDate: start + 1440, //uint64
      _allowEarlyExecution: true //bool
  }
  const tx = await PartialVotingProposalFacet.createProposal(proposalData._metadata, proposalData._actions, proposalData._allowFailureMap, 
    proposalData._startDate, proposalData._endDate, proposalData._allowEarlyExecution);
  const receipt = await tx.wait();
  const proposalCreationEvents = getEvents(PartialVotingProposalFacet, "ProposalCreated", receipt).map((log : any) => log.name);
  expect(proposalCreationEvents).to.be.lengthOf(1);

  await time.increaseTo(start + 1);
  const proposalId = PartialVotingProposalFacet.interface.parseLog(receipt.logs[0]).args.proposalId;
  const proposal = await PartialVotingProposalFacet.getProposal(proposalId);
  expect(proposal.tally.yes).to.be.equal(0);
  expect(proposal.tally.no).to.be.equal(0);
  expect(proposal.tally.abstain).to.be.equal(0);

  return { DiamondGovernance, proposalId, proposal };
}

async function voteOnProposal(PartialVotingFacet : PartialVotingFacet, PartialVotingProposalFacet : PartialVotingProposalFacet, proposalId : any, voteData : IPartialVotingFacet.PartialVoteStruct) {
  const tx = await PartialVotingFacet.vote(proposalId, voteData);
  const receipt = await tx.wait();

  const voteCastEvents = getEvents(PartialVotingFacet, "VoteCast", receipt).map((log : any) => log.name);
  expect(voteCastEvents).to.be.lengthOf(1);
  
  const proposalAfterVote = await PartialVotingProposalFacet.getProposal(proposalId);
  return proposalAfterVote;
}

describe("PartialVoting", function () {
  // Allowed simple
  it("should increase yes with the right amount when voting yes on proposal", async function () {
    const { DiamondGovernance, proposalId, proposal } = await loadFixture(createProposal);
    const PartialBurnVotingProposalFacet = await ethers.getContractAt("PartialBurnVotingProposalFacet", DiamondGovernance.address);
    const PartialVotingFacet = await ethers.getContractAt("PartialVotingFacet", DiamondGovernance.address);
    const amount = 2;

    const proposalAfterVote = await voteOnProposal(PartialVotingFacet, PartialBurnVotingProposalFacet, proposalId, { option: VoteOption.Yes, amount: amount });

    expect(proposalAfterVote.tally.abstain).to.be.equal(proposal.tally.abstain);
    expect(proposalAfterVote.tally.yes).to.be.equal(proposal.tally.yes.add(amount));
    expect(proposalAfterVote.tally.no).to.be.equal(proposal.tally.no);
  });

  it("should increase no with the right amount when voting no on proposal", async function () {
    const { DiamondGovernance, proposalId, proposal } = await loadFixture(createProposal);
    const PartialBurnVotingProposalFacet = await ethers.getContractAt("PartialBurnVotingProposalFacet", DiamondGovernance.address);
    const PartialVotingFacet = await ethers.getContractAt("PartialVotingFacet", DiamondGovernance.address);
    const amount = 1;

    const proposalAfterVote = await voteOnProposal(PartialVotingFacet, PartialBurnVotingProposalFacet, proposalId, { option: VoteOption.No, amount: amount });

    expect(proposalAfterVote.tally.abstain).to.be.equal(proposal.tally.abstain);
    expect(proposalAfterVote.tally.yes).to.be.equal(proposal.tally.yes);
    expect(proposalAfterVote.tally.no).to.be.equal(proposal.tally.no.add(amount));
  });

  it("should increase abstain with the right amount when voting abstain on proposal", async function () {
    const { DiamondGovernance, proposalId, proposal } = await loadFixture(createProposal);
    const PartialBurnVotingProposalFacet = await ethers.getContractAt("PartialBurnVotingProposalFacet", DiamondGovernance.address);
    const PartialVotingFacet = await ethers.getContractAt("PartialVotingFacet", DiamondGovernance.address);
    const amount = 4;

    const proposalAfterVote = await voteOnProposal(PartialVotingFacet, PartialBurnVotingProposalFacet, proposalId, { option: VoteOption.Abstain, amount: amount });

    expect(proposalAfterVote.tally.abstain).to.be.equal(proposal.tally.abstain.add(amount));
    expect(proposalAfterVote.tally.yes).to.be.equal(proposal.tally.yes);
    expect(proposalAfterVote.tally.no).to.be.equal(proposal.tally.no);
  });

  //Allowed advanced
  it("should increase yes with the right amount when voting yes multiple times on proposal", async function () {
    const { DiamondGovernance, proposalId, proposal } = await loadFixture(createProposal);
    const PartialBurnVotingProposalFacet = await ethers.getContractAt("PartialBurnVotingProposalFacet", DiamondGovernance.address);
    const PartialVotingFacet = await ethers.getContractAt("PartialVotingFacet", DiamondGovernance.address);
    const amounts = [1, 2];

    let proposalAfterVote = proposal;
    let total = 0;
    for (let i = 0; i < amounts.length; i++) {
      proposalAfterVote = await voteOnProposal(PartialVotingFacet, PartialBurnVotingProposalFacet, proposalId, { option: VoteOption.Yes, amount: amounts[i] });
      total = total + amounts[i];
    }

    expect(proposalAfterVote.tally.abstain).to.be.equal(proposal.tally.abstain);
    expect(proposalAfterVote.tally.yes).to.be.equal(proposal.tally.yes.add(total));
    expect(proposalAfterVote.tally.no).to.be.equal(proposal.tally.no);
  });

  it("should increase yes and no with the right amount when voting yes and no on proposal", async function () {
    const { DiamondGovernance, proposalId, proposal } = await loadFixture(createProposal);
    const PartialBurnVotingProposalFacet = await ethers.getContractAt("PartialBurnVotingProposalFacet", DiamondGovernance.address);
    const PartialVotingFacet = await ethers.getContractAt("PartialVotingFacet", DiamondGovernance.address);
    const amountYes = 4;
    const amountNo = 4;

    await voteOnProposal(PartialVotingFacet, PartialBurnVotingProposalFacet, proposalId, { option: VoteOption.Yes, amount: amountYes });
    const proposalAfterVote = await voteOnProposal(PartialVotingFacet, PartialBurnVotingProposalFacet, proposalId, { option: VoteOption.No, amount: amountNo });

    expect(proposalAfterVote.tally.abstain).to.be.equal(proposal.tally.abstain);
    expect(proposalAfterVote.tally.yes).to.be.equal(proposal.tally.yes.add(amountYes));
    expect(proposalAfterVote.tally.no).to.be.equal(proposal.tally.no.add(amountNo));
  });
  
  // Not allowed
  it("should not allow to vote with amount 0", async function () { 
    const { DiamondGovernance, proposalId } = await loadFixture(createProposal);
    const PartialVotingFacet = await ethers.getContractAt("PartialVotingFacet", DiamondGovernance.address);

    const voteTx = PartialVotingFacet.vote(proposalId, { option: VoteOption.Yes, amount: 0 });

    expect(voteTx).to.be.revertedWithCustomError(PartialVotingFacet, "VoteCastForbidden");
  });

  it("should not allow to vote with amount higher than voting power", async function () { 
    const { DiamondGovernance, proposalId, proposal } = await loadFixture(createProposal);
    const PartialVotingFacet = await ethers.getContractAt("PartialVotingFacet", DiamondGovernance.address);
    const IGovernanceStructure = await ethers.getContractAt("IGovernanceStructure", DiamondGovernance.address);
    const [owner] = await ethers.getSigners();

    const votingPower = await IGovernanceStructure.walletVotingPower(owner.address, proposal.parameters.snapshotBlock);
    const voteTx = PartialVotingFacet.vote(proposalId, { option: VoteOption.Yes, amount: votingPower.add(1)});

    expect(voteTx).to.be.revertedWithCustomError(PartialVotingFacet, "VoteCastForbidden");
  });
});