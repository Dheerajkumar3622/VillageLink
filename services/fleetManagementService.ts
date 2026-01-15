/**
 * Fleet Management Service for UMG
 * 
 * Operator-side features:
 * - Digital rostering (crew scheduling)
 * - Permit compliance tracking
 * - Vehicle health monitoring
 * - Revenue analytics
 */

import { API_BASE_URL } from '../config';
import { getAuthToken } from './authService';

// --- TYPES ---

export interface FleetVehicle {
    id: string;
    registrationNumber: string;
    type: 'BUS' | 'MINI_BUS' | 'AUTO' | 'TAXI';
    capacity: number;
    permitType: 'STAGE_CARRIAGE' | 'CONTRACT_CARRIAGE' | 'PRIVATE';
    permitNumber: string;
    permitExpiry: number;
    insuranceExpiry: number;
    fitnessExpiry: number;
    pucExpiry: number;
    lastServiceDate: number;
    nextServiceDue: number;
    currentDriver?: string;
    currentConductor?: string;
    status: 'ACTIVE' | 'MAINTENANCE' | 'IDLE' | 'BREAKDOWN';
    currentLocation?: { lat: number; lng: number };
    todayKm: number;
    todayTrips: number;
    todayRevenue: number;
}

export interface CrewMember {
    id: string;
    name: string;
    phone: string;
    role: 'DRIVER' | 'CONDUCTOR';
    licenseNumber?: string;
    licenseExpiry?: number;
    shiftPreference: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'ANY';
    weeklyHours: number;
    maxWeeklyHours: number;
    currentShift?: CrewShift;
    isOnDuty: boolean;
    rating: number;
    totalTrips: number;
}

export interface CrewShift {
    id: string;
    crewId: string;
    vehicleId: string;
    date: string;
    startTime: string;
    endTime: string;
    actualStartTime?: number;
    actualEndTime?: number;
    status: 'SCHEDULED' | 'STARTED' | 'COMPLETED' | 'ABSENT' | 'CANCELLED';
    breakTimeMinutes: number;
}

export interface DigitalRoster {
    date: string;
    shifts: {
        vehicleId: string;
        vehicleNumber: string;
        morningShift?: { driver: CrewMember; conductor?: CrewMember };
        afternoonShift?: { driver: CrewMember; conductor?: CrewMember };
        nightShift?: { driver: CrewMember; conductor?: CrewMember };
    }[];
}

export interface PermitCompliance {
    vehicleId: string;
    vehicleNumber: string;
    issues: {
        type: 'PERMIT_EXPIRY' | 'INSURANCE_EXPIRY' | 'FITNESS_EXPIRY' | 'PUC_EXPIRY' | 'LICENSE_EXPIRY' | 'SERVICE_DUE';
        severity: 'CRITICAL' | 'WARNING' | 'INFO';
        expiryDate: number;
        daysRemaining: number;
        description: string;
    }[];
    isCompliant: boolean;
}

export interface FleetAnalytics {
    totalVehicles: number;
    activeVehicles: number;
    idleVehicles: number;
    maintenanceVehicles: number;
    totalCrew: number;
    onDutyCrew: number;
    todayRevenue: number;
    todayTrips: number;
    todayKm: number;
    averageOccupancy: number;
    fuelEfficiency: number;
    complianceScore: number;
    revenueByVehicle: { vehicleId: string; vehicleNumber: string; revenue: number }[];
}

// --- HELPER FUNCTIONS ---

