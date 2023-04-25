/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */

// Framework
import { ethers } from "hardhat";

// Utils
import { toBytes, getEvents } from "../utils/utils";

// Types

// Other
import { deployAragonFrameworkWithEns, AragonOSxFrameworkContracts } from "./deploy_AragonOSxFramework";
import { createDiamondGovernanceRepo } from "./deploy_DiamondGovernance";
import {deployStandaloneVerificationContract} from "./deploy_StandaloneVerificationContract";

/**
 * Deploys both the AragonOSxFramework and the Aragon DAO
 * @returns The newly created DAO
 */
async function deployAragonDAOWithFramework() {
  const { aragonOSxFramework } = await deployAragonFrameworkWithEns();
  return await deployAragonDAO(aragonOSxFramework);
}

/**
 * Creates a new Aragon DAO
 * This DAO has the Plugins: DiamondGovernance
 * @returns The newly created DAO
 */
async function deployAragonDAO(aragonOSxFramework: AragonOSxFrameworkContracts) {
  // Deploy verification contract
  const { address: standaloneVerificationContractAddress } = await deployStandaloneVerificationContract();

  const { diamondGovernancePluginSettings, diamondGovernanceContracts, verificationContractAddress } = 
    await createDiamondGovernanceRepo(aragonOSxFramework.PluginRepoFactory, aragonOSxFramework.PluginRepoRegistry, standaloneVerificationContractAddress);
  const DAOSettings = await GetDaoCreationParams();

  // Create DAO
  const tx = await aragonOSxFramework.DAOFactory.createDao(DAOSettings, [diamondGovernancePluginSettings]);
  const receipt = await tx.wait();
  
  // Retrieve addresses from DAO creation log
  const DAORegistryContract = await ethers.getContractFactory("DAORegistry");
  const DAOAddress = getEvents(DAORegistryContract, "DAORegistered", receipt)[0].args.dao;

  const PluginSetupProcessorContract = await ethers.getContractFactory("PluginSetupProcessor");
  const pluginAddresses = getEvents(PluginSetupProcessorContract, "InstallationApplied", receipt).map((log : any) => log.args.plugin);

  // Retrieve DAO address with ENS
  const DAOConctract = await ethers.getContractFactory("DAO");
  const DAO = await DAOConctract.attach(DAOAddress);

  // Link plugin addresses to Contracts
  const DiamondGovernanceContract = await ethers.getContractFactory("DiamondGovernance");
  const DiamondGovernance = await DiamondGovernanceContract.attach(pluginAddresses[0]);
  return { DAO, DiamondGovernance, diamondGovernanceContracts, verificationContractAddress };
}

/**
 * @returns The parameters/settings needed to create a DAO
 */
async function GetDaoCreationParams() {
  const DAOSettings = {
    trustedForwarder: ethers.constants.AddressZero, //address
    daoURI: "https://plopmenz.com", //string
    subdomain: "my-dao" + Math.round(Math.random() * 100000), //string
    metadata: toBytes("https://plopmenz.com/daoMetadata") //bytes
  };

  return DAOSettings;
}

export { deployAragonDAO, deployAragonDAOWithFramework }