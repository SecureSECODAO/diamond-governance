// Framework
import { ethers } from "hardhat";
import fs from "fs";

// Utils
import { getSelectors, FacetCutAction } from "../utils/diamondHelper";
import { resolveENS } from "../utils/ensHelper";
import { days } from "../utils/timeUnits";
import { toBytes } from "../utils/utils";

// Types
import { Always3, DiamondGovernanceSetup, DiamondInit, DiamondLoupeFacet, ERC20TieredTimeClaimableFacet, GovernanceERC20BurnableFacet, GovernanceERC20DisabledFacet, PartialBurnVotingFacet, PartialBurnVotingProposalFacet, PluginRepoFactory, PublicResolver, VerificationFacet } from "../typechain-types";

// Other
import { deployLibraries } from "./deploy_Libraries";

interface DiamondDeployedContracts {
  DiamondGovernanceSetup: DiamondGovernanceSetup;
  DiamondInit: DiamondInit;
  Facets: {
    DiamondLoupe: DiamondLoupeFacet;
    PartialBurnVotingProposal: PartialBurnVotingProposalFacet;
    PartialBurnVoting: PartialBurnVotingFacet;
    GovernanceERC20Disabled: GovernanceERC20DisabledFacet;
    GovernanceERC20Burnable: GovernanceERC20BurnableFacet;
    ERC20TieredTimeClaimable: ERC20TieredTimeClaimableFacet;
    Always3: Always3; // TEMP MOCK for verifiction
    Verification: VerificationFacet;
  }
}

/**
 * Deploys the PartialTokenBurnVotingSetup contract and registers it with the pluginRepoFactory
 * @param pluginRepoFactory The PluginRepoFactory to register with
 * @param pluginResolver The ENS resolver to get the plugin contract from afterwards
 * @returns The PluginSettings for installation in a DAO
 */
async function createDiamondGovernanceRepo(pluginRepoFactory : PluginRepoFactory, pluginResolver : PublicResolver, verificationContractAddress: string) {
  const buildMetadata = fs.readFileSync("./contracts/build-metadata.json", "utf8");
  const releaseMetadata = fs.readFileSync("./contracts/release-metadata.json", "utf8");
  const diamondGovernanceContracts = await deployDiamondGovernance();
  const [owner] = await ethers.getSigners();

  await pluginRepoFactory.createPluginRepoWithFirstVersion(
    "my-plugin",
    diamondGovernanceContracts.DiamondGovernanceSetup.address,
    owner.address,
    toBytes("https://plopmenz.com/buildMetadata"),
    toBytes("https://plopmenz.com/releaseMetadata")
  );
  const PluginRepoAddress = await resolveENS(pluginResolver, "plugin", "my-plugin");

  const ERC20Disabled = [
    "transfer(address, uint256)", 
    "approve(address, uint256)", 
    "transferFrom(address, address, uint256)", 
    "increaseAllowance(address, uint256)", 
    "decreaseAllowance(address, uint256)", 
    "permit(address, address, uint256, uint256, uint8, bytes32, bytes32)", 
    "delegate(address)", 
    "delegateBySig(address, uint256, uint256, uint8, bytes32, bytes32)"
  ];
  let cut = [];
  cut.push({
    facetAddress: diamondGovernanceContracts.Facets.DiamondLoupe.address,
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(diamondGovernanceContracts.Facets.DiamondLoupe)
  });
  cut.push({
    facetAddress: diamondGovernanceContracts.Facets.PartialBurnVotingProposal.address,
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(diamondGovernanceContracts.Facets.PartialBurnVotingProposal)
  });
  cut.push({
    facetAddress: diamondGovernanceContracts.Facets.PartialBurnVoting.address,
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(diamondGovernanceContracts.Facets.PartialBurnVoting)
  });
  cut.push({
    facetAddress: diamondGovernanceContracts.Facets.GovernanceERC20Disabled.address,
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(diamondGovernanceContracts.Facets.GovernanceERC20Disabled).get(ERC20Disabled)
  });
  cut.push({
    facetAddress: diamondGovernanceContracts.Facets.GovernanceERC20Burnable.address,
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(diamondGovernanceContracts.Facets.GovernanceERC20Burnable).remove(ERC20Disabled)
  });
  cut.push({
    facetAddress: diamondGovernanceContracts.Facets.ERC20TieredTimeClaimable.address,
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(diamondGovernanceContracts.Facets.ERC20TieredTimeClaimable).get(["tokensClaimable(address)", "claim()"])
  });
  cut.push({
    facetAddress: diamondGovernanceContracts.Facets.Always3.address,
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(diamondGovernanceContracts.Facets.Always3)
  });
  cut.push({
    facetAddress: diamondGovernanceContracts.Facets.Verification.address,
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(diamondGovernanceContracts.Facets.Verification).get(["getStampsAt(address, uint)"])
  });

  const verficationSettings = {
    verificationContractAddress: ethers.constants.AddressZero //address
  };
  enum VotingMode { SingleVote, SinglePartialVote, MultiplePartialVote };
  const votingSettings = {
    votingSettings: {
      votingMode: VotingMode.MultiplePartialVote, //IPartialVotingFacet.VotingMode 
      supportThreshold: 1, //uint32
      minParticipation: 1, //uint32
      minDuration: 1, //uint64
      minProposerVotingPower: 1, //uint256
    }
  };
  const claimSettings = {
    tiers: [1, 2, 3], //uint256[]
    rewards: [50, 100, 1], //uint256[]
    timeClaimableInit: {
      timeTillReward: 1 * days, //uint256
      maxTimeRewarded: 10 * days //uint256
    }
  };
  const constructionArgs = {
    _diamondCut: cut,
    _init: diamondGovernanceContracts.DiamondInit.address,
    _calldata: diamondGovernanceContracts.DiamondInit.interface.encodeFunctionData("init", [verficationSettings, votingSettings, claimSettings])
  };
  const constructionFormat = JSON.parse(buildMetadata).pluginSetupABI.prepareInstallation;
  const pluginConstructionBytes = ethers.utils.defaultAbiCoder.encode(
    constructionFormat,
    [constructionArgs._diamondCut, constructionArgs._init, constructionArgs._calldata]
  );

  const tag = {
      release: 1, //uint8
      build: 1 //uint16
  };
  
  const pluginSetupRef = {
      versionTag: tag, //PluginRepo.Tag
      pluginSetupRepo: PluginRepoAddress //PluginRepo
  };
  
  const diamondGovernancePluginSettings = {
      pluginSetupRef: pluginSetupRef, //PluginSetupRef
      data: pluginConstructionBytes //bytes
  };

  return { diamondGovernancePluginSettings, diamondGovernanceContracts };
}

