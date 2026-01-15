
import { API_BASE_URL } from '../config';
import { getAuthToken } from './authService';
import { MenuVote, EatSkipStatus, WasteEntry, PrepSheet } from '../types';

// ==================== MENU VOTING ====================

export const getMenuVotes = async (messId: string): Promise<MenuVote | null> => {
    try {
        const token = await getAuthToken();
        const res = await fetch(`${API_BASE_URL}/api/foodlink/mess/vote/${messId}`, { headers: { Authorization: token || '' } });
        const data = await res.json();
        return data && data.active !== false ? data : null;
    } catch (e) { return null; }
};

export const submitVote = async (
    voteId: string,
    optionId: string
): Promise<{ success: boolean; vote?: MenuVote }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/mess/vote/${voteId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ optionId }),
        });
        const data = await response.json();
        return { success: true, vote: data.vote };
    } catch (error) {
        return { success: false };
    }
};

// ==================== EAT OR SKIP ====================

export const setEatSkipStatus = async (
    messId: string,
    date: string,
    mealType: string,
    eating: boolean
): Promise<{ success: boolean; status?: EatSkipStatus }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/mess/eat-skip`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ messId, date, mealType, eating }),
        });
        const data = await response.json();
        return { success: true, status: data.status };
    } catch (error) {
        return { success: false };
    }
};

export const getPrepSheet = async (
    messId: string,
    date: string
): Promise<{ success: boolean; sheet?: PrepSheet }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/mess/prep-sheet?messId=${messId}&date=${date}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        return { success: true, sheet: data.sheet };
    } catch (error) {
        return { success: false };
    }
};

// ==================== WASTE ANALYTICS ====================

export const logWaste = async (
    entry: Partial<WasteEntry>
): Promise<{ success: boolean; entry?: WasteEntry }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/mess/waste`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(entry),
        });
        const data = await response.json();
        return { success: true, entry: data.entry };
    } catch (error) {
        return { success: false };
    }
};

export const getWasteStats = async (messId: string): Promise<{ success: boolean; chartData?: any }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/mess/stats/waste?messId=${messId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        return { success: true, chartData: data.chartData };
    } catch (error) {
        return { success: false };
    }
}

// ==================== MOCK DATA ====================

export const getMockVote = (): MenuVote => ({
    id: 'vote_1',
    messId: 'mess_1',
    date: '2023-11-15',
    mealType: 'DINNER',
    options: [
        { dishId: 'd1', dishName: 'Aloo Gobi & Dal', votes: 45, voters: [] },
        { dishId: 'd2', dishName: 'Mix Veg & Kadhi', votes: 32, voters: [] },
        { dishId: 'd3', dishName: 'Egg Curry & Rice', votes: 78, voters: [] },
    ],
    votingEndsAt: '2023-11-15T16:00:00Z',
    totalVotes: 155
});

export const getMockPrepSheet = (): PrepSheet => ({
    id: 'prep_1',
    messId: 'mess_1',
    date: '2023-11-15',
    mealType: 'DINNER',
    confirmedHeadcount: 340,
    items: [
        {
            dishName: 'Egg Curry',
            portionSize: 2, // eggs
            totalToPrep: 680,
            rawMaterials: [
                { name: 'Eggs', quantity: 700, unit: 'Pieces' }, // +buffer
                { name: 'Onion', quantity: 20, unit: 'KG' }
            ]
        },
        {
            dishName: 'Steam Rice',
            portionSize: 0.2, // kg
            totalToPrep: 68, // kg
            rawMaterials: [
                { name: 'Basmati Rice', quantity: 70, unit: 'KG' }
            ]
        }
    ]
});
