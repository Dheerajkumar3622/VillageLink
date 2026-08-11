/**
 * Village Node Intelligence System (VNIS) - Layer 6: Village Manager Network & Hub Operations Engine
 * 
 * MongoDB Atlas Live Connected Engine:
 * 1. Reads & Writes Hub details and wallet balances directly to MongoDB Atlas (`VNISHubModel`).
 * 2. Reads & Writes Staged Parcels and Chain of Custody directly to MongoDB Atlas (`VNISParcelModel`).
 * 3. Instant 10% Wallet Payouts persist permanently in MongoDB.
 */

import { VNISHubModel, VNISParcelModel } from '../models/vnisModels.js';

export enum ChainOfCustodyStatus {
  STAGED_AT_ORIGIN_HUB = 'STAGED_AT_ORIGIN_HUB',
  IN_TRANSIT_WITH_DRIVER = 'IN_TRANSIT_WITH_DRIVER',
  STAGED_AT_DESTINATION_HUB = 'STAGED_AT_DESTINATION_HUB',
  DELIVERED_TO_RECIPIENT = 'DELIVERED_TO_RECIPIENT'
}

export enum ManagerReputationTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD'
}

export interface IVNISVillageManagerHub {
  hubId: string;
  nodeId: string;
  nodeName: string;
  managerName: string;
  managerPhone: string;
  kioskShopName: string;
  hubQrCode: string;
  reputationTier: ManagerReputationTier;
  commissionPercentage: number;
  totalHandoversCompleted: number;
  walletBalanceRupees: number;
  activeLockerCompartmentsCount: number;
  hasWaitingLoungeShade: boolean;
  hasDrinkingWater: boolean;
}

export interface ICustodyEvent {
  status: ChainOfCustodyStatus;
  timestamp: string;
  locationNodeName: string;
  actorName: string;
  actorPhone: string;
  note: string;
}

export interface IStagedParcelRecord {
  parcelId: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  originNodeName: string;
  destinationNodeName: string;
  weightKg: number;
  calculatedFareRupees: number;
  villageManagerCommissionRupees: number;
  verificationOtp: string;
  currentStatus: ChainOfCustodyStatus;
  custodyLedger: ICustodyEvent[];
}

export class VNISVillageManagerEngine {
  /**
   * Retrieves or creates a Village Manager Hub directly from MongoDB Atlas
   */
  public static async getOrCreateHub(nodeId: string, nodeName: string, managerName: string = 'Ramesh Kumar (Gram Sanchalak)', managerPhone: string = '+91 9801612025'): Promise<IVNISVillageManagerHub> {
    const hubId = `HUB_${nodeId}`;
    let hubDoc = await VNISHubModel.findOne({ hubId }).lean();

    if (!hubDoc) {
      hubDoc = await VNISHubModel.create({
        hubId,
        nodeId,
        nodeName,
        managerName,
        managerPhone,
        kioskShopName: `${managerName.split(' ')[0]} Kirana & VNIS Hub`,
        hubQrCode: `QR_HUB_${nodeId}`,
        reputationTier: 'BRONZE',
        commissionPercentage: 10.0,
        totalHandoversCompleted: 42,
        walletBalanceRupees: 850.00,
        activeLockerCompartmentsCount: 8,
        hasWaitingLoungeShade: true,
        hasDrinkingWater: true
      });
    }

    return hubDoc as any;
  }

  /**
   * Step 1: Sender stages parcel at Origin Hub (Persists in MongoDB Atlas)
   */
  public static async stageParcelAtOriginHub(
    originNodeId: string,
    originNodeName: string,
    destinationNodeName: string,
    senderName: string,
    senderPhone: string,
    recipientName: string,
    recipientPhone: string,
    weightKg: number,
    totalFareRupees: number
  ): Promise<IStagedParcelRecord> {
    const hub = await this.getOrCreateHub(originNodeId, originNodeName);
    const parcelId = `PCL_${Date.now().toString().slice(-6)}`;
    const verificationOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const vmCommission = Math.round(totalFareRupees * (hub.commissionPercentage / 100));

    const parcelDoc = await VNISParcelModel.create({
      parcelId,
      senderName,
      senderPhone,
      recipientName,
      recipientPhone,
      originNodeName,
      destinationNodeName,
      weightKg,
      calculatedFareRupees: totalFareRupees,
      villageManagerCommissionRupees: vmCommission,
      verificationOtp,
      currentStatus: ChainOfCustodyStatus.STAGED_AT_ORIGIN_HUB,
      custodyLedger: [
        {
          status: ChainOfCustodyStatus.STAGED_AT_ORIGIN_HUB,
          timestamp: new Date().toLocaleTimeString(),
          locationNodeName: originNodeName,
          actorName: senderName,
          actorPhone: senderPhone,
          note: `Parcel staged at ${hub.kioskShopName} by sender.`
        }
      ]
    });

    return parcelDoc.toObject() as any;
  }

