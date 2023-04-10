/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */

// Framework
import { ethers, upgrades  } from "hardhat";

// Utils
import { toEnsNode } from "../utils/ensHelper";

// Types
import { DAO, ENSRegistry } from "../typechain-types";

// Other
import { deployENS, deployResolver } from "./deploy_ENS";


async function setupENS() {
    const ens = await deployENS();
    const [owner] = await ethers.getSigners();

    const daoResolver = await deployResolver(ens, owner.address, "dao");    
    const pluginResolver = await deployResolver(ens, owner.address, "plugin");

    return { ens, daoResolver, pluginResolver };
}

async function grant(dao : DAO, where : any, who : any, permissionId : string) {
    await dao.grant(where.address, who.address, ethers.utils.keccak256(ethers.utils.toUtf8Bytes(permissionId)));
    console.log(`Granted ${permissionId} to ${who.address} at ${where.address}`);
}

async function deployAragonFramework(ens : ENSRegistry) {
    const [owner] = await ethers.getSigners();

    // ManagingDAO: "0x005098056a837c2c4F99C7eCeE976F8D90bdFFF8", https://github.com/aragon/osx/blob/develop/packages/contracts/src/core/dao/DAO.sol
    const DAOContract = await ethers.getContractFactory("DAO");
    const ManagingDAO = await upgrades.deployProxy(
        DAOContract,
        ["0x", owner.address, ethers.constants.AddressZero, '0x'],
        { unsafeAllow: ['constructor'] }
    ) as DAO;
    console.log(`ManagingDAO deployed at ${ManagingDAO.address}`);

    // DAO_ENSSubdomainRegistrar: "0xCe0B4124dea6105bfB85fB4461c4D39f360E9ef3", https://github.com/aragon/osx/blob/develop/packages/contracts/src/framework/utils/ens/ENSSubdomainRegistrar.sol
    const DAO_ENSSubdomainRegistrarContract = await ethers.getContractFactory("ENSSubdomainRegistrar");
    const DAO_ENSSubdomainRegistrar = await upgrades.deployProxy(
        DAO_ENSSubdomainRegistrarContract, 
        [ManagingDAO.address, ens.address, toEnsNode("dao")],
        { unsafeAllow: ['constructor'] }
    );
    console.log(`DAO_ENSSubdomainRegistrar deployed at ${DAO_ENSSubdomainRegistrar.address}`);
    await ens.setApprovalForAll(
        DAO_ENSSubdomainRegistrar.address,
        true
    );

    // Plugin_ENSSubdomainRegistrar: "0x08633901DdF9cD8e2DC3a073594d0A7DaD6f3f57", https://github.com/aragon/osx/blob/develop/packages/contracts/src/framework/utils/ens/ENSSubdomainRegistrar.sol
    const Plugin_ENSSubdomainRegistrarContract = await ethers.getContractFactory("ENSSubdomainRegistrar");
    const Plugin_ENSSubdomainRegistrar = await upgrades.deployProxy(
        Plugin_ENSSubdomainRegistrarContract, 
        [ManagingDAO.address, ens.address, toEnsNode("plugin")],
        { unsafeAllow: ['constructor'] }
    );
    console.log(`Plugin_ENSSubdomainRegistrar deployed at ${Plugin_ENSSubdomainRegistrar.address}`);
    await ens.setApprovalForAll(
        Plugin_ENSSubdomainRegistrar.address,
        true
    );

    // DAORegistry: "0xC24188a73dc09aA7C721f96Ad8857B469C01dC9f", https://github.com/aragon/osx/blob/develop/packages/contracts/src/framework/dao/DAORegistry.sol
    const DAORegistryContract = await ethers.getContractFactory("DAORegistry");
    const DAORegistry = await upgrades.deployProxy(
        DAORegistryContract, 
        [ManagingDAO.address, DAO_ENSSubdomainRegistrar.address],
        { unsafeAllow: ['constructor'] }
    );
    console.log(`DAORegistry deployed at ${DAORegistry.address}`);
    
    // PluginRepoRegistry: "0xddCc39a2a0047Eb47EdF94180452cbaB14d426EF", https://github.com/aragon/osx/blob/develop/packages/contracts/src/framework/plugin/repo/PluginRepoRegistry.sol
    const PluginRepoRegistryContract = await ethers.getContractFactory("PluginRepoRegistry");
    const PluginRepoRegistry = await upgrades.deployProxy(
        PluginRepoRegistryContract, 
        [ManagingDAO.address, Plugin_ENSSubdomainRegistrar.address],
        { unsafeAllow: ['constructor'] }
    );
    console.log(`PluginRepoRegistry deployed at ${PluginRepoRegistry.address}`);

    // PluginRepoFactory: "0x96E54098317631641703404C06A5afAD89da7373", https://github.com/aragon/osx/blob/develop/packages/contracts/src/framework/plugin/repo/PluginRepoFactory.sol
    const PluginRepoFactoryContract = await ethers.getContractFactory("PluginRepoFactory");
    const PluginRepoFactory = await PluginRepoFactoryContract.deploy(PluginRepoRegistry.address);
    console.log(`PluginRepoFactory deployed at ${PluginRepoFactory.address}`);

    // PluginSetupProcessor: "0xE978942c691e43f65c1B7c7F8f1dc8cDF061B13f", https://github.com/aragon/osx/blob/develop/packages/contracts/src/framework/plugin/setup/PluginSetupProcessor.sol
    const PluginSetupProcessorContract = await ethers.getContractFactory("PluginSetupProcessor");
    const PluginSetupProcessor = await PluginSetupProcessorContract.deploy(PluginRepoRegistry.address);
    console.log(`PluginSetupProcessor deployed at ${PluginSetupProcessor.address}`);

    // DAOFactory: "0xA03C2182af8eC460D498108C92E8638a580b94d4", https://github.com/aragon/osx/blob/develop/packages/contracts/src/framework/dao/DAOFactory.sol
    const DAOFactoryContract = await ethers.getContractFactory("DAOFactory");
    const DAOFactory = await DAOFactoryContract.deploy(DAORegistry.address, PluginSetupProcessor.address);
    console.log(`DAOFactory deployed at ${DAOFactory.address}`);

    // Permissions DAO
    const DAO_PERMISSIONS = [
        'ROOT_PERMISSION',
        'UPGRADE_DAO_PERMISSION',
        'SET_SIGNATURE_VALIDATOR_PERMISSION',
        'SET_TRUSTED_FORWARDER_PERMISSION',
        'SET_METADATA_PERMISSION',
        'REGISTER_STANDARD_CALLBACK_PERMISSION',
    ];
    await DAO_PERMISSIONS.forEach(async permission => await grant(ManagingDAO, ManagingDAO, ManagingDAO, permission));

    // Permissions ENS
    await grant(ManagingDAO, DAO_ENSSubdomainRegistrar, DAORegistry, "REGISTER_ENS_SUBDOMAIN_PERMISSION");
    await grant(ManagingDAO, Plugin_ENSSubdomainRegistrar, PluginRepoRegistry, "REGISTER_ENS_SUBDOMAIN_PERMISSION");
    await grant(ManagingDAO, DAO_ENSSubdomainRegistrar, ManagingDAO, "UPGRADE_REGISTRAR_PERMISSION");
    await grant(ManagingDAO, Plugin_ENSSubdomainRegistrar, ManagingDAO, "UPGRADE_REGISTRAR_PERMISSION");

    // Permissions DAO registry
    await grant(ManagingDAO, DAORegistry, DAOFactory, "REGISTER_DAO_PERMISSION");
    await grant(ManagingDAO, DAORegistry, ManagingDAO, "UPGRADE_REGISTRY_PERMISSION");

    // Permissions plugin registry
    await grant(ManagingDAO, PluginRepoRegistry, PluginRepoFactory, "REGISTER_PLUGIN_REPO_PERMISSION");
    await grant(ManagingDAO, PluginRepoRegistry, ManagingDAO, "UPGRADE_REGISTRY_PERMISSION");

    return { 
        ManagingDAO, 
        DAO_ENSSubdomainRegistrar, 
        Plugin_ENSSubdomainRegistrar, 
        DAORegistry, 
        PluginRepoRegistry, 
        PluginRepoFactory, 
        PluginSetupProcessor, 
        DAOFactory 
    };
}

async function deployAragonFrameworkWithEns() {
    const { ens, daoResolver, pluginResolver } = await setupENS();
    const { 
        ManagingDAO, 
        DAO_ENSSubdomainRegistrar, 
        Plugin_ENSSubdomainRegistrar, 
        DAORegistry, 
        PluginRepoRegistry, 
        PluginRepoFactory, 
        PluginSetupProcessor, 
        DAOFactory 
    } = await deployAragonFramework(ens);

    return {
        ens,
        daoResolver,
        pluginResolver,
        ManagingDAO, 
        DAO_ENSSubdomainRegistrar, 
        Plugin_ENSSubdomainRegistrar, 
        DAORegistry, 
        PluginRepoRegistry, 
        PluginRepoFactory, 
        PluginSetupProcessor, 
        DAOFactory 
    };
}

export { deployAragonFramework, deployAragonFrameworkWithEns }