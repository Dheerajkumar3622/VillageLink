/**
 * Fleet Management API Routes
 * 
 * Backend endpoints for:
 * - Vehicle CRUD operations
 * - Crew management
 * - Digital rostering
 * - Compliance tracking
 * - Analytics
 */

import express from 'express';
import {
    User
} from '../models.js';

const router = express.Router();

// --- IN-MEMORY STORAGE (Replace with MongoDB in production) ---

let fleetVehicles = [
    {
        id: 'v1',
        registrationNumber: 'KA-01-AB-1234',
        type: 'BUS',
        capacity: 40,
        permitType: 'STAGE_CARRIAGE',
        permitNumber: 'SC-2024-001',
        permitExpiry: Date.now() + 90 * 24 * 60 * 60 * 1000,
        insuranceExpiry: Date.now() + 180 * 24 * 60 * 60 * 1000,
        fitnessExpiry: Date.now() + 120 * 24 * 60 * 60 * 1000,
        pucExpiry: Date.now() + 60 * 24 * 60 * 60 * 1000,
        lastServiceDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
        nextServiceDue: Date.now() + 60 * 24 * 60 * 60 * 1000,
        status: 'ACTIVE',
        todayKm: 145,
        todayTrips: 8,
        todayRevenue: 4500,
        operatorId: 'op1'
    },
    {
        id: 'v2',
        registrationNumber: 'KA-01-CD-5678',
        type: 'MINI_BUS',
        capacity: 20,
        permitType: 'STAGE_CARRIAGE',
        permitNumber: 'SC-2024-002',
        permitExpiry: Date.now() + 15 * 24 * 60 * 60 * 1000,
        insuranceExpiry: Date.now() + 200 * 24 * 60 * 60 * 1000,
        fitnessExpiry: Date.now() + 150 * 24 * 60 * 60 * 1000,
        pucExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
        lastServiceDate: Date.now() - 45 * 24 * 60 * 60 * 1000,
        nextServiceDue: Date.now() + 45 * 24 * 60 * 60 * 1000,
        status: 'ACTIVE',
        todayKm: 98,
        todayTrips: 6,
        todayRevenue: 2800,
        operatorId: 'op1'
    }
];

let crewMembers = [
    {
        id: 'crew1',
        name: 'Ramesh Kumar',
        phone: '9876543210',
        role: 'DRIVER',
        licenseNumber: 'KA-DL-2020-001234',
        licenseExpiry: Date.now() + 365 * 24 * 60 * 60 * 1000,
        shiftPreference: 'MORNING',
        weeklyHours: 32,
        maxWeeklyHours: 48,
        isOnDuty: true,
        rating: 4.5,
        totalTrips: 1250,
        operatorId: 'op1'
    },
    {
        id: 'crew2',
        name: 'Suresh Patil',
        phone: '9876543211',
        role: 'DRIVER',
        licenseNumber: 'KA-DL-2019-005678',
        licenseExpiry: Date.now() + 200 * 24 * 60 * 60 * 1000,
        shiftPreference: 'AFTERNOON',
        weeklyHours: 28,
        maxWeeklyHours: 48,
        isOnDuty: false,
        rating: 4.2,
        totalTrips: 980,
        operatorId: 'op1'
    },
    {
        id: 'crew3',
        name: 'Venkatesh R',
        phone: '9876543212',
        role: 'CONDUCTOR',
        shiftPreference: 'MORNING',
        weeklyHours: 36,
        maxWeeklyHours: 48,
        isOnDuty: true,
        rating: 4.7,
        totalTrips: 1100,
        operatorId: 'op1'
    }
];

let rosters = {};

// --- VEHICLE ROUTES ---

// Get all vehicles
router.get('/vehicles', (req, res) => {
    const operatorId = req.user?.id || 'op1';
    const vehicles = fleetVehicles.filter(v => v.operatorId === operatorId);
    res.json(vehicles);
});