function getHeaders(): HeadersInit {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

// --- VEHICLE MANAGEMENT ---

/**
 * Get all vehicles in fleet
 */
export async function getFleetVehicles(): Promise<FleetVehicle[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/fleet/vehicles`, {
            headers: getHeaders()
        });
        if (!res.ok) return getMockVehicles();
        return await res.json();
    } catch {
        return getMockVehicles();
    }
}

/**
 * Get vehicle by ID
 */
export async function getVehicleById(vehicleId: string): Promise<FleetVehicle | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/fleet/vehicles/${vehicleId}`, {
            headers: getHeaders()
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

/**
 * Update vehicle status
 */
export async function updateVehicleStatus(
    vehicleId: string,
    status: FleetVehicle['status']
): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/fleet/vehicles/${vehicleId}/status`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ status })
        });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Add new vehicle to fleet
 */
export async function addVehicle(vehicle: Omit<FleetVehicle, 'id' | 'todayKm' | 'todayTrips' | 'todayRevenue'>): Promise<FleetVehicle | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/fleet/vehicles`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(vehicle)
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// --- CREW MANAGEMENT ---

/**
 * Get all crew members
 */
export async function getCrewMembers(): Promise<CrewMember[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/fleet/crew`, {
            headers: getHeaders()
        });
        if (!res.ok) return getMockCrew();
        return await res.json();
    } catch {
        return getMockCrew();
    }
}

/**
 * Get available crew for a shift
 */
export async function getAvailableCrew(
    date: string,
    shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT'
): Promise<CrewMember[]> {
    try {
        const res = await fetch(
            `${API_BASE_URL}/api/fleet/crew/available?date=${date}&shift=${shiftType}`,
            { headers: getHeaders() }
        );
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

/**
 * Mark crew as on duty
 */
export async function startCrewDuty(crewId: string, vehicleId: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/fleet/crew/${crewId}/start-duty`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ vehicleId })
        });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Mark crew as off duty
 */
export async function endCrewDuty(crewId: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/fleet/crew/${crewId}/end-duty`, {
            method: 'POST',
            headers: getHeaders()
        });
        return res.ok;
    } catch {
        return false;
    }
}

// --- DIGITAL ROSTERING ---

/**
 * Get roster for a date
 */
export async function getRoster(date: string): Promise<DigitalRoster | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/fleet/roster/${date}`, {
            headers: getHeaders()
        });
        if (!res.ok) return getMockRoster(date);
        return await res.json();
    } catch {
        return getMockRoster(date);
    }
}

/**
 * Auto-generate roster for a date
 */
export async function generateRoster(date: string): Promise<DigitalRoster | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/fleet/roster/generate`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ date })
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        // Generate locally
        return generateLocalRoster(date);
    }
}

/**
 * Assign crew to shift
 */
export async function assignCrewToShift(
    vehicleId: string,
    date: string,
    shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT',
    driverId: string,
    conductorId?: string
): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/fleet/roster/assign`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ vehicleId, date, shiftType, driverId, conductorId })
        });
        return res.ok;
    } catch {
        return false;
    }
}

// --- PERMIT COMPLIANCE ---

/**
 * Get compliance status for all vehicles
 */
export async function getComplianceStatus(): Promise<PermitCompliance[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/fleet/compliance`, {
            headers: getHeaders()
        });
        if (!res.ok) return calculateLocalCompliance();
        return await res.json();
    } catch {
        return calculateLocalCompliance();
    }
}

/**
 * Get compliance alerts (critical issues only)
 */
export async function getComplianceAlerts(): Promise<PermitCompliance['issues']> {
    const allCompliance = await getComplianceStatus();
    const criticalIssues: PermitCompliance['issues'] = [];

    for (const vehicle of allCompliance) {
        for (const issue of vehicle.issues) {
            if (issue.severity === 'CRITICAL') {
                criticalIssues.push({
                    ...issue,
                    description: `${vehicle.vehicleNumber}: ${issue.description}`
                });
            }
        }
    }

    return criticalIssues.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

// --- ANALYTICS ---

/**
 * Get fleet-wide analytics
 */
export async function getFleetAnalytics(): Promise<FleetAnalytics> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/fleet/analytics`, {
            headers: getHeaders()
        });
        if (!res.ok) return getMockAnalytics();
        return await res.json();
    } catch {
        return getMockAnalytics();
    }
}

/**
 * Get revenue breakdown by vehicle
 */
