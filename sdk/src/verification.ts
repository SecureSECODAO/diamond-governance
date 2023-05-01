import { ethers } from "hardhat";
import { GithubVerification } from "../../typechain-types";
import { DiamondGovernanceSugar, Stamp, VerificationThreshold } from "./sugar";
import { BigNumber } from "ethers";
import { Signer } from "@ethersproject/abstract-signer";

// List:
// Get threshold history
// Get stamps?
// verify/unverify

export class VerificationSugar {
  private cache: {
    verificationContract?: GithubVerification;
    thresholdHistory?: VerificationThreshold[];
  }
  private sugar: DiamondGovernanceSugar;
  private signer: Signer;
  constructor(sugar: DiamondGovernanceSugar, signer: Signer) {
    this.sugar = sugar;
    this.signer = signer;
    this.cache = {};
    // TODO
    // - Retrieve verification contract address from the plugin
    // - Store verification contract address
    // const verificationContractAddress = sugar.GetVerificationContractAddress();
    // this.verificationContract = await ethers.getContractAt("GithubVerification", verificationContractAddress);
  }

  /**
   * Gets the verification contract address
   * @returns The verification contract address
   */
  private async GetVerificationContractAddress(): Promise<string> {
    return this.sugar.GetVerificationContractAddress();
  }

  /**
   * 
   */
  public async GetStamps(address: string): Promise<Stamp[]> {
    const verificationContract = await this.GetVerificationContract();
    return verificationContract.getStamps(address);
  }

  /**
   * Gets the verification contract object
   * @returns The verification contract object
   */
  public async GetVerificationContract(): Promise<GithubVerification> {
    if (this.cache.verificationContract == null) {
      const verificationContractAddress =
        await this.GetVerificationContractAddress();
      this.cache.verificationContract = (await ethers.getContractAt(
        "GithubVerification",
        verificationContractAddress,
        this.signer
      )) as GithubVerification;
    }
    return this.cache.verificationContract;
  }

  /**
   * Gets the threshold history
   * @returns The threshold history as an array of VerificationThreshold objects
   */
  public async GetThresholdHistory(): Promise<VerificationThreshold[]> {
    if (this.cache.thresholdHistory == null) {
      const verificationContract = await this.GetVerificationContract();
      this.cache.thresholdHistory = await verificationContract.getThresholdHistory();
    }
    return this.cache.thresholdHistory;
  }

  /**
   * Gets expiration info for the given stamp
   * @param stamp The stamp to get expiration info for
   * @returns An object containing expiration info
   */
  public async GetExpiration(stamp: Stamp): Promise<{
    verified: boolean;
    expired: boolean;
    timeLeftUntilExpiration: number | null;
    threshold: BigNumber;
  }> {
    // Retrieve the threshold history, and the threshold for the current timestamp
    const thresholdHistory = await this.GetThresholdHistory();
    const threshold = this.getThresholdForTimestamp(
      Date.now() / 1000,
      thresholdHistory
    );

    const lastVerifiedAt = stamp
      ? stamp[2][stamp[2].length - 1]
      : BigNumber.from(0);

    // Checks conditions that always need to hold
    const preCondition: boolean =
      stamp != null &&
      stamp[2] != null &&
      stamp[2].length > 0 &&
      thresholdHistory != null &&
      thresholdHistory.length > 0 &&
      Date.now() / 1000 > lastVerifiedAt.toNumber();

    const expirationDate = lastVerifiedAt.add(threshold.mul(24 * 60 * 60)).toNumber();

    const verified =
      preCondition &&
      stamp != null &&
      Date.now() / 1000 < expirationDate;

    const expired =
      preCondition &&
      stamp != null &&
      Date.now() / 1000 >
      expirationDate;

    let timeLeftUntilExpiration = null;
    if (verified) {
      timeLeftUntilExpiration =
      expirationDate -
        Date.now() / 1000;
    }

    return {
      verified,
      expired,
      timeLeftUntilExpiration,
      threshold,
    };
  }

  /**
   * Gets the threshold for a given timestamp
   * @param timestamp The timestamp in seconds
   * @param thresholdHistory The threshold history
   * @returns The threshold at the given timestamp
   */
  private getThresholdForTimestamp(
    timestamp: number,
    thresholdHistory: VerificationThreshold[]
  ) {
    let threshold = thresholdHistory.reverse().find((threshold) => {
      return timestamp >= threshold[0].toNumber();
    });

    return threshold ? threshold[1] : BigNumber.from(0);
  }

  /**
   * Verifies the current user
   * @param toVerify The address to verify
   * @param userHash The user hash
   * @param timestamp The timestamp in seconds
   * @param providerId The provider ID (github, proofofhumanity, etc.)
   * @param proofSignature The signature that you receive from the verification back-end
   */
  public async Verify(
    toVerify: string,
    userHash: string,
    timestamp: number,
    providerId: string,
    proofSignature: string
  ): Promise<void> {
    const verificationContract = await this.GetVerificationContract();
    await verificationContract.verifyAddress(
      toVerify,
      userHash,
      timestamp,
      providerId,
      proofSignature
    );
  }

  /**
   * Unverifies the current user
   * @param providerId The provider ID (github, proofofhumanity, etc.)
   */
  public async Unverify(providerId: string): Promise<void> {
    const verificationContract = await this.GetVerificationContract();
    await verificationContract.unverify(providerId);
  }
}
