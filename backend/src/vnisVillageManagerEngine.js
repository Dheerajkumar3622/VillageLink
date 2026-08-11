import { VNISHubModel, VNISParcelModel } from "../models/vnisModels.js";
var ChainOfCustodyStatus = /* @__PURE__ */ ((ChainOfCustodyStatus2) => {
  ChainOfCustodyStatus2["STAGED_AT_ORIGIN_HUB"] = "STAGED_AT_ORIGIN_HUB";
  ChainOfCustodyStatus2["IN_TRANSIT_WITH_DRIVER"] = "IN_TRANSIT_WITH_DRIVER";
  ChainOfCustodyStatus2["STAGED_AT_DESTINATION_HUB"] = "STAGED_AT_DESTINATION_HUB";
  ChainOfCustodyStatus2["DELIVERED_TO_RECIPIENT"] = "DELIVERED_TO_RECIPIENT";
  return ChainOfCustodyStatus2;
})(ChainOfCustodyStatus || {});
var ManagerReputationTier = /* @__PURE__ */ ((ManagerReputationTier2) => {
  ManagerReputationTier2["BRONZE"] = "BRONZE";
  ManagerReputationTier2["SILVER"] = "SILVER";
  ManagerReputationTier2["GOLD"] = "GOLD";
  return ManagerReputationTier2;
})(ManagerReputationTier || {});
class VNISVillageManagerEngine {
  /**
   * Retrieves or creates a Village Manager Hub directly from MongoDB Atlas
   */
  static async getOrCreateHub(nodeId, nodeName, managerName = "Ramesh Kumar (Gram Sanchalak)", managerPhone = "+91 9801612025") {
    const hubId = `HUB_${nodeId}`;
    let hubDoc = await VNISHubModel.findOne({ hubId }).lean();
    if (!hubDoc) {
      hubDoc = await VNISHubModel.create({
        hubId,
        nodeId,
        nodeName,
        managerName,
        managerPhone,
        kioskShopName: `${managerName.split(" ")[0]} Kirana & VNIS Hub`,
        hubQrCode: `QR_HUB_${nodeId}`,
        reputationTier: "BRONZE",
        commissionPercentage: 10,
        totalHandoversCompleted: 42,
        walletBalanceRupees: 850,
        activeLockerCompartmentsCount: 8,
        hasWaitingLoungeShade: true,
        hasDrinkingWater: true
      });
    }
    return hubDoc;
  }
  /**
   * Step 1: Sender stages parcel at Origin Hub (Persists in MongoDB Atlas)
   */
  static async stageParcelAtOriginHub(originNodeId, originNodeName, destinationNodeName, senderName, senderPhone, recipientName, recipientPhone, weightKg, totalFareRupees) {
    const hub = await this.getOrCreateHub(originNodeId, originNodeName);
    const parcelId = `PCL_${Date.now().toString().slice(-6)}`;
    const verificationOtp = Math.floor(1e3 + Math.random() * 9e3).toString();
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
      currentStatus: "STAGED_AT_ORIGIN_HUB" /* STAGED_AT_ORIGIN_HUB */,
      custodyLedger: [
        {
          status: "STAGED_AT_ORIGIN_HUB" /* STAGED_AT_ORIGIN_HUB */,
          timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          locationNodeName: originNodeName,
          actorName: senderName,
          actorPhone: senderPhone,
          note: `Parcel staged at ${hub.kioskShopName} by sender.`
        }
      ]
    });
    return parcelDoc.toObject();
  }
  /**
   * Step 2: Driver QR Scan Handshake at Hub (Persists status & updates Wallet in MongoDB Atlas)
   */
  static async handoverParcelToDriver(originNodeId, driverId, driverName, driverPhone, parcelId) {
    const hub = await this.getOrCreateHub(originNodeId, "Junction Node");
    const parcelDoc = await VNISParcelModel.findOne({ parcelId });
    if (!parcelDoc) {
      throw new Error(`Parcel ID ${parcelId} not found in MongoDB database`);
    }
    parcelDoc.currentStatus = "IN_TRANSIT_WITH_DRIVER" /* IN_TRANSIT_WITH_DRIVER */;
    parcelDoc.custodyLedger.push({
      status: "IN_TRANSIT_WITH_DRIVER" /* IN_TRANSIT_WITH_DRIVER */,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
      locationNodeName: hub.nodeName,
      actorName: driverName,
      actorPhone: driverPhone,
      note: `Driver scanned Hub QR code and picked up parcel from locker.`
    });
    await parcelDoc.save();
    const newWalletBalance = hub.walletBalanceRupees + parcelDoc.villageManagerCommissionRupees;
    const newTotalHandovers = hub.totalHandoversCompleted + 1;
    let newTier = hub.reputationTier;
    let newCommission = hub.commissionPercentage;
    if (newTotalHandovers >= 200) {
      newTier = "GOLD" /* GOLD */;
      newCommission = 12;
    } else if (newTotalHandovers >= 50) {
      newTier = "SILVER" /* SILVER */;
      newCommission = 11;
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
      parcel: parcelDoc.toObject(),
      updatedWalletBalance: newWalletBalance
    };
  }
  /**
   * Step 3: Driver drops parcel at Destination Hub (Updates MongoDB Atlas)
   */
  static async receiveParcelAtDestinationHub(destinationNodeId, destinationNodeName, driverId, driverName, parcelId) {
    const parcelDoc = await VNISParcelModel.findOne({ parcelId });
    if (!parcelDoc) throw new Error(`Parcel ID ${parcelId} not found`);
    const hub = await this.getOrCreateHub(destinationNodeId, destinationNodeName);
    parcelDoc.currentStatus = "STAGED_AT_DESTINATION_HUB" /* STAGED_AT_DESTINATION_HUB */;
    parcelDoc.custodyLedger.push({
      status: "STAGED_AT_DESTINATION_HUB" /* STAGED_AT_DESTINATION_HUB */,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
      locationNodeName: destinationNodeName,
      actorName: driverName,
      actorPhone: "",
      note: `Driver safely dropped parcel at ${hub.kioskShopName}.`
    });
    await parcelDoc.save();
    return parcelDoc.toObject();
  }
  /**
   * Step 4: Recipient collects parcel using OTP (Updates MongoDB Atlas)
   */
  static async deliverParcelToRecipient(parcelId, recipientEnteredOtp) {
    const parcelDoc = await VNISParcelModel.findOne({ parcelId });
    if (!parcelDoc) throw new Error(`Parcel ID ${parcelId} not found`);
    if (parcelDoc.verificationOtp !== recipientEnteredOtp) {
      throw new Error(`Invalid Verification OTP! Entered: ${recipientEnteredOtp}, Expected: ${parcelDoc.verificationOtp}`);
    }
    parcelDoc.currentStatus = "DELIVERED_TO_RECIPIENT" /* DELIVERED_TO_RECIPIENT */;
    parcelDoc.custodyLedger.push({
      status: "DELIVERED_TO_RECIPIENT" /* DELIVERED_TO_RECIPIENT */,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
      locationNodeName: parcelDoc.destinationNodeName,
      actorName: parcelDoc.recipientName,
      actorPhone: parcelDoc.recipientPhone,
      note: `Recipient verified OTP ${recipientEnteredOtp} and collected parcel.`
    });
    await parcelDoc.save();
    return { success: true, parcel: parcelDoc.toObject() };
  }
}
export {
  ChainOfCustodyStatus,
  ManagerReputationTier,
  VNISVillageManagerEngine
};