export async function getRevenueByVehicle(
    startDate: string,
    endDate: string
): Promise<{ vehicleId: string; vehicleNumber: string; revenue: number; trips: number }[]> {
    try {
        const res = await fetch(
            `${API_BASE_URL}/api/fleet/analytics/revenue?start=${startDate}&end=${endDate}`,
            { headers: getHeaders() }
        );
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

// --- LOCAL GENERATORS ---

function generateLocalRoster(date: string): DigitalRoster {
    const vehicles = getMockVehicles();
    const crew = getMockCrew();

    const drivers = crew.filter(c => c.role === 'DRIVER');
    const conductors = crew.filter(c => c.role === 'CONDUCTOR');

    return {
        date,
        shifts: vehicles.slice(0, 3).map((v, idx) => ({
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
}

function calculateLocalCompliance(): PermitCompliance[] {
    const vehicles = getMockVehicles();
    const now = Date.now();

    return vehicles.map(v => {
        const issues: PermitCompliance['issues'] = [];

        // Check permit expiry
        const permitDays = Math.ceil((v.permitExpiry - now) / (24 * 60 * 60 * 1000));
        if (permitDays <= 0) {
            issues.push({
                type: 'PERMIT_EXPIRY',
                severity: 'CRITICAL',
                expiryDate: v.permitExpiry,
                daysRemaining: permitDays,
                description: 'Permit has expired!'
            });
        } else if (permitDays <= 30) {
            issues.push({
                type: 'PERMIT_EXPIRY',
                severity: 'WARNING',
                expiryDate: v.permitExpiry,
                daysRemaining: permitDays,
                description: `Permit expires in ${permitDays} days`
            });
        }

        // Check insurance expiry
        const insuranceDays = Math.ceil((v.insuranceExpiry - now) / (24 * 60 * 60 * 1000));
        if (insuranceDays <= 0) {
            issues.push({
                type: 'INSURANCE_EXPIRY',
                severity: 'CRITICAL',
                expiryDate: v.insuranceExpiry,
                daysRemaining: insuranceDays,
                description: 'Insurance has expired!'
            });
        } else if (insuranceDays <= 15) {
            issues.push({
                type: 'INSURANCE_EXPIRY',
                severity: 'WARNING',
                expiryDate: v.insuranceExpiry,
                daysRemaining: insuranceDays,
                description: `Insurance expires in ${insuranceDays} days`
            });
        }

        // Check fitness expiry
        const fitnessDays = Math.ceil((v.fitnessExpiry - now) / (24 * 60 * 60 * 1000));
        if (fitnessDays <= 0) {
            issues.push({
                type: 'FITNESS_EXPIRY',
                severity: 'CRITICAL',
                expiryDate: v.fitnessExpiry,
                daysRemaining: fitnessDays,
                description: 'Fitness certificate has expired!'
            });
        } else if (fitnessDays <= 30) {
            issues.push({
                type: 'FITNESS_EXPIRY',
                severity: 'WARNING',
                expiryDate: v.fitnessExpiry,
                daysRemaining: fitnessDays,
                description: `Fitness expires in ${fitnessDays} days`
            });
        }

        // Check service due
        const serviceDays = Math.ceil((v.nextServiceDue - now) / (24 * 60 * 60 * 1000));
        if (serviceDays <= 0) {
            issues.push({
                type: 'SERVICE_DUE',
                severity: 'WARNING',
                expiryDate: v.nextServiceDue,
                daysRemaining: serviceDays,
                description: 'Vehicle service overdue!'
            });
        }

        return {
            vehicleId: v.id,
            vehicleNumber: v.registrationNumber,
            issues,
            isCompliant: issues.filter(i => i.severity === 'CRITICAL').length === 0
        };
    });
}

// --- MOCK DATA ---

function getMockVehicles(): FleetVehicle[] {
    const now = Date.now();
    return [
        {
            id: 'v1',
            registrationNumber: 'KA-01-AB-1234',
            type: 'BUS',
            capacity: 40,
            permitType: 'STAGE_CARRIAGE',
            permitNumber: 'SC-2024-001',
            permitExpiry: now + 90 * 24 * 60 * 60 * 1000,
            insuranceExpiry: now + 180 * 24 * 60 * 60 * 1000,
            fitnessExpiry: now + 120 * 24 * 60 * 60 * 1000,
            pucExpiry: now + 60 * 24 * 60 * 60 * 1000,
            lastServiceDate: now - 30 * 24 * 60 * 60 * 1000,
            nextServiceDue: now + 60 * 24 * 60 * 60 * 1000,
            status: 'ACTIVE',
            todayKm: 145,
            todayTrips: 8,
            todayRevenue: 4500
        },
        {
            id: 'v2',
            registrationNumber: 'KA-01-CD-5678',
            type: 'MINI_BUS',
            capacity: 20,
            permitType: 'STAGE_CARRIAGE',
            permitNumber: 'SC-2024-002',
            permitExpiry: now + 15 * 24 * 60 * 60 * 1000, // Expiring soon
            insuranceExpiry: now + 200 * 24 * 60 * 60 * 1000,
            fitnessExpiry: now + 150 * 24 * 60 * 60 * 1000,
            pucExpiry: now + 30 * 24 * 60 * 60 * 1000,
            lastServiceDate: now - 45 * 24 * 60 * 60 * 1000,
            nextServiceDue: now + 45 * 24 * 60 * 60 * 1000,
            status: 'ACTIVE',
            todayKm: 98,
            todayTrips: 6,
            todayRevenue: 2800
        },
        {
            id: 'v3',
            registrationNumber: 'KA-01-EF-9012',
            type: 'BUS',
            capacity: 50,
            permitType: 'STAGE_CARRIAGE',
            permitNumber: 'SC-2024-003',
            permitExpiry: now + 200 * 24 * 60 * 60 * 1000,
            insuranceExpiry: now + 5 * 24 * 60 * 60 * 1000, // Expiring very soon
            fitnessExpiry: now + 180 * 24 * 60 * 60 * 1000,
            pucExpiry: now + 90 * 24 * 60 * 60 * 1000,
            lastServiceDate: now - 60 * 24 * 60 * 60 * 1000,
            nextServiceDue: now - 5 * 24 * 60 * 60 * 1000, // Overdue
            status: 'MAINTENANCE',
            todayKm: 0,
            todayTrips: 0,
            todayRevenue: 0
        }
    ];
}

function getMockCrew(): CrewMember[] {
    return [
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
            totalTrips: 1250
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
            totalTrips: 980
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
            totalTrips: 1100
        },
        {
            id: 'crew4',
            name: 'Mahesh G',
            phone: '9876543213',
            role: 'CONDUCTOR',
            shiftPreference: 'ANY',
            weeklyHours: 24,
            maxWeeklyHours: 48,
            isOnDuty: false,
            rating: 4.3,
            totalTrips: 750
        }
    ];
}

function getMockAnalytics(): FleetAnalytics {
    const vehicles = getMockVehicles();
    return {
        totalVehicles: vehicles.length,
        activeVehicles: vehicles.filter(v => v.status === 'ACTIVE').length,
        idleVehicles: vehicles.filter(v => v.status === 'IDLE').length,
        maintenanceVehicles: vehicles.filter(v => v.status === 'MAINTENANCE').length,
        totalCrew: 8,
        onDutyCrew: 5,
        todayRevenue: vehicles.reduce((sum, v) => sum + v.todayRevenue, 0),
        todayTrips: vehicles.reduce((sum, v) => sum + v.todayTrips, 0),
        todayKm: vehicles.reduce((sum, v) => sum + v.todayKm, 0),
        averageOccupancy: 67,
        fuelEfficiency: 4.2,
        complianceScore: 85,
        revenueByVehicle: vehicles.map(v => ({
            vehicleId: v.id,
            vehicleNumber: v.registrationNumber,
            revenue: v.todayRevenue
        }))
    };
}

// --- UTILITY FUNCTIONS ---

/**
 * Format expiry date for display
 */
export function formatExpiryDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Get days until expiry
 */
export function getDaysUntilExpiry(timestamp: number): number {
    return Math.ceil((timestamp - Date.now()) / (24 * 60 * 60 * 1000));
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: 'CRITICAL' | 'WARNING' | 'INFO'): string {
    switch (severity) {
        case 'CRITICAL': return 'red';
        case 'WARNING': return 'yellow';
        case 'INFO': return 'blue';
        default: return 'gray';
    }
}

/**
 * Calculate fleet utilization percentage
 */
export function calculateUtilization(analytics: FleetAnalytics): number {
    if (analytics.totalVehicles === 0) return 0;
    return Math.round((analytics.activeVehicles / analytics.totalVehicles) * 100);
}
