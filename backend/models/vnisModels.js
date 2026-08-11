import mongoose from 'mongoose';

/**
 * MongoDB Schema for Village Manager Hub Kiosks
 */
const vnisHubSchema = new mongoose.Schema({
  hubId: { type: String, required: true, unique: true, index: true },
  nodeId: { type: String, required: true, index: true },
  nodeName: { type: String, required: true },
  managerName: { type: String, default: 'Ramesh Kumar (Gram Sanchalak)' },
  managerPhone: { type: String, default: '+91 9801612025' },
  kioskShopName: { type: String },
  hubQrCode: { type: String },
  reputationTier: { type: String, enum: ['BRONZE', 'SILVER', 'GOLD'], default: 'BRONZE' },
  commissionPercentage: { type: Number, default: 10.0 },
  totalHandoversCompleted: { type: Number, default: 0 },
  walletBalanceRupees: { type: Number, default: 850.00 },
  activeLockerCompartmentsCount: { type: Number, default: 8 },
  hasWaitingLoungeShade: { type: Boolean, default: true },
  hasDrinkingWater: { type: Boolean, default: true }
}, { timestamps: true });

/**
 * MongoDB Schema for Staged Parcels and Chain of Custody
 */
const vnisParcelSchema = new mongoose.Schema({
  parcelId: { type: String, required: true, unique: true, index: true },
  senderName: { type: String, required: true },
  senderPhone: { type: String, required: true },
  recipientName: { type: String, required: true },
  recipientPhone: { type: String, required: true },
  originNodeName: { type: String, required: true },
  destinationNodeName: { type: String, required: true },
  weightKg: { type: Number, default: 5 },
  calculatedFareRupees: { type: Number, default: 200 },
  villageManagerCommissionRupees: { type: Number, default: 20 },
  verificationOtp: { type: String, required: true },
  currentStatus: { 
    type: String, 
    enum: ['STAGED_AT_ORIGIN_HUB', 'IN_TRANSIT_WITH_DRIVER', 'STAGED_AT_DESTINATION_HUB', 'DELIVERED_TO_RECIPIENT'],
    default: 'STAGED_AT_ORIGIN_HUB' 
  },
  custodyLedger: [
    {
      status: { type: String },
      timestamp: { type: String },
      locationNodeName: { type: String },
      actorName: { type: String },
      actorPhone: { type: String },
      note: { type: String }
    }
  ]
}, { timestamps: true });

export const VNISHubModel = mongoose.models.VNISHubModel || mongoose.model('VNISHubModel', vnisHubSchema);
export const VNISParcelModel = mongoose.models.VNISParcelModel || mongoose.model('VNISParcelModel', vnisParcelSchema);
