import mongoose from 'mongoose';

// ==================== JOB OPPORTUNITIES ====================
const jobSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    location: { type: String, required: true }, // Village/City name
    wage: { type: String, required: true },     // e.g., "₹300/day"
    contact: { type: String, required: true },
    type: { type: String, enum: ['DAILY', 'CONTRACT', 'SALARIED', 'GIG'], default: 'DAILY' },
    description: { type: String },
    skillsRequired: [{ type: String }],
    postedBy: { type: String, ref: 'User' }, // Optional: link to a user
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

export const JobOpportunity = mongoose.model('JobOpportunity', jobSchema);

// ==================== TRAVEL / PILGRIMAGE PACKAGES ====================
const packageSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    locations: [{ type: String, required: true }],
    price: { type: Number, required: true },
    duration: { type: String, required: true }, // e.g., "2 Days"
    image: { type: String }, // URL or Emoji/Icon
    description: { type: String },
    nextDate: { type: Date },
    includes: [{ type: String }], // e.g., ["Food", "Travel", "Stay"]
    operatorId: { type: String }, // Who is offering this
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

export const PilgrimagePackage = mongoose.model('PilgrimagePackage', packageSchema);
