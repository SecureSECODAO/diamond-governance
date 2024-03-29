import { DiamondGovernancePure } from "../../generated/client";
import { ProposalStatus, ProposalSorting, SortingOrder, ProposalMetadata, Action, InterfaceVariables, Variable } from "./sugar/data";
import { ProposalCache } from "./sugar/proposal-cache";
import { Proposal } from "./sugar/proposal";
import { EncodeMetadata } from "./sugar/proposal-metadata";
import { ToAction } from "./sugar/actions";
import { asyncFilter, asyncMap, ToBlockchainDate } from "./utils";
import { ContractReceipt, ContractTransaction } from "ethers";
import { getEvents } from "../../utils/utils";
import variableSelectorsJson from "../../generated/variableSelectors.json";
import { VariableSelectorsJson } from "../../utils/jsonTypes";
import { MarketMaker, SimpleHatch } from "../../typechain-types";
import { GetTypedContractAt } from "../../utils/contractHelper";

export * from "./sugar/data"; 
export * from "./sugar/proposal";

/// Wrapped methods that makes interacting with certain components of the Diamond Governacne smart contracts easier.

export class DiamondGovernanceSugar { 
    private pure: DiamondGovernancePure;
    private proposalCache: ProposalCache | undefined;

    constructor(_pure : DiamondGovernancePure) {
        this.pure = _pure;
    }

    public async GetVerificationContractAddress() : Promise<string> {
        const IVerificationFacet = await this.pure.IVerificationFacet();
        return IVerificationFacet.getVerificationContractAddress();
    }

    public async GetABCHatcher() : Promise<SimpleHatch> {
        const IABCConfigureFacet = await this.pure.IABCConfigureFacet();
        return GetTypedContractAt<SimpleHatch>("SimpleHatch", await IABCConfigureFacet.getHatcher(), this.pure.signer);
    }

    public async GetABCMarketMaker() : Promise<MarketMaker> {
        const IABCConfigureFacet = await this.pure.IABCConfigureFacet();
        return GetTypedContractAt<MarketMaker>("MarketMaker", await IABCConfigureFacet.getMarketMaker(), this.pure.signer);
    }

    /**
     * Fetch all members of the DAO 
     * @returns list of addresses that are members of the DAO
     */
    public async GetMembers() : Promise<string[]> {
        const IMembership = await this.pure.IMembership();
        const IMembershipExtended = await this.pure.IMembershipExtended();

        const possibleMembers = await IMembershipExtended.getMembers();
        return asyncFilter(possibleMembers, async member => await IMembership.isMember(member));
    }

    /**
     * Proposals are cached to reduce the number of calls to the blockchain
     * @returns {Promise<ProposalCache>} ProposalCache object
     */
    private async InitProposalCache() : Promise<ProposalCache> {
        const IProposal = await this.pure.IProposal();
        const IPartialVotingProposalFacet = await this.pure.IPartialVotingProposalFacet();
        const IPartialVotingFacet = await this.pure.IPartialVotingFacet();

        const getProposalCount = async () => (await IProposal.proposalCount()).toNumber();
        const getProposal = async (i : number) => await Proposal.New(this.pure, i, await IPartialVotingProposalFacet.getProposal(i), IPartialVotingProposalFacet, IPartialVotingFacet);

        return new ProposalCache(getProposal, getProposalCount);
    }

    /**
     * Retrieve proposals from the cache, if the cache is not initialized it will be initialized
     */
    private allStatus = [ ProposalStatus.Pending, ProposalStatus.Active, ProposalStatus.Succeeded, ProposalStatus.Executed, ProposalStatus.Defeated ];
    public async GetProposals(
        status : ProposalStatus[] = this.allStatus, 
        sorting : ProposalSorting = ProposalSorting.Creation, 
        order : SortingOrder = SortingOrder.Desc, 
        fromIndex : number = 0, 
        count : number = 10, 
        refreshSorting : boolean = false
    ) : Promise<Proposal[]> {
        if (this.proposalCache == null) {
            this.proposalCache = await this.InitProposalCache();
        }
        return await this.proposalCache.GetProposals(status, sorting, order, fromIndex, count, refreshSorting);
    }