// Get single vehicle
router.get('/vehicles/:id', (req, res) => {
    const vehicle = fleetVehicles.find(v => v.id === req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
});

// Add vehicle
router.post('/vehicles', (req, res) => {
    const vehicle = {
        ...req.body,
        id: `v${Date.now()}`,
        operatorId: req.user?.id || 'op1',
        todayKm: 0,
        todayTrips: 0,
        todayRevenue: 0
    };
    fleetVehicles.push(vehicle);
    res.json(vehicle);
});

// Update vehicle status
router.put('/vehicles/:id/status', (req, res) => {
    const vehicle = fleetVehicles.find(v => v.id === req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    vehicle.status = req.body.status;
    res.json({ success: true });
});

// Update vehicle
router.put('/vehicles/:id', (req, res) => {
    const idx = fleetVehicles.findIndex(v => v.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Vehicle not found' });
    fleetVehicles[idx] = { ...fleetVehicles[idx], ...req.body };
    res.json(fleetVehicles[idx]);
});

// Delete vehicle
router.delete('/vehicles/:id', (req, res) => {
    fleetVehicles = fleetVehicles.filter(v => v.id !== req.params.id);
    res.json({ success: true });
});

// --- CREW ROUTES ---

// Get all crew
router.get('/crew', (req, res) => {
    const operatorId = req.user?.id || 'op1';
    const crew = crewMembers.filter(c => c.operatorId === operatorId);
    res.json(crew);
});

// Get available crew
router.get('/crew/available', (req, res) => {
    const { date, shift } = req.query;
    // Filter crew not already assigned and matching shift preference
    const available = crewMembers.filter(c =>
        c.shiftPreference === shift || c.shiftPreference === 'ANY'
    );
    res.json(available);
});

// Add crew member
router.post('/crew', (req, res) => {
    const member = {
        ...req.body,
        id: `crew${Date.now()}`,
        operatorId: req.user?.id || 'op1',
        isOnDuty: false,
        rating: 4.0,
        totalTrips: 0,
        weeklyHours: 0
    };
    crewMembers.push(member);
    res.json(member);
});

// Start crew duty
router.post('/crew/:id/start-duty', (req, res) => {
    const member = crewMembers.find(c => c.id === req.params.id);
    if (!member) return res.status(404).json({ error: 'Crew member not found' });
    member.isOnDuty = true;
    member.currentVehicleId = req.body.vehicleId;
    member.dutyStartTime = Date.now();
    res.json({ success: true });
});

// End crew duty
router.post('/crew/:id/end-duty', (req, res) => {
    const member = crewMembers.find(c => c.id === req.params.id);
    if (!member) return res.status(404).json({ error: 'Crew member not found' });

    // Calculate hours
    if (member.dutyStartTime) {
        const hoursWorked = (Date.now() - member.dutyStartTime) / (60 * 60 * 1000);
        member.weeklyHours += hoursWorked;
    }

    member.isOnDuty = false;
    member.currentVehicleId = null;
    member.dutyStartTime = null;
    res.json({ success: true });
});

// --- ROSTER ROUTES ---

// Get roster for date
router.get('/roster/:date', (req, res) => {
    const roster = rosters[req.params.date];
    if (!roster) return res.status(404).json({ error: 'No roster for this date' });
    res.json(roster);
});

// Generate roster
router.post('/roster/generate', (req, res) => {
    const { date } = req.body;
    const operatorId = req.user?.id || 'op1';

    const vehicles = fleetVehicles.filter(v => v.operatorId === operatorId && v.status === 'ACTIVE');
    const drivers = crewMembers.filter(c => c.operatorId === operatorId && c.role === 'DRIVER');
    const conductors = crewMembers.filter(c => c.operatorId === operatorId && c.role === 'CONDUCTOR');

    const roster = {
        date,
        operatorId,
        shifts: vehicles.map((v, idx) => ({
            vehicleId: v.id,
            vehicleNumber: v.registrationNumber,
            morningShift: {
                driver: drivers[idx % drivers.length],
                conductor: conductors[idx % conductors.length]
            },
            afternoonShift: {
                driver: drivers[(idx + 1) % drivers.length],
                conductor: conductors[(idx + 1) % conductors.length]
            }
        }))
    };

    rosters[date] = roster;
    res.json(roster);
});

// Assign crew to shift
router.post('/roster/assign', (req, res) => {
    const { vehicleId, date, shiftType, driverId, conductorId } = req.body;

    if (!rosters[date]) {
        rosters[date] = { date, shifts: [] };
    }

    let shift = rosters[date].shifts.find(s => s.vehicleId === vehicleId);
    if (!shift) {
        const vehicle = fleetVehicles.find(v => v.id === vehicleId);
        shift = { vehicleId, vehicleNumber: vehicle?.registrationNumber };
        rosters[date].shifts.push(shift);
    }

    const driver = crewMembers.find(c => c.id === driverId);
    const conductor = conductorId ? crewMembers.find(c => c.id === conductorId) : null;

    shift[`${shiftType.toLowerCase()}Shift`] = { driver, conductor };

    res.json({ success: true });
});

// --- COMPLIANCE ROUTES ---

// Get compliance status
router.get('/compliance', (req, res) => {
    const operatorId = req.user?.id || 'op1';
    const vehicles = fleetVehicles.filter(v => v.operatorId === operatorId);
    const now = Date.now();

    const compliance = vehicles.map(v => {
        const issues = [];

        // Check each expiry
        const checks = [
            { field: 'permitExpiry', type: 'PERMIT_EXPIRY', critical: 30 },
            { field: 'insuranceExpiry', type: 'INSURANCE_EXPIRY', critical: 15 },
            { field: 'fitnessExpiry', type: 'FITNESS_EXPIRY', critical: 30 },
            { field: 'pucExpiry', type: 'PUC_EXPIRY', critical: 15 }
        ];

        for (const check of checks) {
            const days = Math.ceil((v[check.field] - now) / (24 * 60 * 60 * 1000));
            if (days <= 0) {
                issues.push({
                    type: check.type,
                    severity: 'CRITICAL',
                    expiryDate: v[check.field],
                    daysRemaining: days,
                    description: `${check.type.replace('_', ' ').toLowerCase()} has expired!`
                });
            } else if (days <= check.critical) {
                issues.push({
                    type: check.type,
                    severity: 'WARNING',
                    expiryDate: v[check.field],
                    daysRemaining: days,
                    description: `${check.type.replace('_', ' ').toLowerCase()} expires in ${days} days`
                });
            }
        }

        // Check service due
        const serviceDays = Math.ceil((v.nextServiceDue - now) / (24 * 60 * 60 * 1000));
        if (serviceDays <= 0) {
            issues.push({
                type: 'SERVICE_DUE',
                severity: 'WARNING',
                expiryDate: v.nextServiceDue,
                daysRemaining: serviceDays,
                description: 'Vehicle service overdue'
            });
        }

        return {
            vehicleId: v.id,
            vehicleNumber: v.registrationNumber,
            issues,
            isCompliant: issues.filter(i => i.severity === 'CRITICAL').length === 0
        };
    });

    res.json(compliance);
});

// --- ANALYTICS ROUTES ---

// Get fleet analytics
router.get('/analytics', (req, res) => {
    const operatorId = req.user?.id || 'op1';
    const vehicles = fleetVehicles.filter(v => v.operatorId === operatorId);
    const crew = crewMembers.filter(c => c.operatorId === operatorId);

    const analytics = {
        totalVehicles: vehicles.length,
        activeVehicles: vehicles.filter(v => v.status === 'ACTIVE').length,
        idleVehicles: vehicles.filter(v => v.status === 'IDLE').length,
        maintenanceVehicles: vehicles.filter(v => v.status === 'MAINTENANCE').length,
        totalCrew: crew.length,
        onDutyCrew: crew.filter(c => c.isOnDuty).length,
        todayRevenue: vehicles.reduce((sum, v) => sum + (v.todayRevenue || 0), 0),
        todayTrips: vehicles.reduce((sum, v) => sum + (v.todayTrips || 0), 0),
        todayKm: vehicles.reduce((sum, v) => sum + (v.todayKm || 0), 0),
        averageOccupancy: 67,
        fuelEfficiency: 4.2,
        complianceScore: 85,
        revenueByVehicle: vehicles.map(v => ({
            vehicleId: v.id,
            vehicleNumber: v.registrationNumber,
            revenue: v.todayRevenue || 0
        }))
    };

    res.json(analytics);
});

// --- DRIVER HERO: ULTIMATE ENDPOINTS ---

// Get demand heatmap for drivers
router.get('/demand-heatmap', (req, res) => {
    // 100x: In production, this would use historic + real-time trip demand data
    // For now, returning realistic high-demand hotspots for the demo
    const hotspots = [
        { name: 'Village Mandi', lat: 28.6139, lng: 77.2090, intensity: 0.9, demandDesc: 'High Harvest Activity' },
        { name: 'Bus Stand Junction', lat: 28.6145, lng: 77.2095, intensity: 0.8, demandDesc: 'Peak Commute Time' },
        { name: 'Rural Health Center', lat: 28.6120, lng: 77.2080, intensity: 0.6, demandDesc: 'Regular Visitors' },
        { name: 'Social Circle Hub', lat: 28.6150, lng: 77.2100, intensity: 0.7, demandDesc: 'Group Delivery Pending' }
    ];
    res.json({ success: true, hotspots });
});

// Get driver hero gamification stats
router.get('/hero-stats/:driverId', async (req, res) => {
    try {
        const user = await User.findOne({ id: req.params.driverId });
        if (!user) return res.status(404).json({ error: 'Driver profile error' });

        res.json({
            heroPoints: user.heroPoints || 1200,
            level: user.heroLevel || 5,
            rank: 'BHOOMI PUTRA',
            achievements: [
                { id: '1', name: 'Safe Pilot', icon: '🛡️', unlocked: true },
                { id: '2', name: 'Mandi Master', icon: '🌾', unlocked: true },
                { id: '3', name: 'Elite Guardian', icon: '👮', unlocked: false }
            ],
            nextLevelExp: 2000,
            currentExp: user.heroPoints || 1200
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Revenue breakdown
router.get('/analytics/revenue', (req, res) => {
    const { start, end } = req.query;
    const operatorId = req.user?.id || 'op1';
    const vehicles = fleetVehicles.filter(v => v.operatorId === operatorId);

    // Return mock data for now
    res.json(vehicles.map(v => ({
        vehicleId: v.id,
        vehicleNumber: v.registrationNumber,
        revenue: v.todayRevenue * 7,
        trips: v.todayTrips * 7
    })));
});

export default router;
