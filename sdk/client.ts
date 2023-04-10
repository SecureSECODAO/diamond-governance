/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */

import { ethers } from "hardhat";
import { Signer } from "@ethersproject/abstract-signer";
import { IERC165, IBurnableGovernanceStructure, IDiamondLoupe, IERC173, IERC20Metadata, IERC20Permit, IERC20, IERC6372, IGovernanceStructure, IMembershipExtended, IMembership, IMintableGovernanceStructure, IPartialVotingFacet, IPartialVotingProposalFacet, IPlugin, ITieredMembershipStructure, IVotes } from "../typechain-types";

enum DiamondGovernanceInterfaces { IERC165, IBurnableGovernanceStructure, IDiamondLoupe, IERC173, IERC20Metadata, IERC20Permit, IERC20, IERC6372, IGovernanceStructure, IMembershipExtended, IMembership, IMintableGovernanceStructure, IPartialVotingFacet, IPartialVotingProposalFacet, IPlugin, ITieredMembershipStructure, IVotes }

export class DiamondGovernanceClient {
    private pluginAddress : string;
    private signer : Signer;
    private cache: { [id: string] : any }

    public constructor(_pluginAddress : string, _signer : Signer) {
        this.pluginAddress = _pluginAddress;
        this.signer = _signer;
        this.cache = { };
        Object.freeze(this);
    }

    public async IERC165() : Promise<IERC165> {
        return await this._get<IERC165>(DiamondGovernanceInterfaces.IERC165, "");
    }
    
    public async IBurnableGovernanceStructure() : Promise<IBurnableGovernanceStructure> {
        return await this._get<IBurnableGovernanceStructure>(DiamondGovernanceInterfaces.IBurnableGovernanceStructure, "0x85d9cf86");
    }

    public async IDiamondLoupe() : Promise<IDiamondLoupe> {
        return await this._get<IDiamondLoupe>(DiamondGovernanceInterfaces.IDiamondLoupe, "0x48e2b093");
    }

    public async IERC173() : Promise<IERC173> {
        return await this._get<IERC173>(DiamondGovernanceInterfaces.IERC173, "0x7f5828d0");
    }

    public async IERC20Metadata() : Promise<IERC20Metadata> {
        return await this._get<IERC20Metadata>(DiamondGovernanceInterfaces.IERC20Metadata, "0xa219a025");
    }

    public async IERC20Permit() : Promise<IERC20Permit> {
        return await this._get<IERC20Permit>(DiamondGovernanceInterfaces.IERC20Permit, "0x9d8ff7da");
    }

    public async IERC20() : Promise<IERC20> {
        return await this._get<IERC20>(DiamondGovernanceInterfaces.IERC20, "0x36372b07");
    }

    public async IERC6372() : Promise<IERC6372> {
        return await this._get<IERC6372>(DiamondGovernanceInterfaces.IERC6372, "0xda287a1d");
    }

    public async IGovernanceStructure() : Promise<IGovernanceStructure> {
        return await this._get<IGovernanceStructure>(DiamondGovernanceInterfaces.IGovernanceStructure, "0x217205e6");
    }

    public async IMembershipExtended() : Promise<IMembershipExtended> {
        return await this._get<IMembershipExtended>(DiamondGovernanceInterfaces.IMembershipExtended, "0x3c9b9777");
    }

    public async IMembership() : Promise<IMembership> {
        return await this._get<IMembership>(DiamondGovernanceInterfaces.IMembership, "0xa230c524");
    }

    public async IMintableGovernanceStructure() : Promise<IMintableGovernanceStructure> {
        return await this._get<IMintableGovernanceStructure>(DiamondGovernanceInterfaces.IMintableGovernanceStructure, "0x03520be9");
    }

    public async IPartialVotingFacet() : Promise<IPartialVotingFacet> {
        return await this._get<IPartialVotingFacet>(DiamondGovernanceInterfaces.IPartialVotingFacet, "0xe7ce0a62");
    }

    public async IPartialVotingProposalFacet() : Promise<IPartialVotingProposalFacet> {
        return await this._get<IPartialVotingProposalFacet>(DiamondGovernanceInterfaces.IPartialVotingProposalFacet, "0xbaf598cd");
    }

    public async IPlugin() : Promise<IPlugin> {
        return await this._get<IPlugin>(DiamondGovernanceInterfaces.IPlugin, "0x41de6830");
    }

    public async ITieredMembershipStructure() : Promise<ITieredMembershipStructure> {
        return await this._get<ITieredMembershipStructure>(DiamondGovernanceInterfaces.ITieredMembershipStructure, "0x88c13925");
    }

    public async IVotes() : Promise<IVotes> {
        return await this._get<IVotes>(DiamondGovernanceInterfaces.IVotes, "0xe90fb3f6");
    }

    private async _get<Type>(_interface : DiamondGovernanceInterfaces, _interfaceId : string) : Promise<Type> {
        if (this.cache.hasOwnProperty(_interface)) {
            return this.cache[_interface] as Type;
        }
        
        const name = DiamondGovernanceInterfaces[_interface];
        const contract = await ethers.getContractAt(name, this.pluginAddress, this.signer) as Type;
        if (_interface !== DiamondGovernanceInterfaces.IERC165) {
            if (_interfaceId === null || _interfaceId === undefined) {
                throw new Error("Invalid interfaceId");
            }
            
            const ierc165 = await this.IERC165();
            const isSupported = await ierc165.supportsInterface(_interfaceId);
            if (!isSupported) {
                throw new Error("Interface not supported by the diamond");
            }
        }
        this.cache[name] = contract;
        return contract;
    }
}