async function deployDiamondGovernance() : Promise<DiamondDeployedContracts> {
  const DiamondGovernanceSetupContract = await ethers.getContractFactory("DiamondGovernanceSetup");
  const DiamondGovernanceSetup = await DiamondGovernanceSetupContract.deploy();
  console.log(`DiamondGovernanceSetup deployed at ${DiamondGovernanceSetup.address}`);
  // Deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  const libraries = await deployLibraries();
  const DiamondInitContract = await ethers.getContractFactory('DiamondInit', { 
    libraries: {
      VerificationFacetInit: libraries.VerificationFacetInit,
      PartialVotingProposalFacetInit: libraries.PartialVotingProposalFacetInit,
      ERC20TieredTimeClaimableFacetInit: libraries.ERC20TieredTimeClaimableFacetInit
    }
  });
  const DiamondInit = await DiamondInitContract.deploy();
  console.log(`DiamondInit deployed at ${DiamondInit.address}`);

  // Facets
  const DiamondLoupeFacetContract = await ethers.getContractFactory("DiamondLoupeFacet");
  const DiamondLoupeFacet = await DiamondLoupeFacetContract.deploy();
  console.log(`DiamondLoupeFacet deployed at ${DiamondLoupeFacet.address}`);

  const PartialBurnVotingProposalFacetContract = await ethers.getContractFactory("PartialBurnVotingProposalFacet");
  const PartialBurnVotingProposalFacet = await PartialBurnVotingProposalFacetContract.deploy();
  console.log(`PartialBurnVotingProposalFacet deployed at ${PartialBurnVotingProposalFacet.address}`);

  const PartialBurnVotingFacetContract = await ethers.getContractFactory("PartialBurnVotingFacet");
  const PartialBurnVotingFacet = await PartialBurnVotingFacetContract.deploy();
  console.log(`PartialBurnVotingFacet deployed at ${PartialBurnVotingFacet.address}`);

  const tokenName = "my-token";
  const tokenSymbol = "TOK";

  const GovernanceERC20DisabledFacetContract = await ethers.getContractFactory("GovernanceERC20DisabledFacet");
  const GovernanceERC20DisabledFacet = await GovernanceERC20DisabledFacetContract.deploy(tokenName, tokenSymbol);
  console.log(`GovernanceERC20DisabledFacet deployed at ${GovernanceERC20DisabledFacet.address}`);

  const GovernanceERC20BurnableFacetContract = await ethers.getContractFactory("GovernanceERC20BurnableFacet");
  const GovernanceERC20BurnableFacet = await GovernanceERC20BurnableFacetContract.deploy(tokenName, tokenSymbol);
  console.log(`GovernanceERC20BurnableFacet deployed at ${GovernanceERC20BurnableFacet.address}`);

  const ERC20TieredTimeClaimableFacetContract = await ethers.getContractFactory("ERC20TieredTimeClaimableFacet");
  const ERC20TieredTimeClaimableFacet = await ERC20TieredTimeClaimableFacetContract.deploy();
  console.log(`ERC20TieredTimeClaimableFacet deployed at ${ERC20TieredTimeClaimableFacet.address}`);
  
  const Always3Contract = await ethers.getContractFactory("Always3");
  const Always3 = await Always3Contract.deploy();
  console.log(`Always3 deployed at ${Always3.address}`);
  
  const VerificationContract = await ethers.getContractFactory("VerificationFacet");
  const VerificationFacet = await VerificationContract.deploy();
  console.log(`VerificationFacet deployed at ${VerificationFacet.address}`);
  
  return {
    DiamondGovernanceSetup: DiamondGovernanceSetup,
    DiamondInit: DiamondInit,
    Facets: {
      DiamondLoupe: DiamondLoupeFacet,
      PartialBurnVotingProposal: PartialBurnVotingProposalFacet,
      PartialBurnVoting: PartialBurnVotingFacet,
      GovernanceERC20Disabled: GovernanceERC20DisabledFacet,
      GovernanceERC20Burnable: GovernanceERC20BurnableFacet,
      ERC20TieredTimeClaimable: ERC20TieredTimeClaimableFacet,
      Always3: Always3,
      Verification: VerificationFacet,
    }
  };
}

export { deployDiamondGovernance, createDiamondGovernanceRepo }