    /**
     * Retrieve a single proposal from the cache, if the cache is not initialized it will be initialized
     * @param id Id of the proposal to retrieve
     * @returns {Promise<Proposal>} Proposal object
     */
    public async GetProposal(id : number, useCache : boolean = true) : Promise<Proposal> {
        if (this.proposalCache == null) {
            this.proposalCache = await this.InitProposalCache();
        }
        return await this.proposalCache.GetProposal(id, useCache);
    }

    /**
     * Retrieve the number of proposals
     * @returns {Promise<number>} Number of proposals
     */
    public async GetProposalCount() : Promise<number> {
        if (this.proposalCache == null) {
            this.proposalCache = await this.InitProposalCache();
        }
        return await this.proposalCache.GetProposalCount()
    }

    /**
     * Retrieve the number of proposals with a certain status filter active
     * @param status The status filter, undefined means no filter and returns GetProposalCount
     * @returns {Promise<number>} Number of proposals
     */
    public async GetFilteredProposalCount(status : ProposalStatus[] | undefined = undefined) : Promise<number> {
        if (this.proposalCache == null) {
            this.proposalCache = await this.InitProposalCache();
        }
        if (status == undefined) return await this.GetProposalCount();
        else return await this.proposalCache.GetFilteredProposalCount(status);
    }

    public async ClearProposalCache() {
        this.proposalCache = await this.InitProposalCache();
    }

    /**
     * Creates a proposal using the IPartialVotingProposalFacet interface/contract
     * @param metadata Proposal metadata object (IPFS related)
     * @param actions List of actions to be executed
     * @param startDate Date the proposal will start
     * @param endDate Date the proposal will end
     */
    public async CreateProposal(metadata : ProposalMetadata, actions : Action[], startDate : Date, endDate : Date) : Promise<ContractTransaction> {
        const IPartialVotingProposalFacet = await this.pure.IPartialVotingProposalFacet();
        return await IPartialVotingProposalFacet.createProposal(
            EncodeMetadata(metadata), 
            await asyncMap(actions, (action : Action) => ToAction(this.pure, this.pure.pluginAddress, action, this.pure.signer)), 
            0, 
            ToBlockchainDate(startDate), 
            ToBlockchainDate(endDate), 
            true
        );
    }

    public async GetProposalId(receipt : ContractReceipt) : Promise<number> {
        const IProposal = await this.pure.IProposal();
        const proposalCreationEvent = getEvents(IProposal, "ProposalCreated", receipt);
        if (proposalCreationEvent.length < 1) {
            throw new Error("Proposal creation event not found");
        }
        const proposalId = proposalCreationEvent[0].args.proposalId;
        return proposalId;
    }

    /**
     * Gets all variables that are gettable in the facets of the Diamond
     * @returns {Promise<InterfaceVariables[]>} The variables in the facets of the Diamond
     */
    public async GetVariables() : Promise<InterfaceVariables[]> {
        let interfaceVariables : { [interfaceName: string] : Variable[] } = { };
        const variableSelectors : VariableSelectorsJson = variableSelectorsJson;
        
        const IDiamondLoupe = await this.pure.IDiamondLoupe();
        const facetSelectors = await IDiamondLoupe.facets();
        for (let i = 0; i < facetSelectors.length; i++) {
            for (let j = 0; j < facetSelectors[i].functionSelectors.length; j++) {
                const functionSelector = facetSelectors[i].functionSelectors[j];
                if (!variableSelectors.hasOwnProperty(functionSelector)) { 
                    // Likely not a get function, or a get function that has not been processed (custom?)
                    continue;
                }

                const variableInfo = variableSelectors[functionSelector];
                if (!interfaceVariables.hasOwnProperty(variableInfo.facetName)) {
                    interfaceVariables[variableInfo.facetName] = [];
                }

                interfaceVariables[variableInfo.facetName].push({
                    variableName: variableInfo.variableName,
                    variableType: variableInfo.variableType,
                    changeable: facetSelectors[i].functionSelectors.includes(variableInfo.setSelector),
                });
            }
        }

        const interfaces = Object.keys(interfaceVariables);
        return interfaces.map(interfaceName => { return { interfaceName: interfaceName, variables: interfaceVariables[interfaceName] }; });
    }
}

