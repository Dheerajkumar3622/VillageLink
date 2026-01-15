import { API_BASE_URL } from '../config';
import { getAuthToken } from './authService';
import { GuestProfile, InventoryItem, PurchaseOrder, TrainingModule } from '../types';

// ==================== GUEST CRM ====================

export const getGuestProfile = async (phone: string): Promise<{ success: boolean; profile?: GuestProfile }> => {
    try {
        const token = await getAuthToken();
        const res = await fetch(`${API_BASE_URL}/api/foodlink/luxe/guest/${phone}`, { headers: { Authorization: token || '' } });
        const data = await res.json();
        if (data.success) return { success: true, profile: data.profile };
        return { success: false };
    } catch (e) { return { success: false }; }
};

export const createGuestCard = async (reservationId: string): Promise<{ success: boolean; profile?: GuestProfile }> => {
    // Simulate creating from reservation
    return getGuestProfile('9876543210');
};

// ==================== INVENTORY & PROCUREMENT ====================

export const getInventory = async (restaurantId: string): Promise<{ success: boolean; items?: InventoryItem[] }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/luxe/inventory?restaurantId=${restaurantId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        return { success: true, items: data.items };
    } catch (error) {
        return { success: false };
    }
};

export const getLowStockAlerts = async (restaurantId: string): Promise<{ success: boolean; items?: InventoryItem[] }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/luxe/inventory/low-stock?restaurantId=${restaurantId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        return { success: true, items: data.items };
    } catch (error) {
        return { success: false };
    }
};

export const createPurchaseOrder = async (
    po: Partial<PurchaseOrder>
): Promise<{ success: boolean; po?: PurchaseOrder }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/luxe/po`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(po),
        });
        const data = await response.json();
        return { success: true, po: data.po };
    } catch (error) {
        return { success: false };
    }
};

// ==================== STAFF TRAINING ====================

export const getTrainingModules = async (
    category?: string
): Promise<{ success: boolean; modules?: TrainingModule[] }> => {
    try {
        const token = await getAuthToken();
        const url = category
            ? `${API_BASE_URL}/luxe/training?category=${category}`
            : `${API_BASE_URL}/luxe/training`;

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        return { success: true, modules: data.modules };
    } catch (error) {
        return { success: false };
    }
};

// ==================== MOCK DATA ====================

export const getMockGuest = (): GuestProfile => ({
    id: 'guest_1',
    phone: '9876543210',
    name: 'Mr. Arvind Gupta',
    email: 'arvind.g@example.com',
    preferences: {
        dietaryRestrictions: ['GLUTEN_FREE'],
        allergies: ['PEANUTS'],
        favoriteTable: 'Table 4 (Window)',
        spicePreference: 'MILD',
        preferredDrink: 'Sparkling Water',
        notes: 'Likes warm water served immediately'
    },
    visitHistory: [],
    totalSpend: 45000,
    visitCount: 12,
    avgSpend: 3750,
    vipTier: 'GOLD',
    lastVisit: '2023-11-01'
});

export const getMockInventory = (): InventoryItem[] => [
    {
        id: 'inv_1',
        restaurantId: 'rest_1',
        itemName: 'Norwegian Salmon',
        category: 'SEAFOOD',
        unit: 'KG',
        currentStock: 12,
        reorderLevel: 15,
        maxStock: 50,
        costPerUnit: 1800,
        supplier: { name: 'OceanFresh', id: 'sup_1', leadTimeDays: 2 },
        lastRestocked: '2023-11-10',
        isLowStock: true
    },
    {
        id: 'inv_2',
        restaurantId: 'rest_1',
        itemName: 'Truffle Oil',
        category: 'OTHER',
        unit: 'LITRE',
        currentStock: 0.5,
        reorderLevel: 1,
        maxStock: 5,
        costPerUnit: 12000,
        supplier: { name: 'GourmetImports', id: 'sup_2', leadTimeDays: 5 },
        lastRestocked: '2023-10-15',
        isLowStock: true
    }
];
