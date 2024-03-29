/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */

import { IDAO, IPartialVotingFacet, IPartialVotingProposalFacet } from "../../../typechain-types";
import { BigNumber } from 'ethers';

/// File that defines all the types of the SDK, so these can be exported in the package.

export { IDAO };
export enum VoteOption { Abstain, Yes, No }
export enum ProposalStatus { Pending = 1, Active = 2, Succeeded = 4, Executed = 8, Defeated = 16 }
export enum ProposalSorting { Creation, Title, TotalVotes }
export enum SortingOrder { Asc, Desc }

export interface ProposalData {
    open: boolean;
    executed: BigNumber;
    parameters: IPartialVotingProposalFacet.ProposalParametersStructOutput;
    tally: IPartialVotingProposalFacet.TallyStructOutput;
    actions: IDAO.ActionStructOutput[];
    allowFailureMap: BigNumber;
    metadata: string;
    creator: string;
    voterList: string[];
    executor: string;
}

export interface ProposalResource {
  name : string;
  url : string;
}

export interface ProposalMetadata {
  title : string;
  description : string;
  body : string;
  resources: ProposalResource[];
}

export interface Action {
  interface: string;
  method: string;
  params: { [name: string]: any };
}

export type Stamp = [id: string, userHash: string, verifiedAt: BigNumber[]];
export type VerificationThreshold = [timestamp: BigNumber, threshold: BigNumber];

export interface AddressVotes {
  address: string;
  votes: IPartialVotingFacet.PartialVoteStructOutput[];
}

export interface InterfaceVariables {
  interfaceName: string;
  variables: Variable[];
};

export interface Variable {
  variableName: string;
  variableType: string;
  changeable: boolean;
}