  /**
   * Step 2: Driver QR Scan Handshake at Hub (Persists status & updates Wallet in MongoDB Atlas)
   */
  public static async handoverParcelToDriver(
    originNodeId: string,
    driverId: string,
    driverName: string,
    driverPhone: string,
    parcelId: string
  ): Promise<{ success: boolean; parcel: IStagedParcelRecord; updatedWalletBalance: number }> {
    const hub = await this.getOrCreateHub(originNodeId, 'Junction Node');
    const parcelDoc = await VNISParcelModel.findOne({ parcelId });

    if (!parcelDoc) {
      throw new Error(`Parcel ID ${parcelId} not found in MongoDB database`);
    }

    // Update Custody Ledger in MongoDB
    parcelDoc.currentStatus = ChainOfCustodyStatus.IN_TRANSIT_WITH_DRIVER as any;
    parcelDoc.custodyLedger.push({
      status: ChainOfCustodyStatus.IN_TRANSIT_WITH_DRIVER,
      timestamp: new Date().toLocaleTimeString(),
      locationNodeName: hub.nodeName,
      actorName: driverName,
      actorPhone: driverPhone,
      note: `Driver scanned Hub QR code and picked up parcel from locker.`
    });
    await parcelDoc.save();

    // Update Wallet Balance permanently in MongoDB
    const newWalletBalance = hub.walletBalanceRupees + parcelDoc.villageManagerCommissionRupees;
    const newTotalHandovers = hub.totalHandoversCompleted + 1;
    let newTier = hub.reputationTier;
    let newCommission = hub.commissionPercentage;

    if (newTotalHandovers >= 200) {
      newTier = ManagerReputationTier.GOLD;
      newCommission = 12.0;
    } else if (newTotalHandovers >= 50) {
      newTier = ManagerReputationTier.SILVER;
      newCommission = 11.0;
    }

    await VNISHubModel.updateOne(
      { hubId: hub.hubId },
      { 
        $set: { 
          walletBalanceRupees: newWalletBalance,
          totalHandoversCompleted: newTotalHandovers,
          reputationTier: newTier,
          commissionPercentage: newCommission
        } 
      }
    );

    return {
      success: true,
      parcel: parcelDoc.toObject() as any,
      updatedWalletBalance: newWalletBalance
    };
  }

  /**
   * Step 3: Driver drops parcel at Destination Hub (Updates MongoDB Atlas)
   */
  public static async receiveParcelAtDestinationHub(
    destinationNodeId: string,
    destinationNodeName: string,
    driverId: string,
    driverName: string,
    parcelId: string
  ): Promise<IStagedParcelRecord> {
    const parcelDoc = await VNISParcelModel.findOne({ parcelId });
    if (!parcelDoc) throw new Error(`Parcel ID ${parcelId} not found`);

    const hub = await this.getOrCreateHub(destinationNodeId, destinationNodeName);

    parcelDoc.currentStatus = ChainOfCustodyStatus.STAGED_AT_DESTINATION_HUB as any;
    parcelDoc.custodyLedger.push({
      status: ChainOfCustodyStatus.STAGED_AT_DESTINATION_HUB,
      timestamp: new Date().toLocaleTimeString(),
      locationNodeName: destinationNodeName,
      actorName: driverName,
      actorPhone: '',
      note: `Driver safely dropped parcel at ${hub.kioskShopName}.`
    });
    await parcelDoc.save();

    return parcelDoc.toObject() as any;
  }

  /**
   * Step 4: Recipient collects parcel using OTP (Updates MongoDB Atlas)
   */
  public static async deliverParcelToRecipient(
    parcelId: string,
    recipientEnteredOtp: string
  ): Promise<{ success: boolean; parcel: IStagedParcelRecord }> {
    const parcelDoc = await VNISParcelModel.findOne({ parcelId });
    if (!parcelDoc) throw new Error(`Parcel ID ${parcelId} not found`);

    if (parcelDoc.verificationOtp !== recipientEnteredOtp) {
      throw new Error(`Invalid Verification OTP! Entered: ${recipientEnteredOtp}, Expected: ${parcelDoc.verificationOtp}`);
    }

    parcelDoc.currentStatus = ChainOfCustodyStatus.DELIVERED_TO_RECIPIENT as any;
    parcelDoc.custodyLedger.push({
      status: ChainOfCustodyStatus.DELIVERED_TO_RECIPIENT,
      timestamp: new Date().toLocaleTimeString(),
      locationNodeName: parcelDoc.destinationNodeName,
      actorName: parcelDoc.recipientName,
      actorPhone: parcelDoc.recipientPhone,
      note: `Recipient verified OTP ${recipientEnteredOtp} and collected parcel.`
    });
    await parcelDoc.save();

    return { success: true, parcel: parcelDoc.toObject() as any };
  }
}
